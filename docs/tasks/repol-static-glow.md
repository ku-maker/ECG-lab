# Task: 再分極（T波）3D演出の逆走廃止 — 色分け維持・均一グロー（Option A 確定）

> 親設計: `docs/tasks/12lead-vector-sync.md`（T7/T9 で実装した3D発光）。
> 種別: 教育的正確性の修正（心エコー技師レビュー由来）。
> 位置づけ: 3D演出のみの修正。波形・双極子・投影ロジックには一切触れない。
> **方針確定: Option A（均一グロー・方向なし）。** 明滅は T波幅（約290ms）に沿った
> ゆっくりした1回の立ち上がり→ピーク→減衰とし、チカチカした反復点滅にはしない。

## Context（なぜこの修正をするか）

現状、再分極（T波）フェーズでは心室系の伝導路チューブ（右脚・左脚前枝・左脚後枝・
中隔プルキンエ）の上を、シアン色の光が `direction="reverse"` で逆向きに流れる演出になっている
（`HeartVectorScene` の `ventDirection = isRepol ? "reverse" : "forward"`、およびフラグメント
シェーダの `uReverse`）。His-Purkinje 系を電気が逆流するわけではないため、伝導路チューブ上で光を
逆走させると「再分極が伝導系を逆向きに伝わる」という誤解を学習者に与えかねない。実際の再分極は
心室筋で起こる現象で、特殊伝導系を「伝わる」ものではない。

一方で、脱分極（ピンク/紫）と再分極（シアン）の色による区別は分かりやすいので残す。本タスクは
**色分けは維持したまま、チューブ上の方向性のある光の流れ（逆走・前進掃引の両方）を止め、
均一な発光に置き換える**。

## Objective
再分極フェーズの心室系伝導路チューブを、**方向性を持たない均一なシアン発光**にする
（`reverse` 挙動および位置掃引を廃止）。明るさは `segments.ventRepol` の Gaussian 包絡に沿って
**1心拍につき1回、ゆっくり立ち上がり→ピーク→減衰**する（T波幅 ≈ 290ms = `ventRepol` 窓
`[tPeak−2σ, tPeak+2σ] = [496, 784]ms`）。**反復点滅（オシレータ）は一切追加しない**（警告灯・
アラートを連想させないため）。脱分極（ピンク/紫・前進）と再分極（シアン）の色区別は維持する。
波形側（`dipoleDir = DIR_60` concordant）は正しいため変更しない。

## Scope
- 新規作成：`src/data/ecg/activation/ventricularGlow.ts`（**純関数・自動検証のため抽出**）
  - `resolveVentricularGlow(segments): VentricularGlow` を実装。現状 `HeartVectorScene` 内に
    インラインされている `isRepol`/色/方向の判断をここへ移す。
  - 戻り型（**"reverse" を型に含めない＝逆走を型レベルで排除**）：
    ```ts
    export type VentricularGlow = {
      phase: "depol" | "repol" | "idle";
      mode: "pulse" | "uniform";   // reverse は存在しない
      intensity: number;           // uniform 明るさ（repol の T波包絡）/ pulse ゲート値
      active: boolean;
      ventColorKey: "ventricular" | "septal" | "recovery";
      septalColorKey: "ventricular" | "septal" | "recovery";
    };
    ```
  - ロジック（現状の閾値を踏襲）：
    - `repol > 0.02 && repol >= qrs` → `{ phase:"repol", mode:"uniform", intensity: repol,
      active:true, ventColorKey:"recovery", septalColorKey:"recovery" }`
    - `qrs > 0.02`（かつ非repol）→ `{ phase:"depol", mode:"pulse", intensity: qrs, active:true,
      ventColorKey:"ventricular", septalColorKey:"septal" }`
    - それ以外 → `{ phase:"idle", mode:"pulse", intensity:0, active:false, ... }`
    - `intensity` は `segments.ventRepol` の包絡値そのもの（Gaussian 1山）。**Math.sin 等の
      時間オシレータを掛けない**（＝反復点滅にしない）。
  - 外部ランタイム import ゼロ（型のみ）。
- 改修：`components/VectorVisualizer.tsx`
  - フラグメントシェーダ `conductionFragmentShader`：**均一発光モードを追加**。`uReverse` を削除し、
    `uUniform`（1=均一）と `uGlow`（均一時の明るさ 0..1）を追加：
    ```
    float pulseIntensity = (pulse + tail*0.55) * uActive;   // 従来の depol パルス
    float intensity = mix(pulseIntensity, uGlow, uUniform);  // uUniform=1 で均一 uGlow
    ```
    （`forwardTailDiff`/`reverseTailDiff`/`tailMask` 系のうち reverse 関連を整理。depol の前進
    テールは維持。）
  - `ConductionPathway`：`direction` prop を廃止し、`glowMode?: "pulse" | "uniform"` と
    `glow?: number`（均一明るさ）を追加。`useFrame` で `uUniform`/`uGlow` を設定、`uReverse` 参照を削除。
  - `HeartVectorScene`：`resolveVentricularGlow(segments)` を使い、心室系4本
    （rightBundle/leftAnterior/leftPosterior/septalPurkinje）へ `glowMode`/`glow`/`color`/`active` を
    供給。repol 時は `glowMode="uniform"`, `glow=intensity`, `pulseProgress` 不使用、色は `recovery`。
    depol 時は従来どおり `glowMode="pulse"`, `pulseProgress=segmentLocalProgress("septalPurkinje")`,
    色は `ventricular`/`septal`。
  - 不要になった `PulseDirection` 型を削除（他で未使用なら）。
