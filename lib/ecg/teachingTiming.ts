/** Shared timing for the rendered teaching rhythms and their annotations. */
export const MOBITZ2_DROP_EVERY_N_BEATS = 4;
export const WENCKEBACH_CYCLE_BEATS = 4;
export const WENCKEBACH_PR_DELAY_FRACTIONS = [0.22, 0.31, 0.4] as const;
export const AV_BLOCK_P_BPM = 82;
export const AV_BLOCK_ESCAPE_BPM = 35;
export const AV_BLOCK_P_PEAK_OFFSET_MS = 130;
export const AV_BLOCK_QRS_PEAK_OFFSET_MS = 180;
export const AV_BLOCK_ESCAPE_PHASE_OFFSET_MS = 360;

export function isMobitz2DroppedBeat(beatIndex: number): boolean {
  const normalizedIndex =
    ((beatIndex % MOBITZ2_DROP_EVERY_N_BEATS) + MOBITZ2_DROP_EVERY_N_BEATS) %
    MOBITZ2_DROP_EVERY_N_BEATS;
  return normalizedIndex === MOBITZ2_DROP_EVERY_N_BEATS - 1;
}

export function getWenckebachCycleIndex(beatIndex: number): number {
  return (
    ((beatIndex % WENCKEBACH_CYCLE_BEATS) + WENCKEBACH_CYCLE_BEATS) %
    WENCKEBACH_CYCLE_BEATS
  );
}

export function isWenckebachDroppedBeat(beatIndex: number): boolean {
  return getWenckebachCycleIndex(beatIndex) === WENCKEBACH_CYCLE_BEATS - 1;
}

export function getWenckebachPPeakOffsetMs(beatMs: number): number {
  return beatMs * 0.15;
}

export function getWenckebachQrsPeakOffsetMs(
  beatMs: number,
  beatIndex: number
): number | null {
  if (isWenckebachDroppedBeat(beatIndex)) return null;

  const cycleIndex = getWenckebachCycleIndex(beatIndex);
  const prDelayMs = WENCKEBACH_PR_DELAY_FRACTIONS[cycleIndex] * 1000;
  return getWenckebachPPeakOffsetMs(beatMs) + prDelayMs;
}
