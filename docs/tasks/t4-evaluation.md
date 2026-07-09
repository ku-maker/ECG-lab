# Task: T4 賦活タイムラインの評価ロジック（evaluateDipole / evaluateSegments）

> 親設計: `docs/tasks/12lead-vector-sync.md` の §1「位相の評価関数」。
> 前提: T2（`leadAxes.ts`）・T3（`activation/types.ts`, `activation/nsr.ts`）完了済み。
> 後続: T5（Lead II 投影ゲート）・T7（3D発光）・T8（波形）がこの関数を消費する。

## Objective
T3 で定義した静的な `ActivationTimeline` から、**心周期内の任意時刻 `tMs` における合成双極子ベクトルと各セグメントの発光強度を計算する純関数**を実装する。ここが「データ（T3）」を「動く値」に変える中核。T4 の出力が正しければ、`· leadAxis`（T2）するだけで12誘導波形が出る（T5/T8）。

## Scope
- 新規作成：`src/data/ecg/activation/evaluate.ts`
  - **外部 import は T3 の型と T1 の easing のみ**（`leadAxes` は不要＝双極子はフレーム非依存の3Dベクトルを返す。投影は消費側で行う）。Node 型ストリップ検証のため、import は相対 or `@/`（検証スクリプトが解決できる範囲）に留める。**推奨: 相対 import（`./types`, `../../../lib/ecg/easing` は距離が深いので、easing の envelope 依存を避けるなら import-free も可）**。→ §Constraints 参照。
  - 実装する関数：
    ```ts
    import type { ActivationTimeline, ConductionSegmentId } from "./types";

    // 単一イベントの包絡（0..1）。Gaussian: exp(-0.5*((t-center)/sigma)^2)
    export function envelopeAt(centerMs: number, sigmaMs: number, tMs: number): number;

    // 合成双極子ベクトル。active な全イベントの dir*peakMag*envelope を総和。
    // contributesToWave===false のイベントは加算しない。
    // 戻り値は使い回し用の out 引数に書き込む（毎フレーム呼ばれるためアロケーション回避）。
    export function evaluateDipole(
      timeline: ActivationTimeline,
      tMs: number,
      out?: { x: number; y: number; z: number }
    ): { x: number; y: number; z: number };

    // 各セグメントの発光強度(0..1)。そのセグメントに属するイベントの
    // envelope の最大値（|peakMag| で重み付けした正規化値）を返す。
    // 全セグメント分のキーを必ず埋める（active でなければ 0）。
    export function evaluateSegments(
      timeline: ActivationTimeline,
      tMs: number
    ): Record<ConductionSegmentId, number>;
    ```
- 新規作成：`scripts/verify-evaluate.mjs`（自動検証。§Success criteria）
- `package.json` に `"verify:evaluate": "node scripts/verify-evaluate.mjs"` を追加。
- 改修なし（VectorVisualizer は T7 まで触らない）。

## 実装の要点（曖昧さを残さない）
- **`evaluateDipole` の総和式**：
  `out = Σ_{events, contributesToWave} dir_i * peakMag_i * envelopeAt(center_i, sigma_i, tMs)`
  - `dir` は単位ベクトル、`peakMag` は符号付き（負＝biphasic の Q/S）。T3 の方式（全 dir=+60°、符号で前後）をそのまま総和すればよい。
  - `out` を渡された場合はそこへ書き込み（新規オブジェクトを作らない）。渡されない場合のみ生成。**ループ内で一時配列/オブジェクトを作らない。**
- **`evaluateSegments` の強度**：
  - 各 `ConductionSegmentId` について、そのセグメントに属するイベント群の `envelopeAt(...)` を評価し、**最大値**を採用（同一セグメントに複数イベントがある QRS 系＝septalPurkinje では、Q/R/S のどれかが立っていれば発光）。
  - `contributesToWave` に関係なく発光は計算する（`avDelay` セグメントも AV 遅延中は「光ってよい」。発光と波形寄与は別概念）。ただし `avDelay` イベントは envelope を持つので、その窓で発光する。
  - 戻り値は8セグメント全キーを持ち、非活性は 0。
- **時刻の扱い**：`tMs` は心周期内 `[0, cycleMs)` 前提。呼び出し側（T6 クロック）が `phaseMs` を渡す。範囲外は envelope が自然減衰するので特別扱い不要だが、負値や cycleMs 超過でも NaN を出さないこと。

