# Task: Conduction モードのモバイル表示修正（3Dラベル過大 / 波形の枠外クリップ）

> 親設計: `docs/tasks/12lead-vector-sync.md`（T7〜T9 で実装した3D＋波形）。
> 種別: 表示（レイアウト/CSS）修正のみ。生理学ロジック・波形の値・双極子・投影には触れない。
> 実機（モバイル 375px 幅）で発見。
> **方針確定：問題1 = Option A（フォント縮小＋モバイルでラベル非表示・球は残す）。**
> **問題2 = CSS オーバーフロー解消＋全12誘導からの共通スケール導出（実測 globalMaxAbsMv=0.9663、
> 中央ベースライン180・上下マージン24 → y範囲[24,336]⊂[0,360]）。**

## Context（なぜこの修正をするか）
Conduction モードに、生理学ロジックとは無関係の純粋な表示問題が2つある。

- **問題1**：3D CONDUCTION MAP のテキスト注釈ラベル（NodeMarker の "SA Node" / "AV Node" /
  "Bundle of His"、および "Apex"）が大きく、心臓モデル本体の視認性を下げる。モバイルで特に邪魔。
- **問題2（優先度高）**：LEAD 波形表示エリアで、波形の下部（R波の足元・ベースライン付近・S波）が
  表示枠の外に切れる。心電図アプリとして波形の欠けは致命的。

### 問題2 の根本原因（実機 375px で数値特定済み）
- 波形の外枠（SVG の親コンテナ `min-h-0 flex-1 px-3 py-4`）の高さ = **136px**（モバイル）。
- SVG が `className="h-full min-h-[220px] w-full"` の **`min-h-[220px]` で 220px に固定**され、
  コンテナを **約100px はみ出す**（SVG 下端 668.7px vs コンテナ下端 569.0px、overflow でクリップ）。
- `preserveAspectRatio="none"` により viewBox(0..360) は SVG 要素 220px 全体へマップされるため、
  コンテナ可視域（≈136px＝viewBox 換算 y ≈ 0〜197）**より下（ベースライン y=205 付近以降）が
  クリップ**される。波形の viewBox 内 Y 範囲は [81.3, 212.7] で、下端 212.7 が切れ目を越える。
- **座標系（viewBox 900×360, baseline 205）内では全誘導が収まっている**（最大双極子 |dipole|≈0.967、
  最大偏位 ≈0.967×`GRAPH_MV_SCALE`(128)=124px → baseline±124 = [81, 329] ⊂ [0,360]）。
  よってこれは**純粋な CSS オーバーフロー問題**であり、波形の値やスケールの計算ミスではない。

## Objective
モバイルを含む全画面幅で、(1) 3D ラベルが心臓モデルの視認性を邪魔しないサイズ／表示にし、
(2) 波形が **どの誘導を選んでも・Play/スクラブのどの位相でも枠内に完全に収まる** ようにする。
波形の値・極性・双極子・投影ロジックは変更しない。

## Scope

### 問題1（3Dラベル）— Option A 確定
- 対象：`NodeMarker` の `<Text fontSize={0.055}>`（SA/AV/His ラベル）と `AnatomicalBoundingHeart`
  の "Apex" `<Text fontSize={0.052}>`。
- **フォントを縮小**（0.055/0.052 → 0.038 程度）し、**モバイル幅（`(max-width: 767px)`）では
  ラベルを非表示**（ノードの球は残す）。`VectorVisualizer` に `window.matchMedia` ベースの小フック
  `useIsMobile()` を追加し、`showLabels={!isMobile}` を `HeartVectorScene` 経由で `NodeMarker` /
  `AnatomicalBoundingHeart` に渡す。`showLabels` が false のときテキストを描画せず球のみ表示。
- SSR/初期レンダでは `isMobile=false`（ラベル表示）を初期値とし、`useEffect` 内で確定させる
  （ちらつき最小化）。

### 問題2（波形クリップ）— 2段構えで恒久保証
**(2-1) CSS オーバーフローの解消（主因の修正）**
- 波形 SVG の `min-h-[220px]` を撤去し、SVG がコンテナ高さちょうどに収まるようにする
  （`preserveAspectRatio="none"` のままなら viewBox 全体が可視域へマップされ、クリップが消える）。
