# Task: T8 波形描画の投影化（選択誘導の12誘導波形を実描画）

> 親設計: `docs/tasks/12lead-vector-sync.md` の §2/§3。
> 前提: T2（`leadAxes.ts`）・T3（`nsr.ts`）・T4（`evaluate.ts`）・T7（3D配線・暫定 phaseMs ブリッジ）完了済み。
> 後続: T9（クロック統合）・T10（QA）。

## Objective
現在 NSR Lead II 固定の2D波形グラフを、**「選択中の誘導への双極子投影波形」を描く**よう置き換える。これで誘導ボタンを押すと 3D 視点・発光だけでなく **波形そのものが誘導ごとに変わる**（基本ループの完成）。核心は1行：`leadValue(id, φ) = evaluateDipole(nsrTimeline, φ) · leadAxis(id)`。

## Scope
- 新規作成：`src/data/ecg/leads/projectLead.ts`（**純関数**）
  ```ts
  import { leadAxis, type LeadId } from "./leadAxes";
  import { evaluateDipole } from "../activation/evaluate";
  import type { ActivationTimeline } from "../activation/types";

  // 誘導 id の心周期内時刻 tMs における投影振幅（mV 相当の相対値）。
  export function projectLeadValue(
    timeline: ActivationTimeline,
    id: LeadId,
    tMs: number,
    dipoleOut?: { x: number; y: number; z: number } // アロケーション回避の使い回し
  ): number;

  // 1心周期を N 点サンプルした投影波形（波形パス生成用）。
  export function sampleLeadCycle(
    timeline: ActivationTimeline,
    id: LeadId,
    sampleCount: number
  ): { tMs: number; mv: number }[];
  ```
- 改修：`components/VectorVisualizer.tsx`（`EcgRevealGraph` 周辺）
  - 現状 `buildNsrPath()`（`nsrTemplate` を直接読む）を、`sampleLeadCycle(nsrTimeline, selectedLead, N)` 由来のパス生成へ置換。
  - グラフに `selectedLead` を渡し、**選択誘導の波形**を描く。ヘッダ表示（現状 "Lead II"）を `selectedLead` に追従させる。
  - 進行カーソル（現在位置の点）と reveal クリップは既存構造を流用し、サンプル元だけ投影波形に差し替える。
  - **縦スケール**：誘導により振幅が変わる（aVR は主に陰性・小さい等）。各誘導波形を**その誘導のサンプルの絶対最大**で正規化して表示するか、全誘導共通スケールにするかを決める。→ MVP は**全誘導共通の固定 mV スケール**（`GRAPH_MV_SCALE` 流用）とし、誘導間の相対的な大小・極性が正しく見えるようにする（誘導ごと正規化は避ける＝aVR が不自然に大きく見えるのを防ぐ）。振幅が小さい誘導は小さく描かれてよい。
  - **暫定 phaseMs**：T7 と同じく `progress`(0–100) → `phaseMs` の暫定ブリッジを使う（カーソル位置と reveal 進行度）。クロック一元化は T9。
- 新規作成：`scripts/verify-lead-projection-all.mjs`（全誘導投影の自動検証）
- `package.json` に `"verify:leadproj": "node scripts/verify-lead-projection-all.mjs"` を追加。

## Out of scope
- クロック（useCardiacClock）の実配線（T9）。T8 は暫定ブリッジ。
- `progress` useState の撤去（T9）。
- 3D 側（T7 で完了）。
- 12誘導の**同時**表示（12連画面）。MVP は「選択1誘導を大きく表示」。同時表示は将来タスク。
- 胸部誘導の波形精度（v2 `12lead-precordial-accuracy`）。V1–V6 は簡略投影の見た目でよい。

## Success criteria

### 自動検証（客観・必須）
- [ ] `scripts/verify-lead-projection-all.mjs` が下記を assert、1つでも外れたら exit 1。`npm run verify:leadproj` が exit 0：
  1. **Lead II が T5 と一致**：`sampleLeadCycle(nsrTimeline,"II",200)` から算出した波形が、既存 T5 ハーネスと同じ Z-score 相関で `r≥0.90`（`projectLead` が T5 の検証済み投影と数値一致することの再確認）。
  2. **誘導ごとに波形が反映される**：`I` と `aVR` が Z-score 相関 < −0.99（＝反転）、かつ 12誘導の R 偏位値が誘導間で分布する（`spread = max−min > 0.5`、aVR<0<II）。
     - ※ 当初 spec は「任意の相異なるペアが完全一致でない」としていたが、実測で**誤り**と判明。本 MVP は全イベントが +60° 方向のため各誘導は同一 S(t) のスカラー倍になり、同じ軸定数を持つ誘導は**完全に同一波形**になる（実測：`I≡III≡V6=0.484`, `II≡V4=0.967`, `aVF≡V2≡V5=0.838`）。これは単一方向双極子の既知の限界で、誘導を真に区別するには QRS 中の3D双極子回転が要る（v2 `12lead-qrs-vector-loop` / `12lead-precordial-accuracy`）。よって「全ペア相違」ではなく「I/aVR 反転＋R 偏位の分布」で selectedLead 反映を検証する。
  3. **極性の医学的整合**（NSR の代表的所見）：
     - `aVR` の主 QRS 偏位（`r` 時刻の投影値）が **陰性**（< 0）。
     - `II`・`I`・`aVF` の主 QRS 偏位が **陽性**（> 0）。
     - `II` の P 波（`pPeak` 時刻）が **陽性**。
     - **`aVL` は符号を断定しない（意図的除外）**。本モデルの平均電気軸は +60°、aVL 軸は −30° で角度差がちょうど 90°。主R の aVL 投影は ≈0（near-isoelectric）になり、これは正常軸で aVL が境界的になりやすい臨床的事実と一致する。符号を assert すると微小変化で反転する脆いテストになるため**符号ではなく「小ささ」を検証**する：`|aVL の R 偏位| ≤ 0.5 × |II の R 偏位|`（等電位に近いこと＝意図した挙動）。
  4. **振幅の相対関係**：`|aVR の R 偏位| < |II の R 偏位|`（共通スケール下で aVR が小さく陰性に出る）。
  5. `NaN`/`Infinity` を含まない。全誘導・全サンプル有限。
