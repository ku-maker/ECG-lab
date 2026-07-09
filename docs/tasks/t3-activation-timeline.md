# Task: T3 賦活タイムライン（型定義＋NSR定義）

> 親設計: `docs/tasks/12lead-vector-sync.md` の §1「賦活タイムライン」。
> 前提: T1（`lib/ecg/easing.ts`）・T2（`src/data/ecg/leads/leadAxes.ts`）完了済み。
> 後続: T4（評価関数 `evaluateDipole`/`evaluateSegments`）がこのデータを消費する。

## Objective
心周期を「賦活イベントの列」として1本のタイムラインで表現するデータ構造（`types.ts`）と、その NSR 実体（`nsr.ts`）を定義する。これが3D発光・双極子・12誘導波形すべての **single source of truth** になる。T3 は**データ定義のみ**で、評価ロジック（総和や包絡計算）は T4 に置く。

## T5 で判明した biphasic 要件をどう反映したか（このタスクの肝）

T5 検証で、P/QRS/T を各1個のイベントで表す最小構成では Lead II 投影が `r=0.8885` と閾値 0.90 を僅かに下回ることが判明した（nsr の Q波・S波の陰性偏位を再現できないため）。中隔Q→主R→終末S の biphasic を入れると `r=0.9678` へ改善し、ゲートを余裕で通過した。

この結果を **T3 のデータ構造に恒久的に組み込む**：

- **QRS を単一イベントにしない。** 心室脱分極を3つの `ActivationEvent` に分割する：
  - `septalQ` — 中隔脱分極。主Rに対して**逆向き**の寄与（小）。
  - `mainR` — 主心室脱分極。平均電気軸（+60°方向）に沿う大振幅。
  - `terminalS` — 終末脱分極。主Rに対して**逆向き**の寄与（小）。
- 「逆向き」は `dipoleDir` を反対向きベクトルにするか、`dipolePeakMag` を負にするかのどちらかで表現する。**本タスクでは `dipolePeakMag` を負値**にして表す（`dir` は全イベント +60°系で統一し、符号だけで前後の振れを表現 → T4 の総和が素直になる、T5 ハーネスと同方式）。
- これは「QRS の間、合成双極子ベクトルが中隔Q方向→主R方向→終末S方向へ**回転**する」ことのデータ表現。単一固定ベクトルより一段リッチだが、双極子が心周期内で向きを変える設計（親設計 §1）の範囲内。
- **根拠は T5 の実測**（`r: 0.8885 → 0.9678`）であり、この分割を省くと T5 ゲートが再び落ちる。`nsr.ts` のコメントにこの因果（「省略すると T5 が r<0.90 で落ちる」）を明記し、将来の安易な単純化を防ぐ。

## Scope
- 新規作成：`src/data/ecg/activation/types.ts`
  ```ts
  export type ConductionSegmentId =
    | "saAtrial" | "avDelay" | "hisBundle"
    | "rightBundle" | "leftAnterior" | "leftPosterior"
    | "septalPurkinje" | "ventRepol";

  export type ActivationEvent = {
    id: string;                 // 一意名（"atrial","septalQ","mainR","terminalS","repol" 等）
    segment: ConductionSegmentId; // 3D発光の対応セグメント
    centerMs: number;           // 包絡の中心時刻
    sigmaMs: number;            // 包絡の幅（Gaussian の σ）
    dipoleDir: [number, number, number]; // 単位ベクトル（フレームは T2 と同一）
    dipolePeakMag: number;      // ピーク振幅（負値で逆向き＝biphasic の Q/S を表現）
    contributesToWave: boolean; // avDelay は false（電気的に静かな PR 区間）
  };

  export type ActivationTimeline = {
    templateId: string;  // 対応する BeatTemplate.id（"nsr-lead2-v0"）
    cycleMs: number;     // 1心周期長（BeatTemplate.durationMs と一致）
    events: ActivationEvent[];
  };
  ```
  - **外部 import ゼロ**（T2 同様、Node 型ストリップで検証可能にするため）。
- 新規作成：`src/data/ecg/activation/nsr.ts`
  - `nsr-lead2.json` の `fiducialsMs` と `durationMs` を **import して算出**し、`ActivationTimeline` を構築する（数値ハードコード禁止＝二重管理防止）。
  - JSON import は既存コード（`src/data/ecg/templates.ts` 等）と同じ Next 経由の import 方式でよい（本番アプリ用）。**ただし検証スクリプトは JSON を fs で読む**（§Success criteria）。
  - イベント一覧（T5 ハーネス `scripts/verify-lead2-projection.mjs` で検証済みの構成を踏襲）：
    | id | segment | center | sigma | dir | peakMag | wave |
    |---|---|---|---|---|---|---|
    | atrial | saAtrial | `pPeak` | `(pOff-pOn)/2.4` | +60° | +0.13 | true |
    | avDelay | avDelay | `(pOff+qrsOn)/2` | `(qrsOn-pOff)/2` | +60° | 0 | **false** |
    | septalQ | septalPurkinje | `q` | 10 | +60° | **−0.18** | true |
    | mainR | septalPurkinje | `r` | `(qrsOff-qrsOn)/5.5` | +60° | +1.0 | true |
    | terminalS | septalPurkinje | `s` | 12 | +60° | **−0.22** | true |
    | repol | ventRepol | `tPeak` | `(tEnd-qrsOff)/5.0` | +60° | +0.30 | true |
    - 「+60°」= T2 の `axisFromAngle(60)` = `[0.5, -0.8660254, 0]`（正規化済み定数として持つ。leadAxes を import してもよいが、activation を import-free に保つなら定数を明記コメント付きで直書き）。
    - His束・脚（`hisBundle`/`rightBundle`/`leftAnterior`/`leftPosterior`）は 3D 発光専用セグメントで、MVP の**波形寄与は mainR に集約**する（別イベント化は任意。過剰分割しない）。3D 発光タイミングは T4/T7 で `septalPurkinje` の窓に同期させる。
