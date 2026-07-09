# Task: T9 クロック統合（単一 useCardiacClock への一元化・暫定ブリッジ撤去）

> 親設計: `docs/tasks/12lead-vector-sync.md` の §3「状態同期」。
> 前提: T6（`cardiacClock.ts`/`useCardiacClock.ts`）・T7（3D配線・暫定 phaseMs）・T8（波形投影・暫定 phaseMs）完了済み。
> 後続: T10（総合QA）。
> 位置づけ: T6〜T8 の成果を **1つの時計** に統合する工程。新規ロジックは足さず、配線を一本化する。

## Objective
`VectorVisualizer` の分離した `progress` useState と、T7/T8 で入れた暫定 `phaseMs` ブリッジを撤去し、**T6 の `useCardiacClock` を単一の source of truth** として配線する。3D 発光（`evaluateSegments`）・波形投影（`projectLead`）・進行カーソル・reveal・スライダー・（あれば再生/一時停止）が**すべて同一の `phaseMs`** を読む状態にする。これで「誘導選択 → 3D → 波形」の基本ループが単一クロック上で完全同期する。

## Scope
- 改修：`components/VectorVisualizer.tsx`
  - `const [progress, setProgress] = useState(0)` を**撤去**し、`useCardiacClock({ bpm, cycleMs: nsrTimeline.cycleMs })` を導入。
  - スライダーは `useCardiacClock` の `scrubTo(ratio)` を呼ぶ（`onValueChange` → `scrubTo(value/100)`）。スライダー操作＝`enterScrubbing`、操作確定/離脱＝`enterPlaying`（または明示 play ボタン）に接続。**T6 の遷移 API（`enterScrubbing`/`enterPlaying`）を使う**。
  - 3D 側（T7 で入れた暫定 `phaseMs = progress/100*cycleMs`）を**クロックの `phaseMs` に置換**。`getConductionTimeline` 由来の残骸があれば完全撤去。
  - 波形側（T8 で入れた暫定ブリッジ）も**クロックの `phaseMs` に置換**。カーソル位置・reveal 幅・投影パスのサンプリング基準を `phaseMs` 起点に統一。
  - `progress`(0–100) 前提だった UI 表示（`Math.round(progress)%` や ms/mV 表示）は `phaseMs`/`cycleMs` から算出し直す。
  - 全ての暫定 `phaseMs` ブリッジ TODO コメント（T7/T8）を削除。
- 改修（必要時）：`lib/ecg/useCardiacClock.ts`
  - VectorVisualizer 配線で判明した不足 API があれば最小限補う（ただし T6 の純ロジックは変えない。フックの配線層のみ）。
- 新規作成：`scripts/verify-clock-integration.mjs`（純ロジック観点の統合検証。フック自体は node で回せないため、`cardiacClock.ts` の遷移列を模した検証を置く）
- `package.json` に `"verify:clockint": "node scripts/verify-clock-integration.mjs"` を追加。
- **`EcgCanvas.tsx` は触らない**（親設計 Scope）。本タスクは vector モードのクロック一元化のみ。

## Out of scope
- `EcgCanvas` の RAF を `useCardiacClock` へ寄せる（本 MVP 外。Learning/Quiz/Compare は現状維持）。
- 新しい評価・投影ロジック（T4/T8 で確定済み。ここでは呼ぶだけ）。
- 12誘導同時表示・胸部誘導精度（将来/ v2）。
- BPM を変える UI の新設（vector モードで BPM 可変にするかは任意。するなら T6 の `setBpm` を配線し、位相連続性は T6 検証済み）。

## Success criteria

### 最上位（統合の回帰ゲート・必須）
- [ ] **既存 verify 群が全て exit 0 のまま（回帰ゼロ）**：
      `npm run verify:projection`（T5）／`verify:leadaxes`（T2）／`verify:activation`（T3）／`verify:evaluate`（T4）／`verify:clock`（T6）／`verify:leadcamera`（T7）／`verify:leadproj`（T8）／`verify:clockint`（T9）が**すべて exit 0**。
      → 統合で純ロジック層に一切の回帰を持ち込んでいないことの機械的証明。1つでも赤なら T9 未完。
- [ ] `npm run lint`・型チェック・`npm run build` が通る。

### T9 固有の統合検証
- [ ] `scripts/verify-clock-integration.mjs`（`cardiacClock.ts` 純ロジックで遷移列を検証）が exit 0：
  1. playing で `advance` を回し `phaseOf` が `[0,cycleMs)` を単調巡回。
  2. `enterScrubbing`→`scrubToRatio(r)`→`enterPlaying` の一連で位相が飛ばない（T6 項目7〜9 の再確認を統合シナリオとして通す）。
  3. 同一 `phaseMs` に対し「3D 発光評価（`evaluateSegments`）」と「波形投影（`projectLead`）」が**同じ `phaseMs` を引数に取る**構成であること（＝両者が同一値を共有するテスト：ある `phaseMs` で両関数を呼び、片方だけ別の位相を使っていない配線であることをスクリプトで表現）。