- モバイルで波形が極端に低くならないよう、**最小高さはコンテナ側（波形パネル/セクション）へ移す**
  （例：波形セクションに `min-h-[180px]` 等）か、モバイルのグリッド行配分を波形側に厚くする。
  → SVG は常に「親の高さぴったり」でオーバーフローしない。
- 実機で「SVG 下端 ≤ コンテナ下端」を満たすこと（overflow しない）。

**(2-2) 縦スケールを全12誘導から導出（"どの誘導でも切れない" の保証）**
- Lead II だけ合わせても、誘導により R 波高が違うため他で切れうる（ユーザ指摘）。そこで
  **全12誘導・1周期の投影振幅の全体最大 `globalMaxAbsMv` を算出**し、
  `baseline ± globalMaxAbsMv × scale` が viewBox 高さの安全域（例 上下各 12% マージンを残す）に
  収まるよう `GRAPH_MV_SCALE`（または viewBox 高さ/baseline）を決める。
  - 具体案：`scale = (GRAPH_HEIGHT/2 − margin) / globalMaxAbsMv` を用い、baseline を viewBox 縦中央
    寄り（例 180）に置く。これで**上下対称に最大偏位が収まり**、正・負どちらに大きい誘導
    （II/V4 は上、aVR は下）でも枠内。
  - `globalMaxAbsMv` は `sampleLeadCycle` を全 `LEADS` について回して算出（描画前に一度）。
    モデルが変わっても自動追従するため恒久的に安全。
- `clampGraphY` は保険として残すが、**正常時にクランプが発動しない**（＝設計上そもそも枠内）ことを
  自動検証で保証する。

- **新規：`src/data/ecg/leads/graphScale.ts`（純モジュール・検証と実装でスケール式を共有）**。
  `GRAPH_HEIGHT`(360) / `GRAPH_BASELINE_Y`(=H/2=180) / `GRAPH_VERTICAL_MARGIN`(24) /
  `GRAPH_SAMPLE_COUNT`(240) と、`computeGlobalMaxAbsMv(timeline, leads)` /
  `computeGraphMvScale(timeline, leads)`（= `(H/2−margin)/globalMaxAbsMv`）を export。
  `VectorVisualizer` はこれらを import し、`GRAPH_MV_SCALE = computeGraphMvScale(nsrTimeline, LEADS)`
  を module ロード時に一度算出（12誘導×240点、軽量）。`GRAPH_WIDTH`/`GRAPH_PADDING_X`/`PLOT_WIDTH`
  は水平方向なので従来どおり component 内に残す。
- 改修：`components/VectorVisualizer.tsx`
  - 波形 SVG の `min-h-[220px]` を撤去（→ `className="block h-full w-full"`）。オーバーフロー解消。
  - 縦定数を graphScale から取得（baseline 中央化＋データ駆動スケール）。`clampGraphY` は保険として残す。
  - モバイルのグリッド行配分を波形側に厚く（例 `grid-rows-[minmax(0,0.9fr)_minmax(0,1fr)]`）し、
    波形が読める高さを確保（任意・可読性改善）。
  - `NodeMarker`/`AnatomicalBoundingHeart` に `showLabel` を追加、フォント縮小、`useIsMobile()` 配線。
- 新規：`scripts/verify-graph-fit.mjs`（全誘導・全位相が枠内に収まることの自動検証。graphScale と
  buildTimeline・LEADS を import して独立に再計算）。`package.json` に `verify:graphfit` 追加＋
  `verify:all` へ連鎖追記。

## Out of scope
- 波形の値・極性・形状、双極子（`dipoleDir`）、`evaluateDipole`/`projectLead`、12誘導投影の計算。
- 3D の生理学ロジック（発光タイミング・色・伝導路）。T波グロー（別タスクで対応済み）。
- 誘導ごとの縦スケール正規化（誘導間の相対振幅は保つ＝共通スケールのまま。切れない範囲で全体を
  一律スケールするだけ）。※ 誘導ごと正規化は T8 の方針どおり禁止。
