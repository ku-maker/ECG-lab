import type { ECGParameters } from "@/lib/ecg/types";

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** 表示用パラメータを目標値へ滑らかに近づける */
export function lerpECGParams(
  from: ECGParameters,
  to: ECGParameters,
  t: number
): ECGParameters {
  return {
    global: {
      heartRate: lerp(from.global.heartRate, to.global.heartRate, t),
      rhythmRegularity: lerp(
        from.global.rhythmRegularity,
        to.global.rhythmRegularity,
        t
      ),
    },
    pWave: {
      amplitude: lerp(from.pWave.amplitude, to.pWave.amplitude, t),
      width: lerp(from.pWave.width, to.pWave.width, t),
      morphology: lerp(from.pWave.morphology, to.pWave.morphology, t),
    },
    qrsComplex: {
      width: lerp(from.qrsComplex.width, to.qrsComplex.width, t),
      morphology: lerp(from.qrsComplex.morphology, to.qrsComplex.morphology, t),
    },
    stT_Segment: {
      stElevation: lerp(
        from.stT_Segment.stElevation,
        to.stT_Segment.stElevation,
        t
      ),
      tWaveAmplitude: lerp(
        from.stT_Segment.tWaveAmplitude,
        to.stT_Segment.tWaveAmplitude,
        t
      ),
    },
  };
}

/** 2つの ECGParameters が十分近いか判定 */
export function paramsNearlyEqual(
  a: ECGParameters,
  b: ECGParameters,
  epsilon = 0.0005
): boolean {
  const nums = [
    a.global.heartRate,
    a.global.rhythmRegularity,
    a.pWave.amplitude,
    a.pWave.width,
    a.pWave.morphology,
    a.qrsComplex.width,
    a.qrsComplex.morphology,
    a.stT_Segment.stElevation,
    a.stT_Segment.tWaveAmplitude,
  ];
  const targets = [
    b.global.heartRate,
    b.global.rhythmRegularity,
    b.pWave.amplitude,
    b.pWave.width,
    b.pWave.morphology,
    b.qrsComplex.width,
    b.qrsComplex.morphology,
    b.stT_Segment.stElevation,
    b.stT_Segment.tWaveAmplitude,
  ];
  return nums.every((v, i) => Math.abs(v - targets[i]) < epsilon);
}
