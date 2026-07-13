# docs/tasks — 設計・タスク仕様の索引

12誘導 Conduction 同期機能の設計・実装・改善のタスク仕様を置く場所。各ファイルは
[TEMPLATE.md](TEMPLATE.md) 準拠（Objective / Scope / Out of scope / Success criteria /
Constraints / Edge cases / Notes for the orchestrator's review pass）。

## 親設計
- [12lead-vector-sync.md](12lead-vector-sync.md) — 12誘導ビュー切替に連動する3D伝導＋波形の
  同期エンジン全体設計。賦活タイムライン → 双極子 → 12誘導投影 → 状態同期 → T1〜T10 分解。

## 実装タスク（T1〜T10、実装済み）
T1（easing 抽出）・T5（Lead II 投影ゲート）は親設計内で確定・ハーネス実装したため独立ファイルなし。

- [t2-lead-axes.md](t2-lead-axes.md) — 座標フレーム＋12誘導軸（`leadAxes.ts`）。
- [t3-activation-timeline.md](t3-activation-timeline.md) — 賦活タイムライン型＋NSR定義
  （`activation/types.ts`, `buildTimeline.ts`, `nsr.ts`）。
- [t4-evaluation.md](t4-evaluation.md) — `evaluateDipole` / `evaluateSegments`（`evaluate.ts`）。
- [t6-cardiac-clock.md](t6-cardiac-clock.md) — 心周期クロック（`cardiacClock.ts` / `useCardiacClock.ts`）。
- [t7-3d-wiring.md](t7-3d-wiring.md) — カメラ leadAxis 化・発光 evaluateSegments 化（`leadCamera.ts`,
  `segmentPoints.ts`）。
- [t8-waveform-projection.md](t8-waveform-projection.md) — 選択誘導の投影波形描画（`projectLead.ts`）。
- [t9-clock-integration.md](t9-clock-integration.md) — 単一クロックへの一元化。
- [t10-final-qa.md](t10-final-qa.md) — 総合QA受け入れゲート。
- [t10-qa-report.md](t10-qa-report.md) — T10 QA 実施結果レポート。

## 追随の修正・チューニング（実装済み）
- [repol-static-glow.md](repol-static-glow.md) — 再分極演出の逆走廃止・均一シアングロー。
- [avl-pt-axis-tilt.md](avl-pt-axis-tilt.md) — P/T 軸を +60° から微小に振り aVL のフラット解消。
- [mobile-layout-fixes.md](mobile-layout-fixes.md) — モバイルの波形クリップ修正・3Dラベル整理。
- [conduction-visual-tuning.md](conduction-visual-tuning.md) — 波形サイズ・View angle バッジ・3D 明度。

## 形状（提案 → 一部実装）
- [heart-geometry.md](heart-geometry.md) — 楕円体 → latheGeometry の心臓形状。対称テーパーで実装済み。
  LV/RV 非対称・胸部誘導精緻化は未着手（下記 v2）。

## 自動検証（`npm run verify:all`）
lead axes / activation / evaluate / Lead II projection(r≥0.90) / cardiac clock / lead camera /
all-lead projection / clock integration / repol glow / graph fit を一括実行（各 `scripts/verify-*.mjs`）。

## 未着手（v2 / 要ユーザ判断）
- **LV/RV 非対称**（心尖を左に寄せる）— 心臓を大きくせずに伝導路を包める。`heart-geometry.md` 参照。
- **胸部誘導 V1–V6 の精度**（`12lead-precordial-accuracy` 仮）— I≡III≡V6・II≡V4 等の同一波形を解消。
- **QRS 内の双極子回転精緻化**（`12lead-qrs-vector-loop` 仮）— septalQ/terminalS の 180° 簡略化を本物へ。
- **不整脈タイムライン**（`12lead-arrhythmia-timelines` 仮）— NSR 以外を Conduction マップへ。
- **12誘導同時表示**（12連画面）。
