import type { ECGParameters } from "@/lib/ecg/types";

/** 正常洞調律に近いデフォルト値 */
export const DEFAULT_ECG_PARAMS: ECGParameters = {
  global: {
    heartRate: 75,
    rhythmRegularity: 1,
  },
  pWave: {
    amplitude: 0.5,
    width: 0.4,
    morphology: 0,
  },
  qrsComplex: {
    width: 0.3,
    morphology: 0,
  },
  stT_Segment: {
    stElevation: 0,
    tWaveAmplitude: 0.55,
  },
};
