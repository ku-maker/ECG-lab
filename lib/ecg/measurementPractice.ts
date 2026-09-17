import type { TeachingMark } from "./teachingHighlights";
export type MeasurementKind = "pr" | "qrs" | "rr";
export const MEASUREMENT_TASKS = [
  { kind: "pr", label: "PR間隔", instruction: "同じ拍のP波の始まりと、QRS波の始まりを選びます。" },
  { kind: "qrs", label: "QRS幅", instruction: "同じQRS波の始まりと終わりを選びます。山の頂点ではありません。" },
  { kind: "rr", label: "RR間隔", instruction: "隣り合う2つのR波の頂点を選びます。1拍飛ばさずに測りましょう。" },
] as const;
export function supportsMeasurementPractice(caseId: string) {
  return ["nsr", "sinus-brady", "sinus-tachy", "avblock1"].includes(caseId);
}
export function describeEndpoint(label: string, offsetMs: number, toleranceMs = 20) {
  return Math.abs(offsetMs) <= toleranceMs
    ? `${label}：基準位置の範囲内`
    : `${label}：${offsetMs > 0 ? "左" : "右"}へ約${Math.round(Math.abs(offsetMs))} ms`;
}
export function assessMeasurement(points: readonly { timeMs: number }[], marks: readonly TeachingMark[], toleranceMs = 20) {
  if (points.length !== 2 || !marks.length || points.some(p => !Number.isFinite(p.timeMs))) return null;
  const [start, end] = points.map(p => p.timeMs).sort((a, b) => a - b);
  const nearest = marks.reduce((best, mark) =>
    Math.abs(mark.startMs - start) + Math.abs(mark.endMs - end) < Math.abs(best.startMs - start) + Math.abs(best.endMs - end) ? mark : best);
  return {
    correct: Math.abs(nearest.startMs - start) <= toleranceMs && Math.abs(nearest.endMs - end) <= toleranceMs,
    measuredMs: end - start,
    expectedMs: nearest.endMs - nearest.startMs,
    startOffsetMs: start - nearest.startMs,
    endOffsetMs: end - nearest.endMs,
  };
}
