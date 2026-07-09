# Task: T7 3D配線置換（カメラ leadAxis 化・発光 evaluateSegments 化・座標フレーム整合）

> 親設計: `docs/tasks/12lead-vector-sync.md` の §2/§3。
> 前提: T2（`leadAxes.ts`）・T3（`activation/nsr.ts`）・T4（`evaluate.ts`）完了済み。
> 後続: T8（波形置換）・T9（クロック統合）。
> 位置づけ: **T1〜T6 の純ロジックと違い、初めて `VectorVisualizer.tsx`（見た目）を書き換えるタスク。**

## Objective
目分量ハードコードの `LEAD_CAMERA_POSITIONS` と、NSR 決め打ちの `getConductionTimeline` による発光駆動を撤去し、**カメラを `leadAxis`（T2）由来の計算に、3D 発光を `evaluateSegments`（T4）駆動に**置き換える。これにより「誘導選択 → カメラ視点 → 伝導セグメント発光」が単一ソース（誘導軸＋賦活タイムライン）から導出される。

## Scope
- 新規作成：`src/data/ecg/leads/leadCamera.ts`（**純関数・カメラ計算をここに切り出し node 検証可能にする**）
  ```ts
  import { leadAxis, type LeadId } from "./leadAxes";
  export const CAMERA_DISTANCE = 4.85;   // 既存 camera 初期距離に合わせる
  export const CAMERA_FRONT_BIAS = 1.15; // +Z(前方)への引き出し。edge-on 回避の要
  // 誘導の陽極側 かつ 前方から見る視点位置を返す。
  // dir = normalize(leadAxis(id) + (0,0,FRONT_BIAS)); pos = target + dir*distance
  export function leadCameraPosition(
    id: LeadId,
    target: [number, number, number],
    distance?: number,
    frontBias?: number
  ): [number, number, number];
  ```
- 新規作成：`src/data/ecg/activation/segmentPoints.ts`
  - `export const SEGMENT_POINTS: Record<ConductionSegmentId, VectorPoint[]>`：各セグメントに対応する3D点列（既存 `CONDUCTION_PATHS` の形状を流用しつつ、`ConductionSegmentId` に紐付け直す）。
  - His/脚（hisBundle/rightBundle/leftAnterior/leftPosterior）は既存 `CONDUCTION_PATHS` の対応パスを割当。`septalPurkinje` は QRS 系（Q/R/S イベント）の発光対象。
- 改修：`components/VectorVisualizer.tsx`
  - `LEAD_CAMERA_POSITIONS`（60行）を**削除**。`LeadCameraController` を `leadCameraPosition(selectedLead, SCENE_TARGET)` 由来へ書き換え（既存の `camera.position.lerp(..., 0.075)` によるスムージングは**維持**）。
  - `getConductionTimeline` による各 `ConductionPathway` の `pulseProgress/active` 供給を、`evaluateSegments(nsrTimeline, phaseMs)` の結果へ置換。各 `ConductionPathway` は対応セグメントの強度で光る。
  - **`CONDUCTION_POINTS` のフレーム整合**：T2 フレーム（+X=患者左, +Y=上, +Z=前）と矛盾する軸符号があれば符号のみ補正（形状は変えない）。特に左脚（LBB/LAF/LPF）が患者左（+X）、右脚（RBB）が患者右（−X）に来ること。
  - **phaseMs の供給源は暫定**：T7 時点ではクロック（T6）未配線のため、既存 `progress`(0–100) を `phaseMs = progress/100 * cycleMs` に変換して使う**暫定ブリッジ**でよい。完全なクロック一元化は T9。この暫定である旨をコメントで明記。
- 新規作成：`scripts/verify-lead-camera.mjs`（カメラ純関数の自動検証）
- `package.json` に `"verify:leadcamera": "node scripts/verify-lead-camera.mjs"` を追加。

