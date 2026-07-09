# Task: T2 座標フレーム＆12誘導軸の定義

> 親設計: `docs/tasks/12lead-vector-sync.md` の §2「双極子モデルと解剖フレーム」。
> 前提タスク: T1（`lib/ecg/easing.ts` 抽出）完了済み。

## Objective
バラバラだった3座標系（伝導路・カメラ・誘導軸）を統一するための**単一の解剖フレーム**と、そのフレーム上の**12誘導の単位ベクトル**を定義する。以降の投影（`leadValue = dipole · leadAxis`）とカメラ導出の共通土台になる、純粋な数値モジュール。

## Scope
- 新規作成：`src/data/ecg/leads/leadAxes.ts`
  - **外部 import を一切持たない純モジュール**にする（THREE も `@/` エイリアスも import しない）。理由: Node の型ストリップで直接実行でき、依存なしで自動検証できるため（§検証手段の前提）。
  - export するもの：
    - `export type LeadId = "I"|"II"|"III"|"aVR"|"aVL"|"aVF"|"V1"|"V2"|"V3"|"V4"|"V5"|"V6";`
      （現在 `components/VectorVisualizer.tsx:29` に重複定義されている型を**こちらへ移設**し、単一の出所にする。）
    - `export const LEADS: LeadId[]`（12誘導の順序配列。VectorVisualizer の既存順を踏襲）
    - `export const LEAD_ANGLES_DEG: Record<LeadId, number>`（下記の値）
    - `export function axisFromAngle(deg: number): [number, number, number]`
    - `export function leadAxis(id: LeadId): [number, number, number]`（正規化済み）
- 改修：`components/VectorVisualizer.tsx`
  - ローカルの `LeadId` 型定義と `LEADS` 配列を削除し、`import { type LeadId, LEADS } from "@/src/data/ecg/leads/leadAxes";` に置換。
  - **`LEAD_CAMERA_POSITIONS` はこの T2 では削除しない**（カメラ導出への置換は T7 の担当）。型参照が壊れないことだけ確認する。
- 新規作成：`scripts/verify-lead-axes.mjs`（自動検証。§Success criteria 参照）
- 改修：`package.json` に `"verify:leadaxes": "node scripts/verify-lead-axes.mjs"` を追加（既存 `verify:projection` に倣う）。

## フレーム定義（このタスクの中核・厳守）
- 前額面（frontal plane）を X-Y 平面に取る。
  - `+X` = 患者の左（LEFT）
  - `+Y` = 患者の上（SUPERIOR）／`-Y` = 下（INFERIOR）
  - `+Z` = 前（ANTERIOR、画面手前）／`-Z` = 後（POSTERIOR）
- 角度規約：`θ=0°` が Lead I（`+X`方向）、`θ=+90°` が下向き（`-Y`）。
- 実装式：`axisFromAngle(deg) = (cos(deg), -sin(deg), 0)`（deg→rad 変換して算出）。
- `LEAD_ANGLES_DEG`（肢誘導は標準六軸、胸部は MVP 簡略角）：
  ```
  I: 0, II: 60, III: 120, aVR: -150, aVL: -30, aVF: 90,
  V1: 100, V2: 90, V3: 75, V4: 60, V5: 30, V6: 0
  ```
- `leadAxis(id)` は `axisFromAngle(LEAD_ANGLES_DEG[id])` を L2 正規化して返す（z=0 なので実質 xy 正規化、ノルム0は起こり得ないが0除算ガードは入れる）。

## Out of scope
- カメラ位置の `leadAxis` 由来への置換（T7）。
- 双極子・賦活タイムライン・投影波形（T3〜T5, T8）。
- 胸部誘導 V1–V6 の解剖学的精度向上（親設計の Out of scope: `12lead-precordial-accuracy`（仮））。V1–V6 角は「前額面の近似」であることをコード内コメントに明記し、将来 v2 が本物と誤認しないようにする。
- THREE.Vector3 への変換は本タスクでは提供しない。必要な呼び出し側（3Dシーン）が `new THREE.Vector3(...leadAxis(id))` で包む（T7）。

## Success criteria
- [ ] `src/data/ecg/leads/leadAxes.ts` が上記 export を持ち、**外部 import ゼロ**である。
- [ ] `VectorVisualizer.tsx` の `LeadId`/`LEADS` 重複定義が消え、leadAxes からの import になっている。
- [ ] `scripts/verify-lead-axes.mjs` が下記アサーションを実装し、**1つでも外れたら exit 1**（目視確認に依存しない）。`npm run verify:leadaxes` が exit 0。
  1. `leadAxis("I")` ≈ `[1, 0, 0]`（許容 1e-9）
  2. `leadAxis("aVF")` ≈ `[0, -1, 0]`（下向き）
  3. `leadAxis("II")` ≈ `[0.5, -0.8660254, 0]`（T5 ハーネスと同値）
  4. **Einthoven の関係** II = I + III をベクトルで検証：`axisFromAngle(0) + axisFromAngle(120)` の向きが `axisFromAngle(60)` と平行（正規化して各成分 ≈ 一致、許容 1e-9）。
  5. すべての `leadAxis(id)` のノルムが ≈ 1（許容 1e-9）。
  6. `LEAD_ANGLES_DEG` と `LEADS` が12誘導すべてを漏れなく覆う（キー数=12、重複なし）。
- [ ] `npm run lint` と型チェック（`npx tsc --noEmit` 相当）が通る。
- [ ] `vector` モードが起動し、誘導ボタン一覧が従来どおり表示される（回帰なしの補助確認。単独の合否基準にはしない）。

## Constraints
- **AGENTS.md 準拠**：破壊的変更版 Next.js。新規ファイル追加時は必要に応じ `node_modules/next/dist/docs/` を確認。
- 依存追加なし。検証は Node 24 の型ストリップ実行（import-free `.ts` を `.mjs` から相対 import）で行う。既存 `scripts/verify-lead2-projection.mjs` と同じ実行方式。
- 角度・フレーム規約は §フレーム定義から一切ずらさない（T5 の検証済み前提と不整合になると投影ゲートが崩れる）。
- 純粋関数・副作用なし・`"use client"` 不要。

## Edge cases
- 負角（`aVR: -150`, `aVL: -30`）で `axisFromAngle` が正しく象限を返すこと（アサーション3〜4で間接検証）。
- 浮動小数比較は厳密等値でなく許容誤差（1e-9）で行う。
- `leadAxis` のノルム0除算ガード（実際には発生しないが防御的に）。

## Notes for the orchestrator's review pass
- **最重要**：`axisFromAngle` の符号が `(cos, -sin, 0)` になっているか。ここが T5 の検証済みフレーム（Lead II = `[0.5, -0.866, 0]`）と一致していないと、後続の投影ゲート（r≥0.90）が理由不明で崩れる。アサーション3が実質この番人。
- `LeadId` の出所が leadAxes.ts に一本化され、VectorVisualizer 側に重複が残っていないか（残ると T7 以降で型不一致の温床）。
- 胸部誘導角が「近似」とコメントで明示され、Out of scope の将来タスクへの参照があるか。
- `verify:leadaxes` が本当に exit 1 で落ちること（Codex は、わざと符号を反転させて落ちるのを1度確認してから戻す、という自己検証を行うと確実。T5 で有効だった手法）。
