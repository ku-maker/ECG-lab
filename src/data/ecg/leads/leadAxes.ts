export type LeadId =
  | "I"
  | "II"
  | "III"
  | "aVR"
  | "aVL"
  | "aVF"
  | "V1"
  | "V2"
  | "V3"
  | "V4"
  | "V5"
  | "V6";

export const LEADS: LeadId[] = [
  "I",
  "II",
  "III",
  "aVR",
  "aVL",
  "aVF",
  "V1",
  "V2",
  "V3",
  "V4",
  "V5",
  "V6",
];

export const LEAD_ANGLES_DEG: Record<LeadId, number> = {
  I: 0,
  II: 60,
  III: 120,
  aVR: -150,
  aVL: -30,
  aVF: 90,
  // MVP approximation: precordial leads are represented as frontal-plane
  // angles only. Anatomically accurate V1-V6 geometry is out of scope for T2
  // and belongs to the future 12lead-precordial-accuracy task.
  V1: 100,
  V2: 90,
  V3: 75,
  V4: 60,
  V5: 30,
  V6: 0,
};

export function axisFromAngle(deg: number): [number, number, number] {
  const rad = (deg * Math.PI) / 180;

  return [Math.cos(rad), -Math.sin(rad), 0];
}

export function leadAxis(id: LeadId): [number, number, number] {
  const axis = axisFromAngle(LEAD_ANGLES_DEG[id]);
  const norm = Math.hypot(axis[0], axis[1], axis[2]);

  if (norm === 0) return [0, 0, 0];

  return [axis[0] / norm, axis[1] / norm, axis[2] / norm];
}
