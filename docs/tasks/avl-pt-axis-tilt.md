# Task: aVL のフラット解消 — P波・T波軸だけ +60° から微小に振る（QRS は不変）

> 親設計: `docs/tasks/12lead-vector-sync.md`（T3 賦活タイムライン, T8 投影）。
> 種別: モデル精度の改善（生理学的妥当性）。QRS・T5ゲートには触れない。
> **方針確定: P波軸 = 45°、T波軸 = 50°（QRS は +60° のまま）。** 下記の実測に基づく。

## Context（なぜこの変更をするか）
現在の賦活タイムラインは全イベント（P波/septalQ/mainR/terminalS/T波）が同じ +60° 方向
（`DIR_60`）を共有している。aVL 誘導軸（−30°）はこれと直交（角度差 90°）するため、aVL の
投影値が周期を通して**常にゼロ**になり、波形が完全にフラットになる。

実測（現状、全 +60°）：
- **aVL：P=0.0000 / R=0.0000 / T=0.0000**（完全フラット）

これは単一方向双極子モデルの副作用。正常心では P波軸・QRS軸・T波軸は近いが完全一致はせず
（QRS-T angle は正常範囲で概ね数十度以内）、aVL でも P・T にわずかな振れが出るのが自然。
QRS は T5 の Lead II 検証（r≥0.90）を守るため触らず、**P波と T波の向きだけ微小に振る**。

## Objective
P波（atrial イベント）と T波（repol イベント）の `dipoleDir` を +60° から少しだけ振り、
**aVL で P・T に非ゼロの振れ**を出す。QRS（septalQ/mainR/terminalS）は +60° に固定。
aVL の QRS 区間はほぼゼロのまま（正常でも起こりうる臨床的に正しい挙動）。既存の検証群
（T5 Lead II r≥0.90、T8 の aVR 陰性・II/aVF 陽性 等）を全て維持する。

## 提案角度と根拠
- **P波軸 = 45°**（QRS 60° に対し 15° 差）。正常 P波軸は 0〜+75°（平均 ~+50°）であり 45° は妥当。
- **T波軸 = 50°**（QRS 60° に対し **QRS-T angle = 10°**）。正常 T波軸は QRS に近く、前額面
  QRS-T angle は正常で概ね <45°。10° は十分正常範囲。
- 振る向きは **+60° より小さい角度（より水平・左方向）**。これにより aVL（−30°）との角度差が
  90° を下回り、aVL 投影が**小さな正の値**（上向き微小 P・T）になる。正常軸での aVL の低振幅
  上向き P・T と整合。
- 大きく振らない理由：T波振幅（0.30）が大きいため T を振ると **T8 の「I vs aVR z-corr < −0.99」**が
  最も敏感に劣化する（実測：T=50°→−0.9952、T=45°→−0.9911、P=40/T=45→−0.9906）。P=45°/T=50° が
  全検証を余裕で満たす最小構成。

## 実測に基づく再検証の見込み（P=45°, T=50°）
| 指標 | 現状(60°) | 変更後(P45/T50) | 判定 |
|---|---|---|---|
| **aVL P** | 0.0000 | **0.0336** | 非ゼロ化 ✓（本タスクの目的） |
| **aVL T** | 0.0000 | **0.0521** | 非ゼロ化 ✓ |
| aVL R | 0.0000 | 0.0002 | ほぼゼロ維持 ✓（意図どおり） |
| Lead II r（T5） | 0.9678 | **0.9672** | ≥0.90 ✓ |
| II P | 0.130 | 0.126 | >0 ✓（T8） |
| II R / aVF R | 0.967 / 0.838 | 0.967 / 0.837 | >0 ✓（QRS 不変） |
| aVR R | −0.838 | −0.838 | <0 ✓（QRS 不変） |
| aVL |R|/|II R| | 0.000 | 0.000 | ≤0.5 ✓（near-iso 維持） |
| I vs aVR z-corr | −1.0000 | **−0.9952** | <−0.99 ✓（余裕あり） |

→ **既存の T5/T8 検証は全て通る見込み**。I vs aVR が厳密な −1 でなくなるのは、P・T 軸が QRS 軸と
分離する**生理学的に正しい帰結**（実際の I と aVR も完全な鏡像ではない）。

## Scope
- 改修：`src/data/ecg/activation/buildTimeline.ts`
  - `atrial` イベントの `dipoleDir` を +45°方向 `[cos45, −sin45, 0] ≈ [0.7071, −0.7071, 0]` に変更。
  - `repol` イベントの `dipoleDir` を +50°方向 `[cos50, −sin50, 0] ≈ [0.6428, −0.7660, 0]` に変更。
  - QRS 3イベント（septalQ/mainR/terminalS）は `DIR_60` のまま**不変**（T5 ゲート維持）。
  - import-free を保つため、`DIR_60` と同様に角度付き単位ベクトル定数（例 `DIR_P_45`/`DIR_T_50`）を
    コメント（角度と根拠）付きで定義。全て単位ベクトル（norm=1）を維持。
