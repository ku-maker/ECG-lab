# Task: Conduction モードの表示調整3件（波形サイズ / View angle バッジ / 3D視認性）

> 親設計: `docs/tasks/12lead-vector-sync.md`, `docs/tasks/mobile-layout-fixes.md`。
> 種別: 表示（レイアウト/CSS/描画パラメータ）調整のみ。**生理学ロジック・波形の値・双極子・
> 投影・賦活タイムラインには一切触れない。**
> 位置づけ: 実機レビューで見つかった3件の微調整。**本ドキュメントは提案（案の提示）。実装前に
> 各案の値を確定する。**

## Context
実機で気になった3点（生理学ロジックは変更しない）：
1. LEAD 波形が大きすぎる（前回のクリップ修正で枠いっぱいに広げたので少し詰めたい）。
2. 3D 上部の「View angle: Lead X-like」バッジ（暗い角丸の帯）が心臓モデルに重なって邪魔。
3. 心臓モデル本体と伝導路チューブが薄く見えにくい。特に Rest（非発光）でワイヤフレームがほぼ見えない。

---

## 【1】LEAD 波形を少し小さく

### 現状
- `src/data/ecg/leads/graphScale.ts`：`GRAPH_HEIGHT=360`、`GRAPH_VERTICAL_MARGIN=24`。
- スケールは `(H/2 − margin) / globalMaxAbsMv` = `(180−24)/0.9663`。最大偏位 = 156px で、波形は
  viewBox の **[24, 336]（縦の約87%）** を占める＝枠いっぱい。

### 対応案（`GRAPH_VERTICAL_MARGIN` を上げるだけ。全誘導共通スケールなので切れは起きない）
| 案 | margin | usableHalf | 最大偏位 | 波形が占める縦割合 |
|---|---|---|---|---|
| 現状 | 24 | 156 | 156px | 87% |
| **A（推奨）** | **54** | 126 | 126px | **70%** |
| B（控えめ） | 42 | 138 | 138px | 77% |
| C（もっと詰める） | 66 | 114 | 114px | 63% |

- 推奨は **A（margin=54, 約70%）**。「少し詰める」に対して自然な余白。強すぎず弱すぎず。
- **自動検証は追従する**：`verify:graphfit` は margin を import して再計算するため、値を変えても
  「全誘導が [margin, H−margin] 内・usableHalf を満たす」検証はそのまま通る（切れ保証は維持）。
- 変更ファイル：`graphScale.ts` の `GRAPH_VERTICAL_MARGIN` 1 定数のみ。

---

## 【2】「View angle: Lead X-like」バッジがモデルに重なる

### 現状
- `components/VectorVisualizer.tsx` の3Dペイン左上オーバーレイ（`absolute top-4 left-4`）内、
  "Conduction Map" / "刺激伝導マップ" 見出しの下に配置。
- バッジ本体：`rounded-md border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 font-mono text-[10px]`
  ＝**塗り+枠のある暗めの角丸帯**。心臓は概ねペイン中央にあり、この帯が心臓に被る。

### 対応案（ユーザ提案の「移動」or「透明度を下げる」を具体化）
- **Option A（推奨）— 帯をやめて素のテキストに（＝"暗い帯"を消す）**：`bg-cyan-300/10` と
  `border` を外し、低不透明度の mono テキストのみ（例 `text-cyan-200/60`）にする。位置は左上のまま。
  「暗い角丸の帯が邪魔」という主訴を最小変更で直接解消。
- **Option B — 位置をモデル外へ移動**：バッジだけを3Dペインの**右上**（`absolute top-4 right-4`）
  または**左下**（`bottom-4 left-4`）に出す。心臓は中央〜やや上なので隅は被りにくい。左上の
  情報スタック（Conduction Map 見出し・免責文）はそのまま。
- **Option C — A+B**：右上へ移動 かつ 帯を薄く（塗りを更に下げる）。
- 補足：この「View angle: Lead X」は下部のリード選択（"Lead-like view" ＋ 選択中リード表示）と
  情報が重複しているので、視認性優先で弱めても情報は失われない。
- 推奨は **A**（帯を消して素テキスト化）。効果的で最小変更。足りなければ B（右上へ移動）を併用。

---

## 【3】心臓モデル・伝導路チューブが薄い（特に Rest）

### 現状
- ワイヤフレーム心臓（`AnatomicalBoundingHeart` の mesh）：`opacity={0.2}`、
  `emissiveIntensity={0.08}`、`color="#7f1d1d"`、`emissive="#450a0a"`。
