# Task: T6 心周期クロック（useCardiacClock）

> 親設計: `docs/tasks/12lead-vector-sync.md` の §3「状態同期 / 単一の心周期クロック」。
> 前提: T1〜T5 完了（特に T3 `cycleMs`、T4 評価関数が `phaseMs` を消費する）。
> 後続: T7（3D発光）・T8（波形）・T9（統合）がこのクロックの `phaseMs` を購読する。

## Objective
「今この瞬間、心周期のどの位相か」を表す **単一の source of truth** を提供する。波形（多誘導）と3Dアニメーションが同じ `phaseMs` を読むことで構造的に同期する。現在 `VectorVisualizer` にある分離した `progress` useState と、`EcgCanvas` の独立した `elapsedMs` の二重管理を、この共通クロックに置き換える土台を作る（実際の置換配線は T7〜T9）。

## 設計の分割：純ロジック ＋ 薄いフック
自動検証を成立させるため、**時間前進・位相計算・BPM再スケールの純粋関数**を React 非依存で切り出し、フックはそれを呼ぶ薄いラッパにする。

- `lib/ecg/cardiacClock.ts` … **純ロジック（React 非依存・外部 import ゼロ）**。node で検証。
- `lib/ecg/useCardiacClock.ts` … `"use client"` の React フック（`useState`/`useRef`/`requestAnimationFrame`）。純ロジックを呼ぶだけ。

## Scope
- 新規作成：`lib/ecg/cardiacClock.ts`（純ロジック）
  ```ts
  export const MAX_FRAME_DELTA_MS = 50; // EcgCanvas の既存値に合わせる（タブ復帰時の飛び吸収）

  export type ClockState = {
    mode: "playing" | "scrubbing";
    elapsedMs: number; // 通し時間（playing で増加）
    cycleMs: number;   // 1心周期長（BPM 由来）
    bpm: number;
  };

  // BPM から心周期長。bpm<=0（VF等）は fallbackCycleMs を返す。
  export function cycleMsFromBpm(bpm: number, fallbackCycleMs: number): number;

  // playing の1フレーム前進。rawDeltaMs を MAX_FRAME_DELTA_MS でクランプして加算。
  export function advance(state: ClockState, rawDeltaMs: number): ClockState;

  // BPM 変更。elapsedMs は保持しつつ cycleMs を再計算する（位相の連続性は phaseOf で担保）。
  export function setBpm(state: ClockState, bpm: number, fallbackCycleMs: number): ClockState;

  // scrubbing: ratio(0..1) を phase として与える。現在の周期カウントを保存し
  // elapsedMs を同じ周期内で位相に合わせる（巻き戻さない）。
  export function scrubToRatio(state: ClockState, ratio: number): ClockState;

  // モード遷移（elapsedMs/cycleMs は不変、mode のみ変更）。位相連続性の担保。
  export function enterScrubbing(state: ClockState): ClockState;
  export function enterPlaying(state: ClockState): ClockState;

  // 心周期内位相 [0, cycleMs)。負や cycleMs 超も正しく畳む（((e % c)+c)%c）。
  export function phaseOf(state: ClockState): number;
  ```
- 新規作成：`lib/ecg/useCardiacClock.ts`（フック）
  - `useCardiacClock({ bpm, cycleMs })` を提供。`mode` の切替（playing/scrubbing）、RAF ループ（playing 時のみ）、`phaseMs` の公開、`scrubTo(ratio)` / `play()` / `pause()` / `setBpm(bpm)` を返す。
  - RAF の delta は `performance.now()` 差分を `advance` に渡す（クランプは純ロジック側）。
  - **このフックは T6 では VectorVisualizer に配線しない**（T9 で配線）。単体で成立させ、既存挙動を壊さない。
- 新規作成：`scripts/verify-cardiac-clock.mjs`（純ロジックの自動検証）
- `package.json` に `"verify:clock": "node scripts/verify-cardiac-clock.mjs"` を追加。