## カメラ計算の設計（意図した挙動の定義）
- フレーム：+X=患者左, +Y=上, +Z=前（画面手前）。誘導軸はすべて前額面（z=0）にあるため、**そのまま使うとカメラが前額面内に入り "edge-on"（心臓を真横から薄く見る）退化ビューになる**。これを避けるため `+Z` 方向へ `CAMERA_FRONT_BIAS` だけ引き出し、常に前方寄りから見る。
- 各誘導で期待される見え方（陽極側＋前方から見る）：
  | 誘導 | 角度 | 期待されるカメラ位置（見る方向） |
  |---|---|---|
  | I | 0° | 患者の**左・前**から |
  | II | 60° | **左下・前**から |
  | III | 120° | **右下・前**から |
  | aVR | −150° | **右上・前**から |
  | aVL | −30° | **左上・前**から |
  | aVF | 90° | **真下・前**から（下から見上げる） |
  | V1–V6 | 100°→0° | 前額面の近似角に沿って**下寄り→左**へ連続的に振れる（MVP 簡略。※下記） |
- ※ V1–V6 は簡略角ゆえ肢誘導と視点が近接・重複しうる（親設計 Out of scope の胸部誘導近似）。これは**意図した MVP 挙動**でありバグではない。

## Out of scope
- 波形グラフの投影波形化（T8）。T7 では波形は現状のまま（Lead II 固定表示）でよい。
- クロック（useCardiacClock）の実配線（T9）。T7 は暫定ブリッジ。
- `progress` useState の撤去（T9）。
- 胸部誘導の視点を解剖学的に正す（v2 `12lead-precordial-accuracy`）。
- 双極子ベクトル矢印の3D表示など新規ビジュアル（本 MVP 外）。

## Success criteria

### 自動検証（客観・必須）
- [ ] `scripts/verify-lead-camera.mjs` が下記を assert、1つでも外れたら exit 1。`npm run verify:leadcamera` が exit 0：
  1. 全誘導で `leadCameraPosition` の **z 成分 > target.z**（常に前方から見る＝edge-on でない）。
  2. カメラ〜target 距離が OrbitControls 範囲 `[3.2, 6.6]` 内（`minDistance`/`maxDistance` と整合）。
  3. **方位の整合**：`I`（左）は x>target.x、`aVF`（下）は y<target.y、`aVR`（右上）は x<target.x かつ y>target.y、`aVL`（左上）は x>target.x かつ y>target.y。
  4. **対称性**：`aVR` と `aVL` のカメラが縦軸（x=target.x）に対して概ね鏡像（x 成分の符号が逆、y 成分が同符号）。
  5. `NaN`/`Infinity` を返さない。
- [ ] `npm run verify:projection` / `verify:activation` / `verify:evaluate`（既存）が引き続き exit 0（回帰なし）。
- [ ] `npm run lint`・型チェック・`npm run build` が通る（**ビルド成功を必須**。見た目タスクなので描画コンポーネントのコンパイルを担保）。

### 目視QA手順（補助・自動検証の補完として実施）
> T1 と同様、開発サーバを起動して `vector` モードで確認する。単独の合否基準にはしないが、下記を1項目ずつ確認しチェックを付ける。

- [ ] `npm run dev` で起動 →（アプリのモード切替で）`vector`（刺激伝導マップ）を開く。
- [ ] **発光の同期**：スライダーを 0→100% へ動かすと、SA→心房→AV→His→脚→Purkinje→（T波で再分極）の順に発光が流れる。QRS 相当の位置で心室セグメントが最も強く光る。以前（`getConductionTimeline`）と**流れの順序・タイミングが概ね一致**する。
- [ ] **誘導ボタンでカメラが動く**：I / II / III / aVR / aVL / aVF を順に押し、上表「期待されるカメラ位置」と見え方が一致する（例：aVF で心臓を下から見上げる／aVR と aVL が左右反転の関係）。
- [ ] **カメラのスムージング**：ボタンを押すと視点が**滑らかに補間**して移動する（瞬間テレポートしない）。
- [ ] **解剖の左右**：右脚（RBB）が画面上で患者の右側、左脚系（LBB/LAF/LPF）が左側に見える（フレーム整合の確認）。
- [ ] **回帰**：Learning / Quiz / Compare モードが従来どおり表示・動作する。

