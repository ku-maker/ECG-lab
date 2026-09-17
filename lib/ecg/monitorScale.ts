/** Digital monitor units. Grid and calipers must use the same transform as the signal. */
export type MonitorScale = {
  width: number;
  height: number;
  visibleMs: number;
  baselineY: number;
  pxPerMv: number;
};

export const SMALL_BOX_MS = 40;
export const SMALL_BOX_MV = 0.1;

export function gridSpacing(scale: MonitorScale) {
  return {
    x: scale.width * SMALL_BOX_MS / scale.visibleMs,
    y: scale.pxPerMv * SMALL_BOX_MV,
  };
}

export function pointToSignal(x: number, y: number, scale: MonitorScale) {
  return {
    timeMs: Math.max(0, Math.min(1, x / scale.width)) * scale.visibleMs,
    mv: (scale.baselineY - Math.max(0, Math.min(scale.height, y))) / scale.pxPerMv,
  };
}

export function signalToPoint(point: { timeMs: number; mv: number }, scale: MonitorScale) {
  return {
    x: point.timeMs / scale.visibleMs * scale.width,
    y: scale.baselineY - point.mv * scale.pxPerMv,
  };
}
