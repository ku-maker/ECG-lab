/** References used when rewriting the learning copy, reviewed 2026-09-08. */
const references = {
  basics: {
    title: "MSDマニュアル：心電図の基本（英語）",
    url: "https://www.msdmanuals.com/professional/cardiovascular-disorders/cardiovascular-tests-and-procedures/electrocardiography",
  },
  rate: {
    title: "米国心臓協会：頻脈（英語）",
    url: "https://www.heart.org/en/health-topics/arrhythmia/about-arrhythmia/tachycardia--fast-heart-rate",
  },
  premature: {
    title: "米国心臓協会：心房・心室性期外収縮（英語）",
    url: "https://www.heart.org/en/health-topics/arrhythmia/about-arrhythmia/premature-contractions-pacs-and-pvcs",
  },
  block: {
    title: "Merckマニュアル：房室ブロック（英語）",
    url: "https://www.merckmanuals.com/professional/cardiovascular-disorders/specific-cardiac-arrhythmias/atrioventricular-block",
  },
  af: {
    title: "MSDマニュアル：心房細動（英語）",
    url: "https://www.msdmanuals.com/professional/cardiovascular-disorders/specific-cardiac-arrhythmias/atrial-fibrillation",
  },
  afl: {
    title: "MSDマニュアル：心房粗動（英語）",
    url: "https://www.msdmanuals.com/professional/cardiovascular-disorders/specific-cardiac-arrhythmias/atrial-flutter",
  },
  junctional: {
    title: "NCBI Bookshelf：接合部調律（英語）",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK507715/",
  },
  stemi: {
    title: "MSDマニュアル：急性心筋梗塞（英語）",
    url: "https://www.msdmanuals.com/professional/cardiovascular-disorders/coronary-artery-disease/acute-myocardial-infarction-mi",
  },
  als: {
    title: "米国心臓協会：成人の二次救命処置・2025年版（英語）",
    url: "https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-advanced-life-support",
  },
  vf: {
    title: "米国心臓協会：心室細動（英語）",
    url: "https://www.heart.org/en/health-topics/arrhythmia/about-arrhythmia/ventricular-fibrillation",
  },
};

const caseReferences: Record<string, (keyof typeof references)[]> = {
  nsr: ["basics"],
  "sinus-brady": ["basics"],
  "sinus-tachy": ["rate"],
  af: ["af"],
  pvc: ["premature"],
  pac: ["premature"],
  avblock1: ["block"],
  mobitz2: ["block"],
  wenckebach: ["block"],
  svt: ["rate"],
  stemi: ["stemi", "basics"],
  tdp: ["als"],
  afl: ["afl"],
  junctional: ["junctional"],
  avblock3: ["block"],
  vt: ["rate", "als"],
  vf: ["vf", "als"],
};

export function getCaseReferences(caseId: string) {
  return (caseReferences[caseId] ?? ["basics"]).map((key) => references[key]);
}
