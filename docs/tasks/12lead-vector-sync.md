# Task: 12誘導ビュー切り替えに連動する3D伝導アニメーション＋波形の同期エンジン

## Context（なぜこの変更をするか）

現状、心電図には分断された2系統が存在する。

- **本物の波形エンジン** `components/EcgCanvas.tsx`：データモデルは「Lead II の1拍分の振幅サンプル列」（1Dスカラー）のみ。3Dベクトルも Lead II 以外の誘導データも持たない。
- **3Dプロトタイプ** `components/VectorVisualizer.tsx`：Three.js で伝導路をチューブ描画しパルスを流す。だが誘導ボタンは**カメラを動かすだけ**で、心臓ベクトルを誘導軸に射影しておらず、下の波形も常に NSR Lead II のまま。UI 自身が「※ 現段階では12誘導波形ではなく、誘導方向を模した視点切り替えです」と明記している。

破綻の中心は**心臓の電気的活動をベクトル `M(t)` として持っていないこと**、および **3D（手動スクラブ）と波形（自走クロック）を結ぶ共通の心周期クロックが無いこと**。Codex はこの土台不在のまま「カメラ演出」で誤魔化そうとして行き詰まった。

本タスクは、**データモデル・投影・同期の3コアを新設**し、単一の「賦活タイムライン」から双極子（→12誘導波形）と3Dセグメント発光を同時駆動する。これにより「誘導選択 → 3D視点連動 → 波形連動」の基本ループを12誘導すべてで成立させる。**Three.js の描画・シェーダ・伝導路チューブは良い資産として流用する。**

MVP のゴールは精度の高い12誘導再現ではなく、**基本ループが12誘導すべてで動くこと**。まずは NSR 単一リズムで成立させる。

---

## 1. 賦活タイムライン（Activation Timeline）

心周期を「賦活イベントの列」として1本のタイムラインで表現する。これが全ての source of truth。

### データ構造

```ts
// src/data/ecg/activation/types.ts
export type ConductionSegmentId =
  | "saAtrial"       // SA結節 → 心房脱分極（P波）
  | "avDelay"        // AV結節遅延（PR区間、電気的に静か）
  | "hisBundle"      // His束
  | "rightBundle"    // 右脚
  | "leftAnterior"   // 左脚前枝
  | "leftPosterior"  // 左脚後枝
  | "septalPurkinje" // 中隔〜Purkinje（心室脱分極、QRS）
  | "ventRepol";     // 心室再分極（T波、逆方向）

export type ActivationEvent = {
  segment: ConductionSegmentId;
  startMs: number;          // 心周期起点(0)からの相対時刻
  endMs: number;
  // この賦活が生む双極子の寄与。フレームは §2 で定義する解剖フレーム。
  dipoleDir: [number, number, number]; // 単位ベクトル（向き）
  dipolePeakMag: number;                // ピーク振幅（mV相当の相対値）
  contributesToWave: boolean;           // avDelay は false（静電期）
};

export type ActivationTimeline = {
  templateId: string;   // 対応する BeatTemplate.id（"nsr-lead2-v0" 等）
  cycleMs: number;      // 1心周期の長さ（BeatTemplate.durationMs と一致させる）
  events: ActivationEvent[];
};
```

### 制約と根拠

- **MVP では NSR のみ** `activation/nsr.ts` を作成する。`cycleMs` と各 `startMs/endMs` は既存 `nsr-lead2.json` の `fiducialsMs`（pOn=120, pOff=240, qrsOn=360, qrsOff=460, tPeak=640, tEnd=820, durationMs=1000）から導出し、二重管理を避けるため **fiducials を import して算出**する（ハードコード数値の再掲禁止）。
- `dipoleDir` は心電図軸の定石に沿った代表値を与える（例：心房脱分極 ≈ +60°方向、心室脱分極 ≈ 心電図平均電気軸 +30〜60°方向、再分極は QRS と同極性になるよう向きを設定）。数値は §2 のフレーム定義に整合させること。
- **QRS は単一イベントでは不足**（§5 の検証で確認）。中隔Q→主R→終末S に相当する3ローブ（`septalQ`/`mainR`/`terminalS`）に分け、Q と S は主R に対して逆向き寄与（双極子ベクトルが QRS 中に回転することの表現）とする。これが無いと Lead II 投影が r<0.90 で T5 ゲートを通らない。
- 既存 `VectorVisualizer` の `getConductionTimeline` が持っていた区間判定ロジックはこのタイムラインへ**移設**し、`progress→区間` のハードコード分岐を廃止する。