- 新規作成：`scripts/verify-repol-glow.mjs`。`package.json` に `"verify:repolglow"` を追加し、
  `verify:all` の連鎖にも追記する。

## Out of scope
- **波形側は一切変更しない**：`dipoleDir = DIR_60`（concordant）、`evaluateDipole`、`projectLead`、
  12誘導投影、T波の極性・形状はすべて現状維持。
- 脱分極（QRS）の前進パルスアニメーションは維持（変更対象は再分極のみ）。
- 賦活タイムライン（`buildTimeline.ts` の `repol` イベント）、`segmentPoints.ts`、
  `evaluateSegments` の強度計算は変更しない。
- `TerminalGlow` の挙動は変更しない（終端のシアン発光は既に方向を持たない静的表現＝現状維持）。
- 心房再分極・他フェーズの演出、色パレットの再設計。

## Success criteria
### 自動（客観・必須）
- [ ] `scripts/verify-repol-glow.mjs`（`npm run verify:repolglow`）が exit 0：
  1. **逆走排除**：`ventRepol` 窓全体（例 500〜780ms を細かくサンプル）で
     `resolveVentricularGlow(evaluateSegments(tl, φ)).mode === "uniform"`。`mode` の取りうる値が
     `"pulse"|"uniform"` のみで、いかなる位相でも `"reverse"` にならない。
  2. **色分け維持**：`tPeak` で `ventColorKey === "recovery"` かつ `septalColorKey === "recovery"`
     （シアン）。`r`（QRS）で `ventColorKey === "ventricular"`, `septalColorKey === "septal"`,
     `mode === "pulse"`（脱分極は不変）。
  3. **穏やかな単一山（反復点滅でない）**：repol 窓を N 点サンプルした `intensity` 系列が
     **単峰（unimodal）**——ピークまで単調増加、ピーク後は単調減少（微小な数値ノイズ許容）で、
     ピークが `tPeak` 近傍。複数ピーク/振動があれば fail（オシレータ混入の番人）。
- [ ] `npm run verify:all` が exit 0（既存 verify 群に回帰なし）。新設 `verify:repolglow` が
  `verify:all` に含まれている。
- [ ] `npm run lint`・型チェック・`npm run build` が通る。
- [ ] `grep` で、心室系（再分極）経路に `direction="reverse"` / `uReverse` が残っていない。

### 目視QA（補助・ユーザ確認）
- [ ] `vector` モードで再生し、T波フェーズで心室系チューブが**シアンで光るが、チューブ上を光が
  流れて（特に逆走して）いない**。均一に、ゆっくり1回、明るくなって暗くなる。
- [ ] チカチカした速い反復点滅になっていない（警告灯的でない）。
- [ ] 脱分極（QRS）は従来どおりピンク/紫で前進する流れが残っている。
- [ ] 波形（下段グラフ）は一切変化していない（T波の見た目が同じ）。
- [ ] Learning/Quiz/Compare 回帰なし。

## Constraints
- **AGENTS.md 準拠**：`VectorVisualizer.tsx` は client component / R3F。シェーダ変更前に必要に応じ
  `node_modules/next/dist/docs/` を確認。
- 依存追加なし。純関数検証は Node 型ストリップ。
- シェーダのチューブ形状・depol パルス表現は変えない。追加は均一発光モードのみ。
- 波形・双極子・投影には触れない（Out of scope 厳守）。
- **明るさは `ventRepol` 包絡そのもの**。時間オシレータ（`Math.sin` 等）で明滅を作らない。

## Edge cases
- QRS→T の遷移（`phase` が depol→repol になる瞬間）で発光が瞬断・フラッシュしないこと。
- `ventRepol` と `septalPurkinje` の窓がわずかに重なる位相で、`phase`/色がちらつかないこと
  （閾値・比較 `repol > 0.02 && repol >= qrs` を踏襲）。
- シェーダから `uReverse` を削除しても depol の pulse モードが従来どおり動くこと
  （全 `ConductionPathway` 呼び出しの prop 整合）。
- `uUniform=1` の均一モードで、`uGlow=0`（窓の端）でも NaN/過発光にならないこと。

## Notes for the orchestrator's review pass
- **最重要**：再分極時に方向性のある流れ（reverse も前進掃引も）が消え、均一発光になっているか。
  自動検証項目1・3が番人。目視でも「流れていない・チカチカしていない」を確認。
- 色分け（depol ピンク/紫 ↔ repol シアン）が維持されているか（ユーザが残したい要素）。
- 明滅が `ventRepol` 包絡由来の単一山か（オシレータを足していないか）。項目3が番人。
- 波形が無変更か（`git diff` が波形/双極子/投影ファイルに及んでいないこと）。dipoleDir 等に誤って
  触れていないか。
- `uReverse`/`direction` 削除後、depol 側パルスと saAtrial/avDelay パスが壊れていないか。
- 演出決定が純関数 `resolveVentricularGlow` に抽出され、戻り型に "reverse" が存在しない構造か
  （将来の再混入防止）。
