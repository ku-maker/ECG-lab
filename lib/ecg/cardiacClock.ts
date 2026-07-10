// 心周期クロックの純ロジック（React 非依存・外部 import ゼロ）。
//
// 「今この瞬間、心周期のどの位相か（phaseMs）」を単一の source of truth にする。
// 時間前進・位相計算・BPM 再スケール・モード遷移をすべてここに置き、フック
// （useCardiacClock）は薄いラッパにする。これにより数式を Node の型ストリップで
// 自動検証できる（scripts/verify-cardiac-clock.mjs）。
//
// すべての関数は副作用なし・イミュータブル（ClockState を破壊せず新値を返す）。

/** EcgCanvas の既存値と一致（タブ復帰時の巨大 delta 吸収）。値の不一致は禁止。 */
export const MAX_FRAME_DELTA_MS = 50;

export type ClockMode = "playing" | "scrubbing";

export type ClockState = {
  mode: ClockMode;
  /** 通し時間（playing で増加）。位相は phaseOf でここから毎回算出する。 */
  elapsedMs: number;
  /** 1心周期長（BPM 由来、常に > 0）。 */
  cycleMs: number;
  bpm: number;
};

/** BPM から心周期長。bpm<=0（VF 等）や非有限は fallbackCycleMs を返す。 */
export function cycleMsFromBpm(bpm: number, fallbackCycleMs: number): number {
  if (!Number.isFinite(bpm) || bpm <= 0) return fallbackCycleMs;
  return 60_000 / bpm;
}

/** 心周期内位相 [0, cycleMs)。負や cycleMs 超も正しく畳む。 */
export function phaseOf(state: ClockState): number {
  const c = state.cycleMs;
  if (!(c > 0)) return 0;
  return ((state.elapsedMs % c) + c) % c;
}

/**
 * playing の1フレーム前進。rawDeltaMs を [0, MAX_FRAME_DELTA_MS] にクランプして加算。
 * タブ復帰などで rawDeltaMs が巨大化しても位相が飛ばない。
 */
export function advance(state: ClockState, rawDeltaMs: number): ClockState {
  const d = Math.max(0, Math.min(rawDeltaMs, MAX_FRAME_DELTA_MS));
  return { ...state, elapsedMs: state.elapsedMs + d };
}

/**
 * BPM 変更。位相の割合 (phase/cycle) を保存するよう elapsedMs を再アンカーし、
 * 変更瞬間に位相が飛ばないようにする。
 */
export function setBpm(
  state: ClockState,
  bpm: number,
  fallbackCycleMs: number
): ClockState {
  const newCycle = cycleMsFromBpm(bpm, fallbackCycleMs);
  const ratioAtChange = state.cycleMs > 0 ? phaseOf(state) / state.cycleMs : 0;
  const cycleIndex =
    state.cycleMs > 0 ? Math.floor(state.elapsedMs / state.cycleMs) : 0;
  const newElapsed = cycleIndex * newCycle + ratioAtChange * newCycle;
  return { ...state, bpm, cycleMs: newCycle, elapsedMs: newElapsed };
}

/**
 * scrubbing：ratio(0..1) を位相として与える。現在の周期カウントを保存し、
 * elapsedMs を同じ周期内で位相に合わせる（巻き戻さない）。
 * ratio=1 は次周期の境界＝phaseOf 0 に折り返す（一貫扱い）。
 */
export function scrubToRatio(state: ClockState, ratio: number): ClockState {
  const r = Math.max(0, Math.min(ratio, 1));
  const c = state.cycleMs;
  const cycleIndex = c > 0 ? Math.floor(state.elapsedMs / c) : 0;
  const newElapsed = cycleIndex * c + r * c;
  return { ...state, elapsedMs: newElapsed };
}

/** モード遷移：mode のみ変更（elapsedMs/cycleMs 不変＝位相連続性の担保）。 */
export function enterScrubbing(state: ClockState): ClockState {
  return { ...state, mode: "scrubbing" };
}

export function enterPlaying(state: ClockState): ClockState {
  return { ...state, mode: "playing" };
}