- [ ] コード上、`progress` useState と暫定 `phaseMs` ブリッジ、`getConductionTimeline` が**完全に消えている**（`grep` で不在確認：`progress`・`getConductionTimeline`・`TODO.*phaseMs` がヒットしない）。
- [ ] **配線層のアロケーションゼロ維持**：毎フレーム経路（`useFrame`/RAF コールバック）で `evaluateDipole` に渡す out オブジェクトが `useRef` 由来で使い回されており、コールバック内に新規オブジェクト/配列リテラルが無い（実コード確認＋ `useFrame` 内の `{`/`new THREE`/`[...]` 目視レビュー）。T4 の制約が配線層で無効化されていないこと。

### 目視QA手順（補助）
- [ ] `npm run dev` → `vector` モードを開く。
- [ ] **完全同期**：スライダーを動かすと 3D 発光・波形カーソル・reveal・数値表示（%/ms/mV）が**すべて同じ位相**で一致して動く（ズレ・位相差がない）。
- [ ] **再生/スクラブ遷移**：（再生機能があれば）再生中にスライダーを掴む→離すで、掴んだ瞬間・離した瞬間に波形/発光が**飛ばない**（T6 の遷移連続性が実挙動で確認できる）。
- [ ] **誘導＋位相の二軸**：誘導ボタンで波形形状・カメラ・発光対象が変わり、スライダーで時間が進む。両者が独立に効き、干渉しない。
- [ ] Learning / Quiz / Compare モードが従来どおり（回帰なし）。

### 「意図」か「バグ」かの見分け基準
- **意図（正常）**：3要素（発光・波形カーソル・reveal）が寸分違わず同位相。誘導切替は形だけ変え位相は保持。遷移で飛ばない。
- **バグの兆候**：発光と波形カーソルに**位相ズレ**がある（＝どこかが旧 `progress` や別 `phaseMs` を読んでいる）／スライダーを離した瞬間に波形がジャンプ（遷移 API 未使用）／誘導を変えると位相が 0 に戻る（クロックが誘導 state に巻き込まれている）。

## Constraints
- **AGENTS.md 準拠**：フック配線・effect 変更前に `node_modules/next/dist/docs/` の client component/effect ガイドを確認。
- 依存追加なし。統合検証は Node 型ストリップ（`cardiacClock.ts` 純ロジック）。
- **T6 の純ロジック（`cardiacClock.ts`）は変更しない**。変更はフック配線層（`useCardiacClock.ts`）と `VectorVisualizer.tsx` に限る。
- `MAX_FRAME_DELTA_MS` 等の定数は T6 のものを流用。
- 単一 source of truth の原則：`phaseMs` は `useCardiacClock` から**1箇所で**取得し、props/引数で配る。ローカルに第2の位相状態を作らない。
- **T4 のアロケーションゼロ制約を配線層で無効化しない**：`evaluateDipole` に渡す再利用 out オブジェクト（`{x,y,z}`）は `useRef` 等で**フレーム間保持**し、`useFrame`/RAF コールバック内で新規リテラルを毎フレーム生成しない。同様に、毎フレーム走る経路で新配列・新 THREE.Vector3・新オブジェクトを作らない（誘導軸やターゲットは `useMemo` でキャッシュ）。React の再レンダ経路とアニメーション（毎フレーム）経路を分け、位相更新で不要な再レンダを誘発しない。

## Edge cases
- 誘導切替（`selectedLead` 変更）で `phaseMs` がリセットされないこと（クロックと誘導 state が独立）。
- スライダー最小/最大（0%/100%）での reveal・カーソルが破綻しない。
- タブ非アクティブ→復帰で `phaseMs` が飛ばない（T6 のクランプ＋基準時刻リセットが効く）。
- 再生機能を付けない場合でも、少なくとも scrubbing 単独で全要素が同位相であること（playing 無しでも同期は成立）。

## Notes for the orchestrator's review pass
- **最上位ゲート**：ユーザ明示要件により、統合後に **T5・T7・T8 を含む全 verify 群が exit 0** であることを最初に確認する。ここが本タスクの合否の芯。
- **位相の単一化**：`grep` で `progress`／`getConductionTimeline`／暫定 phaseMs TODO が消えたか。残存＝二重管理の再発。
- 3D 発光と波形が**物理的に同じ `phaseMs` 変数**を受け取っているか（別々に計算した位相を「たまたま一致」で渡していないか）。項目3の配線検証と実コードで確認。
- 誘導 state とクロック state が独立か（誘導変更でクロックが巻き戻らない）。
- フック配線層のみの変更で、T6 純ロジックが無改変か（`git diff lib/ecg/cardiacClock.ts` が空）。
- **T4 アロケーションゼロが配線層で生きているか**：T4 で `evaluateDipole` を out 引数使い回しにした努力を、React 配線が毎フレーム新規オブジェクト生成で台無しにしていないか。`useFrame`/RAF 内の out オブジェクトが `useRef` 保持か、毎フレームのオブジェクト/配列/`THREE.Vector3` 生成が無いかを実コードでレビュー（純ロジック検証では捕捉できない層なので、ここは目視レビューが番人）。

