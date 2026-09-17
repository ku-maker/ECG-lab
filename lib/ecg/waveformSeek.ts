/** Convert a pointer within the rendered SVG to the plotted cycle, excluding margins. */
export function waveformSeekRatio(x: number, width: number, viewWidth: number, padding: number, cycleMs: number) {
  if (![x, width, viewWidth, padding, cycleMs].every(Number.isFinite) || width <= 0 || viewWidth <= padding * 2 || cycleMs <= 1) return 0;
  const ratio = (x / width * viewWidth - padding) / (viewWidth - padding * 2);
  // The final millisecond belongs to this beat, rather than wrapping to its beginning.
  return Math.max(0, Math.min((cycleMs - 1) / cycleMs, ratio));
}