### カメラ変化が「意図」か「バグ」かの見分け基準（重要）
`LEAD_CAMERA_POSITIONS`（目分量）から `leadAxis` 由来計算へ変わるため、**各誘導のカメラの見え方は以前と完全一致しない**。以下で判別する：

- **意図した変化（正常）**：
  - 心臓が常に画面中央に収まり、全体が見える。
  - 誘導角に沿って視点の方位が連続的・単調に回る（I→II→III で左→左下→右下、のように六軸順に回る）。
  - 対向する誘導（aVR↔aVL 等）が概ね鏡像の視点になる。
  - 胸部誘導が肢誘導と視点が近い（簡略角のため）。
- **バグの兆候（要修正）**：
  - 心臓が画面外・見切れる／メッシュ内部にカメラが入る／裏側（−Z）に回り込んでラベルが反転して見える。
  - 心臓を真横から薄く見る **edge-on**（奥行きが潰れて平面的）。→ `CAMERA_FRONT_BIAS` が効いていない。
  - どの誘導を押しても**同じ視点**（`selectedLead` が反映されていない）。
  - 視点移動が**瞬間的にジャンプ**する（lerp スムージングが外れている）。

## Constraints
- **AGENTS.md 準拠**：`VectorVisualizer.tsx` は client component。描画・R3F 周りの変更前に `node_modules/next/dist/docs/` の該当ガイドを確認。
- 依存追加なし。カメラ純関数は Node 型ストリップで検証。
- 既存の描画資産（`ConductionPathway`/シェーダ/`NodeMarker`/`TerminalGlow`/`OrbitControls` 設定/`SCENE_TARGET`/fov/距離範囲）は流用。**シェーダやチューブ形状は変更しない。**
- `camera.position.lerp(..., 0.075)` のスムージング係数は維持。
- 暫定 `phaseMs` ブリッジは T9 で撤去される前提。TODO コメントで明示。

## Edge cases
- スライダー 0% / 100%（`phaseMs=0` / `cycleMs`）で発光評価が破綻せず、`evaluateSegments` が全キー返す（T4 で担保済み、ここでは配線ミスがないか）。
- 誘導を高速連打してもカメラ lerp が破綻しない（目標位置だけ差し替わる）。
- `SCENE_TARGET` が原点でない（`[-0.08,-0.28,0.02]`）ため、方位判定は **target 相対**で行う（絶対座標の符号で判定しない）。検証スクリプトも target 相対で assert。

## Notes for the orchestrator's review pass
- **最重要**：カメラ・発光の**両方**が新ソース（`leadCameraPosition`＋`evaluateSegments`）から来ているか。片方でも旧 `LEAD_CAMERA_POSITIONS`/`getConductionTimeline` が残ると設計破綻が再発（親設計の中心的失敗パターン）。`getConductionTimeline` が完全に使われなくなったか（デッドコード化していないか、残すなら理由）確認。
- edge-on 回避（`CAMERA_FRONT_BIAS`）が実際に効いているか。検証項目1（z>target.z）が番人だが、目視でも奥行きが見えるか確認。
- `CONDUCTION_POINTS` のフレーム整合を「形状を変えず符号のみ」で行ったか（形を作り直していないか）。
- 暫定 `phaseMs` ブリッジが T9 で外す前提の TODO 付きになっているか。恒久化されると二重管理の火種。
- 目視QAは補助。ビルド成功＋カメラ純関数検証＋既存 verify 群の回帰なし、が客観ゲート。