## 位相の連続性（BPM 変更時の肝）
- **要件**：BPM を変えても `phaseMs` が不連続にジャンプしない（親設計 Edge cases）。
- 実装方針：位相は `elapsedMs` を基準に `phaseOf` で毎回計算する。`setBpm` は `cycleMs` のみ変更し `elapsedMs` は保持。→ 変更瞬間、位相は `elapsedMs % old` から `elapsedMs % new` に変わり得るため、**「変更時点の位相比 (phase/cycle) を保つよう `elapsedMs` を再アンカーする」**方式を採用：
  ```
  ratioAtChange = phaseOf(state) / state.cycleMs
  newCycle = cycleMsFromBpm(bpm, fallback)
  newElapsed = <直近の周期境界> + ratioAtChange * newCycle
  ```
  こうすると位相の割合が保存され、見た目のジャンプが出ない。**検証項目でこれを assert する。**

## モード遷移時の位相連続性（BPM 変更と同格の要件）
再生⇄手動スクラブの遷移でも位相の不連続が起きうる。BPM 変更と同じく**具体式＋数値 assert** で担保する。

- **playing → scrubbing（掴んだ瞬間）**：`mode` を切り替えるだけでは `elapsedMs` を触らないので `phaseOf` は不変であること。掴んだ瞬間に波形カーソル／3D発光が飛ばない。
  ```
  before = phaseOf(state)            // playing 中
  next   = enterScrubbing(state)     // mode 変更のみ、elapsedMs 保持
  assert phaseOf(next) === before
  ```
  実装：`enterScrubbing(state)` は `{ ...state, mode: "scrubbing" }` を返すのみ（`elapsedMs`/`cycleMs` 不変）。

- **scrubbing 中のドラッグ**：`scrubToRatio` は **現在の周期カウントを保存**して位相だけ差し替える（再開時に前方へ連続して進めるため、`elapsedMs` を巻き戻さない）：
  ```
  cycleIndex = floor(state.elapsedMs / state.cycleMs)
  newElapsed = cycleIndex * state.cycleMs + ratio * state.cycleMs
  ```
  これで `phaseOf === ratio*cycleMs` を満たしつつ、`elapsedMs` は同じ周期内に留まる。

- **scrubbing → playing（離した瞬間）**：`mode` を playing に戻すだけで `elapsedMs` は保持。復帰直後の `phaseOf` はスクラブ最終位置と一致し、次の `advance(delta)` は **delta 分だけ**進む（ジャンプしない）。
  ```
  atRelease = phaseOf(state)                       // scrub 最終位置
  playing   = enterPlaying(state)                  // mode 変更のみ
  assert phaseOf(playing) === atRelease
  stepped   = advance(playing, d)                  // d <= MAX_FRAME_DELTA_MS
  assert phaseOf(stepped) === (atRelease + d) mod cycleMs   // 許容 1e-6
  ```
  実装：`enterPlaying(state)` は `{ ...state, mode: "playing" }` を返すのみ。**RAF 再開時の最初のフレームで巨大 delta を渡さない**（`performance.now()` の基準時刻を復帰時にリセットする）ことをフック側で担保する。

`cardiacClock.ts` に `enterScrubbing(state)` / `enterPlaying(state)` を追加 export する。

## Out of scope
- `VectorVisualizer` / `EcgCanvas` への実配線（T7〜T9）。T6 は独立モジュールの新設のみ。
- `EcgCanvas` の既存 RAF ロジックの置換（本 MVP では EcgCanvas 本体を触らない。親設計 Scope 参照）。
- 波形・3D 描画。

