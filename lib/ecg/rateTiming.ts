import type { BeatTemplate } from "../../src/data/ecg/templates";

// Preserve the teaching morphology at its reference rate. Only the portions
// outside P onset–QRS offset are resized. This is not a physiologic QT model.
export function getReferenceBpm(template: BeatTemplate): number {
  if (template.id === "sinus-brady-lead2-v0") return 45;
  if (template.id === "sinus-tachy-lead2-v0") return 120;
  if (template.id === "vt-lead2-v0") return 160;
  if (template.id === "svt-lead2-v0") return 180;
  if (template.id === "atrial-tachy-lead2-v0") return 140;
  if (template.id === "aivr-lead2-v0") return 80;
  if (template.id === "ventricular-escape-lead2-v0") return 35;
  if (template.id === "ventricular-paced-lead2-v0") return 70;
  if (template.id === "mat-lead2-v0") return 115;
  return 60;
}
export function getMaxLearningBpm(caseId: string): number {
  return caseId === "avblock1" || caseId === "wenckebach" ? 100 : 180;
}
function segments(template: BeatTemplate, beatMs: number) {
  const start = template.fiducialsMs.pOn ?? template.fiducialsMs.qrsOn ?? 0;
  const end = template.fiducialsMs.qrsOff ?? start;
  const core = end - start;
  // Defensive fallback for invalid callers outside the supported controls.
  const coreScale = Math.min(60000 / getReferenceBpm(template) / template.durationMs, (beatMs - 1) / Math.max(core, 1));
  const outerScale = (beatMs - core * coreScale) / (template.durationMs - core);
  return { start, end, coreScale, outerScale, startMs: start * outerScale, endMs: start * outerScale + core * coreScale };
}
export function templateToBeatMs(template: BeatTemplate, offset: number, beatMs: number): number {
  const s = segments(template, beatMs);
  if (offset <= s.start) return offset * s.outerScale;
  if (offset <= s.end) return s.startMs + (offset - s.start) * s.coreScale;
  return s.endMs + (offset - s.end) * s.outerScale;
}
export function beatToTemplateMs(template: BeatTemplate, offset: number, beatMs: number): number {
  const s = segments(template, beatMs);
  if (offset <= s.startMs) return offset / s.outerScale;
  if (offset <= s.endMs) return s.start + (offset - s.startMs) / s.coreScale;
  return s.end + (offset - s.endMs) / s.outerScale;
}