## Out of scope
- 誘導への投影（`· leadAxis`）は消費側（T5 検証・T8 波形）。T4 は双極子ベクトルそのものを返すだけ。
- 心周期クロック・BPM 再スケール（T6）。
- 3D 描画・波形描画（T7/T8）。
- NSR 以外のタイムライン。

## Success criteria
- [ ] `evaluate.ts` が3関数を export。
- [ ] `scripts/verify-evaluate.mjs` が下記を assert、1つでも外れたら exit 1。`npm run verify:evaluate` が exit 0：
  1. **P波窓**（`pPeak` 時刻）で `evaluateSegments` の `saAtrial` が最大（他セグメントより大きい）。
  2. **QRS窓**（`r` 時刻）で `evaluateDipole` の大きさ `|out|` が心周期中で最大付近（P・T の中心時刻での大きさより大きい）。
  3. **biphasic の符号**：`septalQ.center`（=`q`）時刻での Lead II 投影相当（`out.x*0.5 + out.y*(-0.8660254)`）が **負**、`r` 時刻で **正**、`s` 時刻付近で **負寄り**。→ Q・S の陰性、R の陽性を関数レベルで確認。
  4. **avDelay の波形非寄与**：`avDelay.center` 時刻で `evaluateDipole` の Lead II 投影が ≈ 0（|値| < 0.02）。同時に `evaluateSegments.avDelay > 0`（発光はする）。
  5. **アロケーション回避**：同じ `out` オブジェクトを渡して2回呼んでも新規生成されない（`out` の参照同一性を確認、または呼び出し前後で使い回しできること）。
  6. `evaluateSegments` の戻り値が8セグメント全キーを持ち、値が全て `[0,1]` 範囲。
  7. 範囲外時刻（`tMs = -50`, `tMs = cycleMs+50`）で NaN/Infinity を返さない。
- [ ] **統合ゲート（最重要）**：`npm run verify:projection`（T5）を、**T4 の `evaluateDipole` を使う形に差し替えても** exit 0 のままであること。→ §Constraints の「T5ハーネス接続」参照。
- [ ] `npm run lint` と型チェックが通る。

## Constraints
- **AGENTS.md 準拠**。依存追加なし。検証は Node 型ストリップ実行。
- **import-free 維持を優先**：`envelopeAt` の Gaussian は easing 非依存で自前実装（T3 ハーネスと同じ `exp(-0.5*z*z)`）。これにより `evaluate.ts` の外部 import を T3 型のみに保て、検証スクリプトが相対 import 一発で動く。easing を使いたい箇所が無ければ import しない。
- **T5 ハーネスとの接続**：現状 `scripts/verify-lead2-projection.mjs` はモデルを**インライン**で持っている。T4 完了時に、このハーネスの `evaluateDipole` 相当部分を **T4 の実装呼び出しへ置換**し、同じ閾値（r≥0.90 等）で通ることを確認する（T4 が T5 の検証済みモデルと数値的に一致する証明）。置換後もインライン版と同じ `r=0.9678` 近傍が出ること。
- 毎フレーム呼ばれる前提。`evaluateDipole` はループ内アロケーションゼロ。
- 純関数・副作用なし。

## Edge cases
- `sigmaMs === 0` のイベントが混入した場合の 0 除算（T3 で正を保証済みだが、防御的に `sigma<=0` を assert or 早期 0 返し）。
- 同一セグメントに複数イベント（septalPurkinje の Q/R/S）がある場合の発光は**最大値**採用（合算して 1 を超えない）。
- `contributesToWave===false`（avDelay）が双極子総和に混ざっていないこと（混ざると PR 区間に偽の振れが出て T5 項目4が落ちる）。
- 非常に近接した2イベントの envelope 重なりで発光が 1 を超えないようクランプ。

## Notes for the orchestrator's review pass
- **最重要**：T5 ハーネスの `evaluateDipole` をインライン版から T4 実装へ差し替えて `r≈0.9678` が再現するか。ここが「T4 が正しい」ことの唯一の客観証明。差し替え後の `npm run verify:projection` 実行ログを残すこと。
- `contributesToWave===false` の除外が総和側で効いているか（発光側では除外しない、の区別ができているか）。項目4がこの番人。
- アロケーション回避が本当に効いているか（`out` 引数の使い回し、ループ内 `new`/リテラルオブジェクト生成が無いか）レビューで実コードを確認。
- 発光強度の正規化が `[0,1]` に収まるか。QRS で複数イベント重畳時に 1 を超えていないか。
- envelope が easing ではなく Gaussian（T3/T5 と同一式）で実装され、モデルの一貫性が保たれているか。