- 3D ラベルの内容変更・多言語化。

## Success criteria
### 自動（客観・必須）
- [ ] `scripts/verify-graph-fit.mjs`（`npm run verify:graphfit`）が exit 0：
  1. 全 `LEADS`（12誘導）× 1周期を N 点サンプルし、`y = baseline − mv×scale` が全点で
     `margin ≤ y ≤ GRAPH_HEIGHT − margin` に収まる（**クランプ未発動＝設計上枠内**）。
  2. `globalMaxAbsMv` に対応する最大偏位点が、上下マージンを侵さない（境界ちょうどで OK ライン）。
  3. 誘導間の相対振幅が保たれている（共通スケール：II の R 偏位 > aVR の |R 偏位| 等、T8 と不整合なし）。
- [ ] `npm run verify:all` が exit 0（既存に回帰なし）。新 verify が `verify:all` に含まれる。
- [ ] `npm run lint`・型チェック・`npm run build` が通る。

### 目視QA（補助・実機モバイル 375px と デスクトップ）
- [ ] モバイル 375px の Conduction で、**波形の全体（R 波の頂点も足元も、S 波も、ベースラインも）が
  枠内に完全表示**され、下部が切れていない。
- [ ] `I〜aVF`・`V1〜V6` を切り替え、**どの誘導でも切れない**（特に II/V4 の高い R、aVR の深い下向き）。
- [ ] Play/スクラブで**どの位相でも**切れない（カーソルが枠内、reveal も枠内）。
- [ ] 3D ラベルがモバイルで心臓本体の視認性を邪魔しない（Option A なら非表示、球は残る）。
- [ ] デスクトップでレイアウト・波形が従来どおり（回帰なし）。3D・Learning/Quiz/Compare も回帰なし。

### 「意図」か「バグ」かの見分け
- 正常：全誘導・全位相で波形が枠内、上下に適度なマージン、誘導間の相対振幅は保持。
- バグ：どれか1誘導/位相で切れる、波形が極端に潰れて読めない、誘導ごとに正規化されて aVR が
  不自然に大きい（T8 違反）。

## Constraints
- **AGENTS.md 準拠**。`VectorVisualizer.tsx` は client component / R3F。
- 依存追加なし（画面幅検出は `window.matchMedia` の小フックで自作。UI ライブラリ追加不可）。
- **共通 mV スケールを維持**（誘導ごと正規化しない＝T8 方針）。全体を一律スケールするのみ。
- 波形の値・双極子・投影には触れない（Out of scope 厳守）。
- `preserveAspectRatio="none"` を維持する場合、縦の潰れ過ぎに注意（コンテナ側 min-height で担保）。

## Edge cases
- 極端に低い画面高（横向きモバイル等）でも、コンテナ min-height により波形が読める最低高を確保。
- `globalMaxAbsMv` がほぼ 0 になる退化ケース（全誘導平坦）で 0 除算しない（下限クランプ）。
- SSR/初期レンダで画面幅未確定の瞬間にラベル表示がちらつかない（初期値の扱い）。
- スクラブ端（0%/100%）・Play 折返しでカーソル/reveal が枠外に出ない。

## Notes for the orchestrator's review pass
- **最重要（問題2）**：CSS オーバーフロー解消（SVG がコンテナをはみ出さない）と、全誘導からの
  スケール導出の**両方**が入っているか。片方だけだと別誘導/別画面で再発する。自動検証項目1が番人。
- 波形の値が無変更か（`git diff` が dipole/projection/timeline に及んでいないこと）。スケール定数と
  レイアウトのみの変更に留まっているか。
- 共通スケール維持（誘導ごと正規化に逃げていないか）。T8 の `verify:leadproj` が引き続き緑か。
- 問題1のモバイル非表示（Option A の場合）で、デスクトップのラベルが壊れていないか。SSR ちらつき。
- クランプ `clampGraphY` が保険として残りつつ、正常時に発動しない設計になっているか（発動＝枠設計
  が不足のサイン）。
- スケール式が `graphScale.ts` に一元化され、component と `verify-graph-fit.mjs` が同じ式を使って
  いるか（二重定義でズレていないか）。
