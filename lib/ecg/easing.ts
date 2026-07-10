export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function easeInOutCubic(value: number): number {
  const t = clamp(value, 0, 1);

  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOutCubic(value: number): number {
  const t = clamp(value, 0, 1);

  return 1 - Math.pow(1 - t, 3);
}