### 位相の評価関数

```ts
// 与えられた心周期内時刻 tMs における、各セグメントの発光強度(0..1)を返す
export function evaluateSegments(timeline: ActivationTimeline, tMs: number):
  Record<ConductionSegmentId, number>;

// 与えられた tMs における合成双極子ベクトルを返す（§2）
export function evaluateDipole(timeline: ActivationTimeline, tMs: number):
  { x: number; y: number; z: number };
```

- 各イベントは `startMs..endMs` の窓内で `easeInOutCubic` 等の包絡（envelope）を持つ。既存の `easeInOutCubic / easeOutCubic`（VectorVisualizer 内）を共有ユーティリティ `lib/ecg/easing.ts` に切り出して再利用する。
- `evaluateDipole` は「その瞬間 active な全イベントの `dipoleDir * dipolePeakMag * envelope(t)` を総和」した3Dベクトル。`contributesToWave === false` のイベントは寄与しない。

---

## 2. 双極子モデルと解剖フレーム（Dipole Model & Frame）

### 座標フレーム（統一の要）

現状バラバラな3座標系（伝導路座標・カメラ位置・誘導軸）を**1つの解剖フレーム**に統一する。

- **フレーム定義**：前額面（frontal plane）を Three.js の X-Y 平面に取る。
  - `+X` = 患者の左方向（LEFT）
  - `+Y` = 患者の上方向（SUPERIOR）／`-Y` = 下方向（INFERIOR）
  - `+Z` = 患者の前方向（ANTERIOR、画面手前）／`-Z` = 後方（POSTERIOR）
- **角度規約**：前額面の誘導角 θ は Einthoven の六軸系に従う。Lead I = 0°（+X方向）、+90° = 下方向（`-Y`）とする。ベクトル `axisFromAngle(θ) = (cosθ, -sinθ, 0)`。

### 誘導単位ベクトル（12誘導すべてを統一射影で）

MVP は**Einthoven三角形ベースの幾何を12誘導すべてに一貫適用**する簡略化を採用する。

```ts
// src/data/ecg/leads/leadAxes.ts
export const LEAD_ANGLES_DEG: Record<LeadId, number> = {
  I: 0, II: 60, III: 120, aVR: -150, aVL: -30, aVF: 90, // 肢誘導：正しい六軸
  // 胸部誘導：MVPでは前額面の簡略角として扱う（下記 Out of scope 参照）
  V1: 100, V2: 90, V3: 75, V4: 60, V5: 30, V6: 0,
};
export function leadAxis(id: LeadId): THREE.Vector3; // axisFromAngle を正規化して返す
```

- 肢誘導6本は標準六軸そのもの。
- 胸部誘導6本は**前額面上の近似角**として同じ射影式に載せる（V1→右寄り・上向き、V6→左向き、へと連続的に回す）。これは解剖学的に厳密ではないが、MVP の「視点切り替え→波形が変わる」ループを12本すべてで成立させるための意図的簡略化。

### 投影（1行の核心式）

```ts
// 誘導 lead の時刻 tMs における振幅
leadValue = evaluateDipole(timeline, tMs) · leadAxis(lead)   // 内積
```

- これが「12誘導波形を生成する土台」。Lead II を射影した結果が既存 `nsr-lead2.json` の概形と**極性・主要ピークの符号が一致**すること（振幅の完全一致は不要）を検証の目安にする。
- カメラ位置は `leadAxis(lead)` から導出する（`cameraPos = target - leadAxis * distance` 等）。**カメラと投影軸が同一ソースから決まる**ので、現状の目分量 `LEAD_CAMERA_POSITIONS` を廃止できる。

### 伝導路3D座標の扱い

- 既存 `CONDUCTION_POINTS`（アート座標）はこのフレーム向きに整合するよう**符号・軸割当のみ見直す**（形状は流用）。各 `ConductionSegmentId` に対応する points 配列を紐づけるマップ `SEGMENT_POINTS: Record<ConductionSegmentId, VectorPoint[]>` を作る。