- 改修：`scripts/verify-lead-projection-all.mjs`（T8）に **aVL の P・T 非ゼロ**を追加検証（下記）。
  併せて aVL R の near-iso 維持も引き続き確認。
- **波形の他の側面・3D・双極子の大きさ（peakMag）・タイムライン時刻は変更しない。**

## Out of scope
- QRS の向き（septalQ/mainR/terminalS = +60°）。T5 ゲート（Lead II 投影 r≥0.90、S谷 biphasic）。
- 3D 発光（`evaluateSegments` は包絡のみ使用し dipoleDir を使わない＝影響なし）・伝導路・T波グロー。
- 胸部誘導 V1–V6 の精度（v2 `12lead-precordial-accuracy`）。単一方向モデルの他の限界
  （I≡III≡V6 等の同一波形）は本タスクの対象外。
- P波・T波の**大きさ**（peakMag 0.13 / 0.30）の変更。今回は向きのみ。

## Success criteria
### 自動（客観・必須）
- [ ] `verify:leadproj`（T8）に追加した assert が通る：
  1. **aVL 非ゼロ化**：`|projectLeadValue(aVL, pPeak)| > 0.02` かつ `|projectLeadValue(aVL, tPeak)| > 0.02`
     （P・T に振れが出た）。実測見込み 0.034 / 0.052。
  2. **aVL QRS は near-iso 維持**：`|projectLeadValue(aVL, r)| ≤ 0.5 × |projectLeadValue(II, r)|`（従来どおり）。
- [ ] 既存 `verify:leadproj` の全項目維持：Lead II r≥0.90、aVR R<0、II/I/aVF R>0、II P>0、
  |aVR R|<|II R|、**I vs aVR z-corr < −0.99**（実測見込み −0.9952）。
- [ ] `verify:projection`（T5 ハーネス）が exit 0（Lead II r=0.9672 ≥0.90、注入バグは exit 1 維持）。
- [ ] `verify:activation`（T3）が exit 0（全 dipoleDir の norm≈1 維持）。
- [ ] `npm run verify:all` が exit 0（回帰なし）。`lint`・型チェック・`build` が通る。

### 目視QA（補助）
- [ ] `vector` モードで aVL を選択すると、**P波と T波に小さな上向きの振れ**が見える（完全フラットでない）。
- [ ] aVL の QRS 区間はほぼ平坦のまま（意図どおり・臨床的に正常）。
- [ ] 他誘導（II/aVR 等）の見た目が実質変わっていない（P/T の微小変化のみ）。

## Constraints
- **AGENTS.md 準拠**。依存追加なし。純ロジック検証は Node 型ストリップ。
- QRS 3イベントの `dipoleDir` を変えない（T5 ゲート厳守）。
- `dipoleDir` は単位ベクトルを維持（`verify:activation` の norm チェック）。
- 向きのみ変更、`peakMag`・時刻・envelope は不変。
- **I vs aVR z-corr の閾値（−0.99）は据え置き**で通ることを確認（実測 −0.9952）。もし将来 tilt を
  増やして閾値に触れる場合は、閾値変更前に必ず司令塔レビュー（生理学的分離の帰結として妥当かを判断）。

## Edge cases
- 角度定数の丸め（cos/sin の桁）で norm がわずかに 1 を外れないよう、`axisFromAngle` と同じ式で
  算出した値を使う（または実装時に `Math.cos/sin` で計算した定数を用いる）。
- aVL P/T の非ゼロ閾値（0.02）は実測（0.034/0.052）に対し十分マージンがあるが、将来 peakMag を
  下げた場合に割れないか留意。
- I vs aVR z-corr が −0.99 に対して薄マージン（−0.9952）である点。実装後に必ず実値を記録する。

## Notes for the orchestrator's review pass
- **最重要**：QRS 3イベントの `dipoleDir` が `DIR_60` のまま**触られていない**か（T5 ゲートの生命線）。
  `git diff` で septalQ/mainR/terminalS の dir が不変であることを確認。
- 変更後の実測値（特に Lead II r と I vs aVR z-corr）が本仕様の見込み（0.9672 / −0.9952）と一致するか。
  ズレる場合は角度計算の符号/式を疑う。
- aVL の P・T が非ゼロ・QRS が near-iso、の両立ができているか（項目1・2 の番人）。
- dipoleDir が単位ベクトルのままか（`verify:activation` 緑）。
- 3D（発光）に影響が出ていないか（dipoleDir は 3D 発光に不使用のはず。念のため目視）。
