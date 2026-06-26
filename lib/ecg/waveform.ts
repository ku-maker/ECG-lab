import type { ECGParameters } from "@/lib/ecg/types";

/** ガウス型の波形要素 */
function gaussian(
  phase: number,
  center: number,
  width: number,
  amplitude: number
): number {
  if (width <= 0) return 0;
  const d = (phase - center) / width;
  return amplitude * Math.exp(-0.5 * d * d);
}

/** 0→1 のスムーズステップ */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * QRS幅スライダー → 時間軸スケール
 * 1.0 = 正常幅, 最大 ≈3.4倍 (Wide QRS)
 */
export function getQrsTimeScale(width: number): number {
  const w = Math.min(1, Math.max(0, width));
  return 1 + w * 2.4;
}

/** R波頂点の位相（固定アンカー） */
const R_PEAK_PHASE = 0.36;

/**
 * QRS描画用に位相を時間軸方向へスケーリング
 * widthScale が大きいほど同一位相進行に対し QRS が横に広がる
 */
export function warpPhaseForQrs(phase: number, width: number): number {
  const scale = getQrsTimeScale(width);
  const qrsStart = 0.26;
  const qrsEnd = 0.5;

  if (phase < qrsStart || phase > qrsEnd) {
    return phase;
  }

  const edge = smoothstep(qrsStart, qrsStart + 0.02, phase);
  const edgeOut = 1 - smoothstep(qrsEnd - 0.02, qrsEnd, phase);
  const blend = edge * edgeOut;

  const warped = R_PEAK_PHASE + (phase - R_PEAK_PHASE) / scale;
  return phase + (warped - phase) * blend;
}

/** J点（S波終了）位相 — QRS幅に連動 */
export function getJPointPhase(qrsWidth: number): number {
  const scale = getQrsTimeScale(qrsWidth);
  return R_PEAK_PHASE + 0.022 * scale;
}

/** P波 */
function pWaveValue(phase: number, params: ECGParameters["pWave"]): number {
  const amp = params.amplitude * 0.22;
  const width = 0.018 + params.width * 0.025;
  const center = 0.13;

  if (params.morphology < 0.45) {
    return gaussian(phase, center, width, amp);
  }

  const split = params.morphology;
  const offset = 0.012 + split * 0.008;
  return (
    gaussian(phase, center - offset, width * 0.75, amp * 0.65) +
    gaussian(phase, center + offset, width * 0.75, amp * 0.65)
  );
}

/**
 * QRS複合体 — 固定テンプレートを warpPhaseForQrs で時間軸伸縮
 * width=0: 狭い (~80ms), width=1: 広い (~200ms+)
 */
function qrsValue(
  phase: number,
  params: ECGParameters["qrsComplex"]
): number {
  const t = warpPhaseForQrs(phase, params.width);

  const spread = 0.0055;
  const rPeak = 1 - params.morphology * 0.35;
  const qAmp = -0.2 * (1 - params.morphology * 0.4);
  const sAmp = -0.34 * (1 + params.morphology * 0.15);

  const qCenter = R_PEAK_PHASE - spread * 3.2;
  const sCenter = R_PEAK_PHASE + spread * 3.6;

  const qrs =
    gaussian(t, qCenter, spread * 0.85, qAmp) +
    gaussian(t, R_PEAK_PHASE, spread * 0.55, rPeak) +
    gaussian(t, sCenter, spread * 0.9, sAmp);

  if (params.morphology > 0.55) {
    return (
      qrs +
      gaussian(t, R_PEAK_PHASE + spread * 2, spread * 1.6, 0.2 * params.morphology)
    );
  }

  return qrs;
}

/**
 * ST-T — J点以降のベースラインYオフセット + T波
 * stElevation: -1=低下, 0=等電位, +1=上昇
 */
function stTValue(
  phase: number,
  params: ECGParameters["stT_Segment"],
  qrsWidth: number
): number {
  const jPhase = getJPointPhase(qrsWidth);
  const tOnset = 0.57;
  const tPeak = 0.68;
  const tEnd = 0.82;

  // ST ベースラインの Y オフセット (mV 正規化 — Canvas MV_SCALE=28 で ~15px 相当)
  const stLevel = params.stElevation * 0.55;

  let baselineOffset = 0;

  if (phase >= jPhase && phase < tOnset) {
    // J点 → ST 水平部: ランプイン後フラット
    const rampIn = smoothstep(jPhase, jPhase + 0.014, phase);
    baselineOffset = stLevel * rampIn;
  } else if (phase >= tOnset && phase < tPeak) {
    // ST 水平部を維持し T 波へ滑らかに接続
    baselineOffset = stLevel;
  } else if (phase >= tPeak && phase < tEnd) {
    // T 波後半: ベースラインを等電位へ復帰
    const fade = 1 - smoothstep(tPeak, tEnd, phase);
    baselineOffset = stLevel * fade;
  }

  const tWave = gaussian(phase, tPeak, 0.058, params.tWaveAmplitude * 0.38);

  return baselineOffset + tWave;
}

/**
 * 1拍周期内の位相 (0〜1) から正規化振幅を算出
 */
export function sampleECGAtPhase(
  phase: number,
  params: ECGParameters
): number {
  const t = ((phase % 1) + 1) % 1;

  return (
    pWaveValue(t, params.pWave) +
    qrsValue(t, params.qrsComplex) +
    stTValue(t, params.stT_Segment, params.qrsComplex.width)
  );
}

/** 次の RR 間隔 (秒) */
export function nextBeatDuration(
  heartRate: number,
  rhythmRegularity: number
): number {
  const base = 60 / Math.max(heartRate, 30);
  const irregularity = 1 - Math.min(Math.max(rhythmRegularity, 0), 1);
  const jitter = (Math.random() - 0.5) * 2 * irregularity * 0.22;
  return base * (1 + jitter);
}