---

## 3. 状態同期（State Sync）

### 単一の心周期クロック

「今この瞬間、心周期のどの位相か」を単一の source of truth にする。

```ts
// lib/ecg/useCardiacClock.ts
export type CardiacClock = {
  mode: "playing" | "scrubbing";
  elapsedMs: number;     // 通し時間（自走時に増加）
  cycleMs: number;
  phaseMs: number;       // = elapsedMs % cycleMs（心周期内位相）
  bpm: number;
};
```

- **playing**：RAF で `elapsedMs += min(delta, MAX_FRAME_DELTA_MS)`（既存 EcgCanvas の `MAX_FRAME_DELTA_MS=50` の考え方を流用）。BPM に応じて `cycleMs = 60000/bpm` を再スケール。
- **scrubbing**：スライダーが `phaseMs` を直接指定（既存 VectorVisualizer の 0–100% スクラブは `phaseMs = ratio*cycleMs` に変換）。
- 波形レンダラ（多誘導）と3Dアニメーションは**両方この `phaseMs` を読む**。3D の `evaluateSegments(phaseMs)` と波形の `leadValue(lead, phaseMs)` が同じ位相で評価されるため、構造的に同期する。

### コンポーネント配線

- `VectorVisualizer` を親としてクロックを保持し、子（3Dシーン・波形グラフ・誘導ボタン・スライダー）へ `phaseMs` と `selectedLead` を props で配る。**現状の分離した `progress` useState を廃止**。
- 3D側 `ConductionPathway` の `pulseProgress/active` は `evaluateSegments` の結果から与える（既存シェーダ・チューブはそのまま）。
- 波形グラフは現状の SVG reveal を、**選択中の誘導の投影波形**を描くよう差し替える。1心周期分を `leadValue(selectedLead, φ)` でサンプルして path 化（既存 `buildNsrPath` の構造を流用し、サンプル元だけ投影式に置換）。
- **EcgCanvas 本体は本タスクでは変更しない**（vector モード専用の新経路として実装）。既存の Learning/Quiz/Compare モードへ影響を与えないこと。

---

## 4. Codex向け 分解タスクリスト

各ステップは独立にレビュー可能な粒度。上から順に実施。

1. **T1 共有ユーティリティ抽出** — `easeInOutCubic/easeOutCubic/clamp` を `lib/ecg/easing.ts` へ切り出し、`VectorVisualizer` と将来モジュールで共有（既存挙動を変えない純リファクタ）。
2. **T2 フレーム＆誘導軸** — `src/data/ecg/leads/leadAxes.ts` に `LEAD_ANGLES_DEG`, `axisFromAngle`, `leadAxis` を実装。単体テスト：Lead I=+X、aVF=下向き、II=I+III の関係（Einthoven）を数値で確認。
3. **T3 賦活タイムライン型＋NSR定義** — `activation/types.ts` と `activation/nsr.ts`。`nsr-lead2.json` の fiducials を import して `events` を構築（数値ハードコード禁止）。
4. **T4 評価関数** — `evaluateSegments` / `evaluateDipole` を実装＋単体テスト（P波窓で心房セグメントのみ発光、QRS窓で心室双極子が最大、avDelay は波形寄与ゼロ）。
5. **T5 投影検証（ゲート）** — 詳細は §5。**このテストが green にならない限り T6 以降へ進んではならない。**
6. **T6 心周期クロック** — `lib/ecg/useCardiacClock.ts`（playing/scrubbing、BPM再スケール、フレームデルタ上限）。
7. **T7 3D配線置換** — `SEGMENT_POINTS` 作成、`CONDUCTION_POINTS` をフレーム整合に符号調整、`evaluateSegments(phaseMs)` で発光駆動。`LEAD_CAMERA_POSITIONS` を `leadAxis` 由来のカメラ導出へ置換。
8. **T8 波形グラフ置換** — SVG グラフを「選択誘導の投影波形」に差し替え。誘導ボタンで波形が実際に変わることを確認。
9. **T9 統合＆UI文言更新** — `progress` useState 廃止 → クロック一元化。「※ 視点切り替えのみ」の注意書きを実態に合わせて更新（12誘導は簡略投影である旨は残す）。
10. **T10 手動QA** — §Success criteria を1項目ずつ確認。

