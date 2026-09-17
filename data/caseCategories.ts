export const CASE_CATEGORIES = [
  {id: "all", label: "すべて"},
  {id: "sinus", label: "洞調律"},
  {id: "atrial", label: "心房の不整脈"},
  {id: "ventricular", label: "心室の不整脈"},
  {id: "conduction", label: "房室ブロック・伝導"},
  {id: "ischemia", label: "ST変化"},
] as const;
export type CaseCategoryId = typeof CASE_CATEGORIES[number]["id"];
const CASE_CATEGORY_BY_ID: Record<string, Exclude<CaseCategoryId,"all">> = {
  nsr: "sinus", "sinus-brady": "sinus", "sinus-tachy": "sinus", "sinus-arrhythmia": "sinus",
  "atrial-tachy": "atrial", af: "atrial", pac: "atrial", "pac-bigeminy": "atrial", mat: "atrial", afl: "atrial", svt: "atrial",
  pvc: "ventricular", "pvc-bigeminy": "ventricular", aivr: "ventricular", "ventricular-escape": "ventricular", "ventricular-paced": "ventricular", vt: "ventricular", tdp: "ventricular", vf: "ventricular",
  avblock1: "conduction", mobitz2: "conduction", wenckebach: "conduction", junctional: "conduction", avblock3: "conduction",
  stemi: "ischemia",
};
export function getCaseCategory(caseId: string): Exclude<CaseCategoryId,"all"> {
  return CASE_CATEGORY_BY_ID[caseId] ?? "sinus";
}
