export const TWELVE_LEADS = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"] as const;
export type TwelveLead = typeof TWELVE_LEADS[number];
export const REPORT_ROWS: TwelveLead[][] = [["I", "aVR", "V1", "V4"], ["II", "aVL", "V2", "V5"], ["III", "aVF", "V3", "V6"]];
export type ClinicalRecord = { sampleRate: number; sampleCount: number; units: "mV"; leads: Record<TwelveLead, number[]>; sourceRecord: string; sha256: string };
export function isClinicalRecord(value: unknown): value is ClinicalRecord {
  if (!value || typeof value !== "object") return false;
  const r = value as ClinicalRecord;
  return r.sampleRate === 500 && r.sampleCount === 5000 && r.units === "mV" && typeof r.sourceRecord === "string" && !!r.leads &&
    TWELVE_LEADS.every(lead => Array.isArray(r.leads[lead]) && r.leads[lead].length === 5000 && r.leads[lead].every(Number.isFinite));
}
/** 4 SVG units per nominal mm: 25 mm/s = 100 units/s; 10 mm/mV = 40 units/mV. */
export function clinicalPath(values: readonly number[], sampleRate: number, startSec: number, seconds: number, baseline: number) {
  const start = Math.round(startSec * sampleRate), end = Math.min(values.length, Math.round((startSec + seconds) * sampleRate));
  let path = "";
  for (let i = start; i < end; i++) path += `${i === start ? "M" : "L"}${((i - start) / sampleRate * 100).toFixed(2)},${(baseline - values[i] * 40).toFixed(2)} `;
  return path;
}