---

## 5. T5 投影検証（唯一の正解データによるゲート）

Lead II は**唯一「正解データ」(`nsr-lead2.json`) が存在する誘導**であり、双極子モデル・誘導軸・座標系を含む数式全体の正しさを検証できる唯一の手がかり。ここを自動テストのゲートにし、**通らない限り T6 以降に進まない**。

### 前提：絶対振幅では一致しない

投影波形は合成双極子から生成されるため、手作りの `nsr-lead2.json` とは**振幅スケールが異なる**。したがって「絶対 mV の一致」ではなく、**正規化後の形状一致 ＋ ランドマークの位置・極性一致**で判定する。

### 正規化方式：Z-score 正規化（平均0・標準偏差1）

両系列（`ref`, `proj`）をそれぞれ **Z-score 正規化**する：`z[i] = (x[i] − mean(x)) / std(x)`（std は母標準偏差、std=0 のときはテスト失敗＝退化した信号）。

- 採用理由：心電図は R 波が支配的なため、Min-max 正規化やピーク振幅基準（R=1）だと P 波・T 波が相対的に潰れ、RMSE がほぼ R 波の一致度に支配され誤差を過小評価する。Z-score は波形全体の分散に対して残差を評価するので P/QRS/T すべてが応分に寄与し、形状比較に最も適する。
- **数学的整合の注意**：両系列を Z-score 正規化（単位分散）した場合、Pearson 相関 r と RMSE は `RMSE = √(2(1−r))` で連動する。よって RMSE は独立な指標ではなく r の従属ガードである。下表の閾値はこの関係に矛盾しないよう設定してある（r≥0.90 ⇔ RMSE≈0.447）。**実装者は両方を独立に厳しくしようとしないこと**（矛盾する）。主判定は r、RMSE は「r の計算が壊れていないか」の交差確認用。

### 実装

- 自動テストとして実装する（ファイル例：`src/data/ecg/__tests__/lead2-projection.test.ts`）。プロジェクトにテストランナーが無ければ、まず最小構成（`vitest` 等、devDependency のみ）を T5 の一部として導入する。**目視確認だけで済ませない。**
- 手順：
  1. `nsr-lead2.json.durationMs`（=cycleMs）を N=200 点に等分し、各 φ で
     - `ref[i] = getTemplateValueAtMs(nsrTemplate, φ)`（既存補間関数を再利用）
     - `proj[i] = evaluateDipole(nsrTimeline, φ) · leadAxis("II")`
  2. 両系列を**各々 Z-score 正規化**（平均0・標準偏差1、上記方式）して振幅スケールを揃える。
  3. 下記メトリクスを算出し、閾値を1つでも外したらテスト失敗（`expect` で assert）。

### 必須アサーション（閾値）

| # | 検証項目 | 閾値（これを外したら fail） |
|---|---|---|
| 1 | 形状相関（Pearson 相関係数 r、主判定） | **r ≥ 0.90** |
| 2 | Z-score 正規化後 RMSE（r の従属ガード） | **≤ 0.45**（r≥0.90 と連動する上限。矛盾させないこと） |
| 3 | R 波ピーク時刻の差 | **≤ 40 ms** |
| 4 | P 波ピーク時刻の差 | **≤ 60 ms** |
| 5 | T 波ピーク時刻の差 | **≤ 60 ms** |
| 6 | 主要ピークの極性一致 | P 上向き・R 上向き・T 上向き（3つとも符号一致、**必須**） |
| 7 | QRS 区間（qrsOn–qrsOff）の振幅が最大 | 心房・T 区間より大きいこと |

- 閾値の根拠：MVP の目的は「形が誘導軸に整合して動く」ことの担保であり、臨床精度ではない。相関 r≥0.90 は「主要な波の順序・向き・相対的大きさが崩れていない」ことを担保する実務的な水準（Z-score RMSE≤0.45 はこれと連動するガード）。ピーク時刻許容は fiducials 由来の窓幅（P窓120ms・QRS窓100ms）と N=200 点（=5ms 分解能）を踏まえた値。**着手時にこの閾値が厳しすぎ／緩すぎと判明したら、値を変える前に必ず司令塔レビューへ相談する**（数式のバグを閾値緩和で隠さないため）。