- [ ] 既存 verify 群（`projection`/`activation`/`evaluate`/`leadaxes`/`leadcamera`）が exit 0（回帰なし）。
- [ ] `npm run lint`・型チェック・`npm run build` が通る（ビルド必須）。

### 目視QA手順（補助）
- [ ] `npm run dev` → `vector` モードを開く。
- [ ] 誘導ボタンを I→II→III→aVR→aVL→aVF と押すと、**波形の形が誘導ごとに変わる**（aVR で主要 QRS が下向き＝陰性になる、II で上向き大、等）。グラフのヘッダ誘導名も追従する。
- [ ] スライダーを動かすと、3D 発光・波形カーソル・reveal が**同じ位相**で進む（T7 の暫定ブリッジ経由で同期している）。
- [ ] V1–V6 も切替で波形が変化する（簡略投影ゆえ肢誘導と似た見た目でも可＝意図した MVP 挙動）。
- [ ] Learning / Quiz / Compare モードが従来どおり（回帰なし）。

### 「意図」か「バグ」かの見分け基準
- **意図（正常）**：aVR が陰性・小振幅、II/aVF が陽性大、誘導ごとに形が違う、極性が §3 の医学的所見と一致。
- **バグの兆候**：全誘導が同じ形（`selectedLead` 未反映）／aVR が大きな陽性（軸符号ミス）／波形が矩形やゼロ（サンプリング/スケール破綻）／Lead II が T5 と一致しない（`projectLead` が評価関数とずれている）。

## Constraints
- **AGENTS.md 準拠**。`VectorVisualizer.tsx` は client component。
- 依存追加なし。純関数検証は Node 型ストリップ（`projectLead.ts` は T2/T4 を import するため、検証スクリプトは相対 import で解決できるように — evaluate.ts/leadAxes.ts が import-free または相対解決可能である前提。解決不能なら T5 ハーネス同様スクリプト内に薄い読み込みブリッジを置く）。
- **共通 mV スケール**を用い、誘導ごと正規化はしない（誘導間の相対振幅・極性を保つため）。
- Lead II 投影は T5 の検証済み結果（`r≈0.9678`）と一致し続けること（`projectLead` は T4 `evaluateDipole` を使う。独自実装で二重化しない）。
- 暫定 phaseMs ブリッジは T9 で撤去。TODO コメント明示。

## Edge cases
- 振幅が極端に小さい誘導（双極子とほぼ直交＝例えば軸が投影方向とほぼ90°）で波形がほぼ平坦になっても、ゼロ除算やスケール異常を起こさない（共通スケールなので平坦表示は正常）。
- `sampleCount` 端（最初/最後の点）で reveal クリップ幅が 0 や全幅で破綻しない。
- 誘導切替時にパスの再生成が走るが、毎フレームではなく `selectedLead` 変更時のみ（`useMemo` 依存に `selectedLead` を含める）。
- カーソル点の y 座標が共通スケールで枠外に出る誘導があれば、SVG viewBox 内にクランプ（見切れ防止、値自体は変えない）。

## Notes for the orchestrator's review pass
- **最重要**：Lead II が T5 と数値一致し続けているか（検証項目1）。ここがずれたら `projectLead` が T4 と分岐している証拠。
- `selectedLead` が本当に波形へ反映されているか（項目2＝I/aVR 反転＋R 偏位分布）。旧 `buildNsrPath`（nsr 固定）が残存していないか。
- MVP の単一方向双極子では一部の誘導が完全一致（I≡III≡V6, II≡V4, aVF≡V2≡V5）になるのは**意図した限界**（項目2 の注記参照）。目視QAで「V4 を押しても II と同じ波形＝バグ」と誤判定しないこと。真の区別は v2（3D双極子回転）で対応。
- aVR 陰性（項目3）は「軸符号が正しい」ことの医学的番人。ここが陽性ならフレーム/軸のどこかで符号ミス。
- `aVL` を符号断定せず「near-isoelectric（小ささ）」で検証しているのは**意図的**（+60°軸と 90° 直交のため境界的）。将来 aVL の符号を assert に変えたくなっても、平均電気軸を動かすと簡単に反転する脆さがあることを理解した上で判断すること。
- 共通スケール採用で、誘導ごと正規化に逃げていないか（逃げると aVR が不自然に大きく見え、教育的に誤り）。
- 波形パス生成が `selectedLead` 変更時のみで、毎フレーム再計算していないか（パフォーマンス）。
- 暫定 phaseMs ブリッジの TODO が残っているか（T9 で撤去する契約）。
