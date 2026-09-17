import type { NsrFiducials } from "./buildTimeline";
import type { ActivationTimeline } from "./types";

/** 教育用の完全左脚ブロック。胸部誘導の投影は簡略化した双極子モデル。 */
export const lbbbFiducials: NsrFiducials = {
  pOn: 60,
  pPeak: 100,
  pOff: 140,
  qrsOn: 280,
  // q/s は stage builder の型に合わせた時刻。V6 の病的 Q/S 波を意味しない。
  q: 310,
  r: 365,
  s: 430,
  qrsOff: 480,
  tPeak: 670,
  tEnd: 850,
};

export const lbbbTimeline: ActivationTimeline = {
  templateId: "lbbb-conduction-v1",
  cycleMs: 1000,
  events: [
    { id: "atrial", segment: "saAtrial", centerMs: 100, sigmaMs: 33, dipoleDir: [0.7071, -0.7071, 0], dipolePeakMag: 0.13, contributesToWave: true },
    { id: "avDelay", segment: "avDelay", centerMs: 210, sigmaMs: 70, dipoleDir: [0.5, -0.866, 0], dipolePeakMag: 0, contributesToWave: false },
    // 右脚を通る早期の右室興奮。左脚の伝導路は発光させない。
    { id: "earlyRightVentricle", segment: "rightBundle", centerMs: 310, sigmaMs: 16, dipoleDir: [0.5, -0.866, 0], dipolePeakMag: 0.18, contributesToWave: true },
    // 遅れた左室興奮を2峰に分け、左側誘導の幅広い切れ込みR波を模式的に表す。
    { id: "delayedLeftVentricleFirst", segment: "septalPurkinje", centerMs: 365, sigmaMs: 24, dipoleDir: [0.866, 0.5, 0], dipolePeakMag: 0.78, contributesToWave: true },
    { id: "midQrsNotch", segment: "septalPurkinje", centerMs: 398, sigmaMs: 8, dipoleDir: [0.866, 0.5, 0], dipolePeakMag: -0.16, contributesToWave: true },
    { id: "delayedLeftVentricleSecond", segment: "septalPurkinje", centerMs: 430, sigmaMs: 21, dipoleDir: [0.866, 0.5, 0], dipolePeakMag: 0.9, contributesToWave: true },
    // 二次性のST-T変化も模式表現。虚血の判定には使わない。
    { id: "repol", segment: "ventRepol", centerMs: 670, sigmaMs: 74, dipoleDir: [-0.866, -0.5, 0], dipolePeakMag: 0.22, contributesToWave: true },
  ],
};