### 検証済み実測値（参照ハーネス `scripts/verify-lead2-projection.mjs`）

設計凍結時に実行可能な参照ハーネスで methodology を検証済み（依存追加なし・`node` 直実行、`INJECT_SIGN_BUG=1` で変異注入）。

- **変異注入テスト**：座標フレームのY符号を誘導軸側だけ反転させると Lead II 投影が完全反転し `r=−0.968`・極性全反転で全項目 FAIL。テストが frame handedness バグを確実に捕捉することを確認済み。
- **正しい実装の実測**：`r=0.9678`（閾値0.90に対し +0.068 マージン）、Z-score `RMSE=0.2539`（≤0.45）、ΔR=0 / ΔP=0 / ΔT=10.1ms。閾値はギリギリではなく妥当。
- **重要な発見**：P/QRS/T を各1個の Gaussian で表す最小構成だと `r=0.8885` で **僅かに 0.90 未満**（nsr の Q/S 陰性偏位を再現できないため）。→ **QRS は単一方向イベントでは不足。中隔Q→主R→終末S の biphasic（QRS 中に双極子ベクトルが回転する）表現が必須**（§1・§2 に反映済み）。閾値0.90 が「単一Gaussianを弾く」意味のあるゲートとして機能していることも同時に確認。

### 失敗時の切り分けチェックリスト

閾値を外したとき、**どの段階を疑うか**を順に確認する（上ほど根本原因の可能性が高い）：

- [ ] **極性が全体反転（r が負に近い）** → 座標フレームの符号定義（θ規約 `+90°=下向き` と `axisFromAngle` の `-sinθ`）か、`leadAxis("II")` の向き。フレーム全体の鏡映を疑う。
- [ ] **R は合うが P/T がずれる／消える** → 賦活タイムラインの該当イベント窓（`startMs/endMs`）が fiducials とずれている、または包絡（envelope）の立ち上がりタイミング。
- [ ] **T 波だけ反転** → 再分極イベントの `dipoleDir` 符号（QRS と同極性になっているか）。§Edge cases 参照。
- [ ] **相関は高いがピーク時刻が一律オフセット** → φ のサンプリング基準（0 起点）と `evaluateDipole` の時刻解釈のズレ、または cycleMs 不一致。
- [ ] **QRS 振幅が P/T に埋もれる（項目7 fail）** → 心室脱分極イベントの `dipolePeakMag` が心房・再分極に対して小さすぎる。相対スケールの再調整。
- [ ] **r は高いのに RMSE だけ超過**（Z-score 下では原理的に起きない）→ 正規化の実装ミス（片方だけ正規化、標本標準偏差と母標準偏差の取り違え、std=0 未処理等）。数式より先にテストコードを点検。
- [ ] 上記すべて否定されたら **誘導軸角 `LEAD_ANGLES_DEG["II"]=60°` と双極子の平均向き** の整合を再検討（双極子の代表方向が平均電気軸から外れていないか）。

---

## Objective
12誘導の視点（誘導）選択に連動して、3D心臓モデル上の伝導アニメーションと2D波形が**同一の心周期クロックで同期して**変化する基本ループを、NSR 単一リズムで12誘導すべてに成立させる。心臓の電気活動を双極子ベクトル `M(t)` としてモデル化し、統一した誘導軸への内積射影で各誘導波形を生成する。

## Scope
- 新規：`src/data/ecg/activation/{types.ts,nsr.ts}`、`src/data/ecg/leads/leadAxes.ts`、`lib/ecg/{easing.ts,useCardiacClock.ts}`、および評価関数モジュール。
- 改修：`components/VectorVisualizer.tsx`（クロック一元化・投影波形・カメラ/発光をベクトル由来へ）。
- 描画資産の流用：Three.js シーン、`shaderMaterial`（`conductionVertex/FragmentShader`）、`ConductionPathway`/`NodeMarker`/`TerminalGlow`、伝導路チューブ形状。