## Success criteria
- [ ] `cardiacClock.ts`（外部 import ゼロ）と `useCardiacClock.ts`（フック）が作成される。
- [ ] `scripts/verify-cardiac-clock.mjs` が下記を assert、1つでも外れたら exit 1。`npm run verify:clock` が exit 0：
  1. `cycleMsFromBpm(60, F)===1000`、`cycleMsFromBpm(120, F)===500`、`cycleMsFromBpm(0, 800)===800`（fallback）。
  2. `advance` の delta クランプ：`rawDeltaMs=500` を渡しても `elapsedMs` の増分は `MAX_FRAME_DELTA_MS`（=50）を超えない。
  3. `phaseOf` の畳み込み：`elapsedMs=2500, cycleMs=1000` → `phaseMs===500`。負値 `elapsedMs=-100, cycleMs=1000` → `900`。
  4. **BPM 変更で位相ジャンプなし**：ある `elapsedMs` で `phase/cycle` を記録 → `setBpm` 直後の `phase/cycle`（位相割合）が変更前と ≈ 一致（許容 1e-6）。
  5. `scrubToRatio(state, 0.25)` 後、`phaseOf/cycleMs ≈ 0.25`。端値 `ratio=0`,`ratio=1` で NaN が出ず、`1` は `0`（折返し）または `cycleMs-ε` の一貫した扱い。
  6. 連続 `advance` を多数回まわしても `elapsedMs` が単調増加、`phaseOf` が `[0,cycleMs)` に常に収まる。
  7. **playing→scrubbing 連続性**：`enterScrubbing(state)` 前後で `phaseOf` が厳密一致（掴んだ瞬間ジャンプなし）。
  8. **scrubbing→playing 連続性**：`enterPlaying(state)` 直後の `phaseOf` がスクラブ最終位置と一致し、続く `advance(d)`（`d=16`）で `phaseOf` が `(atRelease + 16) mod cycleMs` に ≈ 一致（許容 1e-6、突然の飛びなし）。
  9. **scrub 中の周期保存**：`elapsedMs=2400, cycleMs=1000`（周期index=2）で `scrubToRatio(state, 0.1)` → `elapsedMs===2100`（周期index=2 を保持、`phaseOf===100`）。巻き戻り（index 減少）が起きない。
- [ ] （補助・手動可）フックを使った最小デモで playing/scrubbing 切替が動く。単独の合否基準にはしない。
- [ ] `npm run lint` と型チェックが通る。

## Constraints
- **AGENTS.md 準拠**：フックの RAF 実装前に `node_modules/next/dist/docs/` の client component / effect 周りのガイドを確認。
- 依存追加なし。純ロジック検証は Node 型ストリップ実行。
- `MAX_FRAME_DELTA_MS` は EcgCanvas の既存値（50）と一致させる（`components/EcgCanvas.tsx` 参照）。将来的な共通化は任意だが、値の不一致は禁止。
- RAF は playing 時のみ回す（scrubbing 中や pause 中は回さない＝無駄な再描画防止）。
- 純ロジックは副作用なし・イミュータブル（`ClockState` を破壊せず新値を返す）。

## Edge cases
- タブ非アクティブ→復帰で `performance.now()` 差分が巨大化 → `advance` のクランプで吸収（項目2）。
- `bpm<=0`（VF）で `cycleMs` が 0 や Infinity にならず fallback を使う（項目1）。
- scrubbing→playing 復帰時、`elapsedMs` が scrub 位置から連続して進む（ジャンプしない）。→ §モード遷移時の位相連続性で具体式・数値 assert 化済み（項目7〜9）。
- `ratio=1` の折返し扱いを一貫させる（`phaseMs===cycleMs` を許さず 0 に畳むか、直前値に留める）。

## Notes for the orchestrator's review pass
- **最重要**：BPM 変更時の位相再アンカー（項目4）、および再生⇄スクラブ遷移の位相連続性（項目7〜9）。この3種の遷移（BPM 変更／掴む／離す）はいずれも「位相が飛ばない」ことが要件で、同格に扱う。特に scrub→play 復帰時、RAF 基準時刻をリセットせず巨大 delta を渡すと項目8の意図（delta 分だけ進む）が壊れる。フック側の `performance.now()` 基準リセットを実コードで確認。
- 二重管理の温床：T6 時点ではフックを配線しないが、T9 で `progress` useState と EcgCanvas `elapsedMs` のどちらを廃止しこのクロックへ寄せるか、方針コメントを残しておくと T9 が楽。
- 純ロジックとフックの責務分離ができているか（フックに数式が漏れていないか）。漏れていると node 検証の網から外れる。
- `MAX_FRAME_DELTA_MS` が EcgCanvas と数値一致しているか。