- 中心の伝導ライン（`Line`）：`opacity={0.22}`、`lineWidth={1.2}`。
- 伝導路チューブ（シェーダ）：Rest（`uActive=0`）では `intensity=0` → 色は `baseColor =
  vec3(0.10,0.14,0.15)`（暗いティール）、`alpha = baseAlpha = 0.24`。＝ほぼ見えない。
- 照明：`ambientLight intensity={0.72}`、pointLight ×2（cyan 5.2 / pink 2.2）。

### 対応案（不透明度・発光・照明を上げる方向。値は初期提案で、実装時に目視で微調整）
| 対象 | 現状 | 提案（推奨初期値） |
|---|---|---|
| ワイヤフレーム心臓 opacity | 0.2 | **0.38** |
| ワイヤフレーム emissiveIntensity | 0.08 | **0.2** |
| 中心伝導ライン opacity | 0.22 | **0.42** |
| チューブ Rest 明度 `baseColor` | vec3(0.10,0.14,0.15) | **vec3(0.20,0.26,0.28)** |
| チューブ Rest 不透明度 `baseAlpha` | 0.24 | **0.40** |
| ambientLight intensity | 0.72 | **0.9** |

- 狙い：**Rest でもワイヤフレームと伝導路が「うっすら」ではなく「はっきり」見える**。発光時の
  演出（脱分極ピンク/紫・再分極シアン）は上に乗るので相対コントラストは保たれる。
- これらは互いに影響するので、**実装時に上記を出発点に目視で1〜2段調整**する前提。
- 変更ファイル：`VectorVisualizer.tsx`（`AnatomicalBoundingHeart` のマテリアル、`Line`、
  `conductionFragmentShader` の baseColor/baseAlpha、`ambientLight`）。**シェーダのパルス/均一
  グローのロジック（uActive/uUniform/uGlow の演算）は変えない**——Rest の見え方（定数）だけ。

---

## Out of scope（全項目共通）
- 生理学ロジック（賦活タイムライン・双極子・投影・T波グローの逆走廃止・P/T軸 tilt 等）。
- 波形の値・極性・形状、誘導ごとの相対振幅（共通スケール維持）。
- 3D の伝導路の形状・セグメント割当・発光タイミング。
- 色パレットの再設計（recovery シアン等の色相自体は変えない。明度/不透明度のみ）。

## Success criteria
### 自動（客観）
- [ ] 【1】`verify:graphfit` が exit 0（margin 変更後も全誘導が枠内・usableHalf を満たす）。
- [ ] `verify:all`・`lint`・型チェック・`build` が全て緑（回帰なし）。波形の値検証（`verify:leadproj`
  等）は無変更で緑のまま（描画パラメータのみの変更で投影値に影響しないこと）。

### 目視QA（本タスクの主判定 — CLAUDE.md 準拠の注記）
> 【2】【3】は純粋な見た目調整で、自動検証は「壊れていない（build/regression 緑）」までしか
> 担保できない。**最終的な"見やすさ・邪魔でない"はユーザの実機目視で確定**する（自動化不可を明示）。
- [ ] 【1】波形が枠いっぱいでなく適度な余白を持ち、かつ**どの誘導でも切れない**（自動保証済み）。
- [ ] 【2】「View angle」バッジが心臓モデルに被って邪魔に見えない。
- [ ] 【3】Rest 状態でワイヤフレームと伝導路チューブがはっきり見える。発光時の演出は従来どおり。
- [ ] モバイル・デスクトップ両方で確認。Learning/Quiz/Compare 回帰なし。

## Notes for the orchestrator's review pass
- 3項目とも**描画パラメータ（定数）のみ**の変更に留まっているか。`git diff` が波形値/双極子/投影/
  タイムライン/シェーダ演算ロジックに及んでいないこと。
- 【1】margin 変更で `verify:graphfit` が自動追従して緑か。
- 【3】Rest 明度を上げても、発光時（脱分極/再分極）のコントラスト・演出が損なわれていないか
  （目視）。baseColor/baseAlpha はあくまで下地。
- 【2】バッジ変更で情報が失われていないか（下部リード選択と重複なので実害なし、を確認）。

## 決定待ち（着手前にユーザ確認）
- 【1】margin の案（A=54 推奨 / B=42 / C=66）。
- 【2】バッジの案（A=素テキスト化 推奨 / B=右上へ移動 / C=両方）。
- 【3】提案初期値で着手し、実装後に目視で微調整（値の最終確定は実機確認時）。この方針で良いか。