## Out of scope
- **胸部誘導 V1–V6 の波形形状の精度向上は本タスクでは行わない。** Wilson 結合端子（Wilson's central terminal）近似、胸部電極の実際の3D位置、心臓の解剖学的により正確な双極子/多極子モデルへの置換は、**v2 以降の別タスク**として切り出す（別タスク名：`12lead-precordial-accuracy`（仮））。MVP は前額面の簡略角による統一射影で V1–V6 を扱い、「視点→3D→波形」ループの成立を優先する。
- NSR 以外のリズム（AF/PVC/VT/VF 等）の賦活タイムライン化。MVP は NSR のみ。別タスク `12lead-arrhythmia-timelines`（仮）へ。
- `EcgCanvas.tsx` 本体の改修、および Learning/Quiz/Compare モードへの12誘導展開。
- 音声・アラーム・除細動アーティファクト連携。

## Success criteria
- [ ] 12誘導いずれのボタンを押しても、(a) 3Dカメラ視点、(b) 3D伝導セグメントの発光、(c) 2D波形の3つが切り替わる。
- [ ] 波形は「選択誘導への双極子射影」で生成され、誘導ごとに形が異なる（例：aVR で主要 QRS が陰性化する等、極性が誘導軸に整合）。
- [ ] **T5 ゲート**：§5 の Lead II 投影検証テスト（Z-score正規化後 相関 r≥0.90 / RMSE≤0.45 / ピーク時刻許容 / 極性一致 の全アサーション）が自動テストで green。これが green になるまで T6 以降に着手していないこと。
- [ ] スライダー（scrubbing）と再生（playing）のどちらでも、3D発光と波形カーソルが同一 `phaseMs` で一致して動く。
- [ ] `LEAD_CAMERA_POSITIONS` の目分量ハードコードと分離 `progress` state が撤去され、カメラ・投影・発光が単一の賦活タイムライン＋誘導軸から導出されている。
- [ ] Learning/Quiz/Compare の既存モードが従来どおり動作する（回帰なし）。
- [ ] `npm run lint` と型チェックが通る。

## Constraints
- **AGENTS.md 準拠**：この Next.js は破壊的変更版。実装前に `node_modules/next/dist/docs/` の該当ガイドを読むこと。deprecation 通知に従う。
- 依存追加は不可。既存 `three` / `@react-three/fiber` / `@react-three/drei` のみで実装。
- fiducials・cycleMs 等の数値は `nsr-lead2.json` を単一ソースとし、再ハードコードしない。
- 60fps を目標。`evaluateDipole/Segments` は RAF 内で毎フレーム呼ばれるためアロケーションを避ける（Vector3 の使い回し）。既存 `MAX_FRAME_DELTA_MS` 相当のフレームデルタ上限を守る。
- 医学的免責の注意書き（概念図であり厳密な再現ではない旨）を UI に残す。

## Edge cases
- BPM 変更時の `cycleMs` 再スケールで `phaseMs` が不連続に飛ばないこと。
- スライダー端（0% / 100%）でセグメント評価が破綻しないこと（`phaseMs === cycleMs` の折返し）。
- 誘導軸ベクトルが双極子とほぼ直交する瞬間、波形が 0 付近でノイズにならないこと。
- 再分極（T波）の向き：QRS と同極性になる `dipoleDir` 設定になっているか（逆だと T が反転表示される）。
- タブ非アクティブ→復帰時に `elapsedMs` が大きく飛ばないこと（デルタ上限で吸収）。

## Notes for the orchestrator's review pass
- **最重要**：カメラ位置・投影軸・伝導路発光の3つが**本当に同一ソース（賦活タイムライン＋leadAxis）から導出**されているか。どれか1つでも旧ハードコードが残っていれば設計の破綻が再発する。
- Lead II 射影の極性テストが「たまたま合っている」のか「フレーム定義から必然的に合う」のかをレビューで確認する。フレーム角規約（θ=0 が +X、+90 が下向き）と `dipoleDir` の符号が首尾一貫しているか。
- `evaluateDipole` のフレーム毎アロケーション有無（パフォーマンス）。
- 胸部誘導の簡略角が Out of scope として明示され、コード上も「近似」であることがコメント等で分かるようになっているか（将来 v2 が誤って本物と誤認しないため）。
- `progress` useState 撤去後、scrubbing↔playing の遷移で状態が二重管理になっていないか。