- 改修なし（VectorVisualizer は T7 まで触らない）。
- 新規作成：`scripts/verify-activation-nsr.mjs`（自動検証。§Success criteria）
- `package.json` に `"verify:activation": "node scripts/verify-activation-nsr.mjs"` を追加。

## Out of scope
- `evaluateDipole` / `evaluateSegments`（総和・包絡評価）は **T4**。T3 はデータ定義のみ。
- NSR 以外のリズムのタイムライン（別タスク `12lead-arrhythmia-timelines`（仮））。
- 波形の実描画・3D配線・クロック（T6〜T8）。
- 胸部誘導精度（v2）。
- **QRS 内の双極子回転角の精緻化（意図的簡略化）。** 本タスクでは `septalQ`/`terminalS` を主R（+60°）と**同一軸上の符号反転（=180°正反対）**として表す（`dir` は全て +60°、`dipolePeakMag` の符号のみで前後の振れを表現）。これは意図的な簡略化であり、実際の中隔脱分極ベクトルは主Rに対して180°ではなく別方向を向く。QRS 中の双極子が真に多方向へ回転する（中隔Q・終末S に固有の3D方向を与える）モデル化は、精緻化が必要になった時点で別タスク `12lead-qrs-vector-loop`（仮）として切り出す。T5 ゲート（Lead II 投影 r≥0.90）は本簡略化で通過することを実測済み。

## Success criteria
- [ ] `types.ts`・`nsr.ts` が作成され、`types.ts` は外部 import ゼロ。
- [ ] `nsr.ts` が fiducials を **import 由来で算出**し、時刻の生数値をハードコードしていない（`grep` で `120|240|360|460|640|820` 等の直書きが無いこと）。
- [ ] `scripts/verify-activation-nsr.mjs` が下記を assert し、1つでも外れたら exit 1。`npm run verify:activation` が exit 0：
  1. `cycleMs === nsr-lead2.json.durationMs`。
  2. イベントが6件、うち `avDelay` のみ `contributesToWave===false`。
  3. **biphasic 検証**：`septalQ` と `terminalS` の `dipolePeakMag < 0`、`mainR > 0`。かつ `|mainR| > |septalQ|` かつ `|mainR| > |terminalS|`（主Rが支配的）。
  4. 各イベントの `centerMs` が対応 fiducial と一致（`atrial.center===pPeak`, `mainR.center===r`, `septalQ.center===q`, `terminalS.center===s`, `repol.center===tPeak`）。
  5. すべての `dipoleDir` がノルム≈1（許容 1e-9）。
  6. イベントが `centerMs` 昇順で心周期 `[0, cycleMs]` に収まる。
- [ ] `npm run lint` と型チェックが通る。
- [ ] （補助）`npm run verify:projection`（T5 ハーネス）が引き続き exit 0 で、T3 の構成が T5 の検証済み前提と矛盾しないこと。

## Constraints
- **AGENTS.md 準拠**。JSON import 方式は既存 `templates.ts` に倣う。
- 依存追加なし。検証は Node 型ストリップ実行（`types.ts` を相対 import、JSON は fs 読み）。
- 数値の single source は `nsr-lead2.json`。fiducials 由来で算出する。
- biphasic 分割（septalQ/mainR/terminalS）を省略しないこと（T5 ゲートが落ちる）。

## Edge cases
- `avDelay` の中心・幅が pOff〜qrsOn の窓を外れないこと（負幅にならない）。
- fiducial が欠損（`undefined`）の場合の扱い：NSR テンプレートは全 fiducial を持つ前提だが、`q`/`s` が無いテンプレートへ将来流用する際に備え、`nsr.ts` では明示 assert（無ければ throw）しておく。
- `sigmaMs` が 0 以下にならないこと（`(qrsOff-qrsOn)/5.5` 等が正になることを assert）。

## Notes for the orchestrator's review pass
- **最重要**：biphasic 3分割が入っているか、かつその根拠（T5 の `r:0.8885→0.9678`）が `nsr.ts` のコメントに残っているか。ここを後で「1イベントに単純化」されると T5 が静かに落ちる。
- 時刻の生数値ハードコードが無いか（`grep`）。二重管理は fiducials 変更時の不整合の温床。
- His/脚を別イベントにしなかった判断（波形寄与を mainR に集約）が、後続 T7 の 3D 発光同期の妨げにならないか（発光は `septalPurkinje` 窓に紐づける方針で足りるか）レビューで確認。
- `dipoleDir` を全 +60° 統一・符号で前後を表す方式（T5 ハーネス同方式）になっているか。`dir` 反転方式と混在していないか。
- `septalQ`/`terminalS` の「主Rと180°正反対」は**意図的簡略化**（Out of scope 参照）。この扱いが v2 の QRS ベクトルループ精緻化タスクへ引き継げるようコメントが残っているか。将来この角度を本物にする際、ここが簡略化ポイントだったと辿れること。
