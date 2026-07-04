"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import {
  ECG_TEMPLATE_OPTIONS,
  type BeatTemplate,
} from "@/src/data/ecg/templates";
import { EcgAnnotationOverlay } from "@/components/EcgAnnotationOverlay";
import type { ECGCaseRhythm } from "@/data/ecgCases";

const DEFAULT_TEMPLATE = ECG_TEMPLATE_OPTIONS[0].template;
const WAVEFORM_SAMPLE_STEP_PX = 0.25;
const MAX_FRAME_DELTA_MS = 50;
const WAVEFORM_VERTICAL_PADDING_PX = 18;
const VF_DISPLAY_RANGE_MV = { min: -2, max: 2 };
const AF_BPM_VARIATION = 0.3;
const AF_QRS_PEAK_OFFSET_MS = 24;
const AF_DISPLAY_RANGE_MV = { min: -0.35, max: 1.15 };
const PVC_EVERY_N_BEATS = 4;
const PVC_PREMATURE_FRACTION = 0.72;
const PVC_DURATION_MS = 620;
const PVC_PEAK_OFFSET_MS = 190;
const PVC_COMPENSATORY_PAUSE_MS = 650;
const PVC_DISPLAY_RANGE_MV = { min: -1.45, max: 1.65 };
const ECG_BEEP_FREQUENCY_HZ = 500;
const ECG_BEEP_DURATION_SEC = 0.05;
const PVC_BEEP_FREQUENCY_HZ = 250;
const PVC_BEEP_DURATION_SEC = 0.08;
const PAC_EVERY_N_BEATS = 4;
const PAC_PREMATURE_FRACTION = 0.62;
const PAC_DURATION_FRACTION = 0.82;
const PAC_PAUSE_MS = 420;
const MOBITZ2_DROP_EVERY_N_BEATS = 4;
const MOBITZ2_DISPLAY_RANGE_MV = { min: -0.35, max: 1.15 };
const WENCKEBACH_CYCLE_BEATS = 4;
const WENCKEBACH_PR_DELAY_FRACTIONS = [0.22, 0.31, 0.4] as const;
const SVT_LOCKED_BPM = 180;
const SVT_DISPLAY_RANGE_MV = { min: -0.35, max: 1.15 };
const STEMI_DISPLAY_RANGE_MV = { min: -0.2, max: 1.2 };
const TDP_LOCKED_BPM = 200;
const TDP_QRS_PEAK_OFFSET_MS = 68;
const TDP_TWIST_PERIOD_MS = 4200;
const TDP_DISPLAY_RANGE_MV = { min: -2.2, max: 2.2 };
const AFL_ATRIAL_BPM = 300;
const AFL_CONDUCTION_RATIO = 4;
const AFL_VENTRICULAR_BPM = AFL_ATRIAL_BPM / AFL_CONDUCTION_RATIO;
const AFL_QRS_PEAK_OFFSET_MS = 70;
const AFL_DISPLAY_RANGE_MV = { min: -0.45, max: 1.25 };
const AV_BLOCK_P_BPM = 82;
const AV_BLOCK_ESCAPE_BPM = 35;
const AV_BLOCK_P_PEAK_OFFSET_MS = 130;
const AV_BLOCK_QRS_PEAK_OFFSET_MS = 180;
const AV_BLOCK_ESCAPE_PHASE_OFFSET_MS = 360;
const AV_BLOCK3_DISPLAY_RANGE_MV = { min: -0.55, max: 1.35 };
const VF_ALARM_INTERVAL_MS = 850;
const VF_ALARM_FREQUENCY_HZ = 180;
const SHOCK_ARTIFACT_MS = 200;
const SHOCK_FLATLINE_END_MS = 1500;
const SHOCK_FLASH_MS = 160;
const afTimingCaches = new Map<
  number,
  { forwardBeatStartsMs: number[]; backwardBeatStartsMs: number[] }
>();

type EcgCanvasProps = {
  template?: BeatTemplate;
  displayLabel?: string;
  bpm?: number;
  rhythm?: ECGCaseRhythm;
  onShockComplete?: () => void;
  onLiveBpmChange?: (bpm: number | null) => void;
  audioMuted?: boolean;
  audioVolume?: number;
  showAnnotations?: boolean;
  annotationCaseId?: string;
  width?: number;
  height?: number;
  secondsVisible?: number;
  pxPerMv?: number;
  className?: string;
};

export type EcgCanvasHandle = {
  resumeAudio: () => void;
  triggerShock: () => void;
  resetTimeline: () => void;
};

type ShockEvent = {
  startMs: number;
  completed: boolean;
  sourceTemplate: BeatTemplate;
  sourceBpm: number;
  sourceRhythm: ECGCaseRhythm;
  recoveryTemplate: BeatTemplate;
  recoveryBpm: number;
  recoveryRhythm: ECGCaseRhythm;
};

/**
 * Catmull-Rom スプライン補間（4点 → 1点）
 * t ∈ [0, 1]: p1 と p2 の間を滑らかに補間する。
 * p0, p3 は前後の制御点（接線の勾配計算に使用）。
 */
function catmullRom(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number
): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (
      2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    )
  );
}

function getTemplateValueAtMs(template: BeatTemplate, msInTemplate: number) {
  const samples = template.samplesMv;
  const n = samples.length;
  const durationMs = template.durationMs;

  const clampedMs = Math.max(0, Math.min(msInTemplate, durationMs - 1));
  const rawIndex = (clampedMs / durationMs) * (n - 1);

  const i1 = Math.floor(rawIndex);
  const t = rawIndex - i1;

  // 境界クランプ：配列外アクセスを防ぐ
  const i0 = Math.max(i1 - 1, 0);
  const i2 = Math.min(i1 + 1, n - 1);
  const i3 = Math.min(i1 + 2, n - 1);

  return catmullRom(samples[i0], samples[i1], samples[i2], samples[i3], t);
}

function isVfTemplate(template: BeatTemplate): boolean {
  return template.id.toLowerCase().includes("vf");
}

function isAfTemplate(template: BeatTemplate): boolean {
  const templateId = template.id.toLowerCase();
  return templateId.includes("afib") || templateId === "af-lead2-v0";
}

function isPvcTemplate(template: BeatTemplate): boolean {
  return template.id.toLowerCase().includes("pvc");
}

function isPacTemplate(template: BeatTemplate): boolean {
  return template.id.toLowerCase().includes("pac");
}

function isMobitz2Template(template: BeatTemplate): boolean {
  const templateId = template.id.toLowerCase();
  return templateId.includes("mobitz2") || templateId.includes("mobitz");
}

function isWenckebachTemplate(template: BeatTemplate): boolean {
  const templateId = template.id.toLowerCase();
  return templateId.includes("wenckebach") || templateId.includes("mobitz1");
}

function isSvtTemplate(template: BeatTemplate): boolean {
  return template.id.toLowerCase().includes("svt");
}

function isStemiTemplate(template: BeatTemplate): boolean {
  return template.id.toLowerCase().includes("stemi");
}

function isTdpTemplate(template: BeatTemplate): boolean {
  return template.id.toLowerCase().includes("tdp");
}

function isAflTemplate(template: BeatTemplate): boolean {
  return template.id.toLowerCase().includes("afl");
}

function isAvBlock3Template(template: BeatTemplate): boolean {
  const templateId = template.id.toLowerCase();
  return templateId.includes("avblock3") || templateId.includes("cavb");
}

function getEffectiveBpmForTemplate(template: BeatTemplate, bpm: number): number {
  if (isSvtTemplate(template)) return SVT_LOCKED_BPM;
  if (isTdpTemplate(template)) return TDP_LOCKED_BPM;
  if (isAflTemplate(template)) return AFL_VENTRICULAR_BPM;
  if (isAvBlock3Template(template)) return AV_BLOCK_ESCAPE_BPM;
  return bpm;
}

function getVfChaosValueAtTimeMs(timeMs: number): number {
  // timeMs はアニメーション開始からの経過時間（ミリ秒）
  const t = timeMs / 1000;

  // 3Hz〜5Hz帯の滑らかなサイン波を合成し、位相をゆっくり変動させる
  const wave1 = Math.sin(t * Math.PI * 2 * 3.5 + Math.sin(t * 0.5));
  const wave2 = Math.sin(t * Math.PI * 2 * 4.2 + Math.cos(t * 0.8));
  const wave3 = Math.sin(t * Math.PI * 2 * 5.1);

  // Coarse VFとして見える振幅にスケールする
  return (wave1 + wave2 * 0.8 + wave3 * 0.5) * 0.6;
}

function gaussian(x: number, center: number, width: number): number {
  const z = (x - center) / width;
  return Math.exp(-0.5 * z * z);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function getAfBaselineValueAtTimeMs(timeMs: number): number {
  const t = timeMs / 1000;

  return (
    Math.sin(t * Math.PI * 2 * 6.3 + Math.sin(t * 0.7)) * 0.04 +
    Math.sin(t * Math.PI * 2 * 8.8 + Math.cos(t * 0.4)) * 0.025 +
    Math.sin(t * Math.PI * 2 * 11.2 + 1.6) * 0.015
  );
}

function getPvcBeatMs(bpm: number): number {
  return bpm > 0 ? 60_000 / bpm : DEFAULT_TEMPLATE.durationMs;
}

function getPvcCycleMs(bpm: number): number {
  return getPvcBeatMs(bpm) * PVC_EVERY_N_BEATS + PVC_COMPENSATORY_PAUSE_MS;
}

function getPvcCyclePosition(timeMs: number, bpm: number): {
  cycleStartMs: number;
  msInCycle: number;
  beatMs: number;
  pvcStartMs: number;
  pvcEndMs: number;
  pauseEndMs: number;
} {
  const beatMs = getPvcBeatMs(bpm);
  const cycleMs = getPvcCycleMs(bpm);
  const cycleIndex = Math.floor(timeMs / cycleMs);
  const cycleStartMs = cycleIndex * cycleMs;
  const msInCycle = timeMs - cycleStartMs;
  const pvcStartMs = (PVC_EVERY_N_BEATS - 1 + PVC_PREMATURE_FRACTION) * beatMs;
  const pvcEndMs = pvcStartMs + PVC_DURATION_MS;
  const pauseEndMs = pvcEndMs + PVC_COMPENSATORY_PAUSE_MS;

  return { cycleStartMs, msInCycle, beatMs, pvcStartMs, pvcEndMs, pauseEndMs };
}

function getPvcWaveValueAtMs(msInPvc: number): number {
  return (
    gaussian(msInPvc, 58, 18) * -0.22 +
    gaussian(msInPvc, 150, 48) * 1.55 +
    gaussian(msInPvc, 265, 68) * -1.32 +
    gaussian(msInPvc, 455, 95) * -0.28
  );
}

function getPvcRhythmValueAtTimeMs(timeMs: number, bpm: number): number {
  const { msInCycle, beatMs, pvcStartMs, pvcEndMs, pauseEndMs } =
    getPvcCyclePosition(timeMs, bpm);

  if (msInCycle >= pvcStartMs && msInCycle < pvcEndMs) {
    return getPvcWaveValueAtMs(msInCycle - pvcStartMs);
  }

  if (msInCycle >= pvcEndMs && msInCycle < pauseEndMs) {
    return 0;
  }

  const nsrElapsedMs =
    msInCycle < pvcStartMs
      ? msInCycle
      : msInCycle - PVC_COMPENSATORY_PAUSE_MS;
  const nsrPhaseMs = ((nsrElapsedMs % beatMs) + beatMs) % beatMs;
  const templateMs = (nsrPhaseMs / beatMs) * DEFAULT_TEMPLATE.durationMs;

  return getTemplateValueAtMs(DEFAULT_TEMPLATE, templateMs);
}

function getPacBeatMs(bpm: number): number {
  return bpm > 0 ? 60_000 / bpm : DEFAULT_TEMPLATE.durationMs;
}

function getPacDurationMs(bpm: number): number {
  return getPacBeatMs(bpm) * PAC_DURATION_FRACTION;
}

function getPacCycleMs(bpm: number): number {
  const beatMs = getPacBeatMs(bpm);
  return (
    (PAC_EVERY_N_BEATS - 1 + PAC_PREMATURE_FRACTION) * beatMs +
    getPacDurationMs(bpm) +
    PAC_PAUSE_MS
  );
}

function getPacCyclePosition(timeMs: number, bpm: number): {
  cycleStartMs: number;
  msInCycle: number;
  beatMs: number;
  pacStartMs: number;
  pacEndMs: number;
  pauseEndMs: number;
} {
  const beatMs = getPacBeatMs(bpm);
  const cycleMs = getPacCycleMs(bpm);
  const cycleIndex = Math.floor(timeMs / cycleMs);
  const cycleStartMs = cycleIndex * cycleMs;
  const msInCycle = timeMs - cycleStartMs;
  const pacStartMs = (PAC_EVERY_N_BEATS - 1 + PAC_PREMATURE_FRACTION) * beatMs;
  const pacEndMs = pacStartMs + getPacDurationMs(bpm);
  const pauseEndMs = pacEndMs + PAC_PAUSE_MS;

  return { cycleStartMs, msInCycle, beatMs, pacStartMs, pacEndMs, pauseEndMs };
}

function getPacRhythmValueAtTimeMs(timeMs: number, bpm: number): number {
  const { msInCycle, beatMs, pacStartMs, pacEndMs, pauseEndMs } =
    getPacCyclePosition(timeMs, bpm);

  if (msInCycle >= pacStartMs && msInCycle < pacEndMs) {
    const msInPac = msInCycle - pacStartMs;
    const templateMs = (msInPac / getPacDurationMs(bpm)) * DEFAULT_TEMPLATE.durationMs;
    const deformedEarlyP =
      gaussian(templateMs, DEFAULT_TEMPLATE.fiducialsMs.pPeak ?? 160, 34) *
      -0.035;
    return getTemplateValueAtMs(DEFAULT_TEMPLATE, templateMs) + deformedEarlyP;
  }

  if (msInCycle >= pacEndMs && msInCycle < pauseEndMs) {
    return 0;
  }

  const nsrPhaseMs = ((msInCycle % beatMs) + beatMs) % beatMs;
  const templateMs = (nsrPhaseMs / beatMs) * DEFAULT_TEMPLATE.durationMs;

  return getTemplateValueAtMs(DEFAULT_TEMPLATE, templateMs);
}

function isMobitz2DroppedBeat(beatIndex: number): boolean {
  const normalizedIndex =
    ((beatIndex % MOBITZ2_DROP_EVERY_N_BEATS) + MOBITZ2_DROP_EVERY_N_BEATS) %
    MOBITZ2_DROP_EVERY_N_BEATS;
  return normalizedIndex === MOBITZ2_DROP_EVERY_N_BEATS - 1;
}

function getMobitz2RhythmValueAtTimeMs(timeMs: number, bpm: number): number {
  const beatMs = bpm > 0 ? 60_000 / bpm : DEFAULT_TEMPLATE.durationMs;
  const beatIndex = Math.floor(timeMs / beatMs);
  const phaseMs = ((timeMs % beatMs) + beatMs) % beatMs;
  const templateMs = (phaseMs / beatMs) * DEFAULT_TEMPLATE.durationMs;

  if (!isMobitz2DroppedBeat(beatIndex)) {
    return getTemplateValueAtMs(DEFAULT_TEMPLATE, templateMs);
  }

  const pEndMs = DEFAULT_TEMPLATE.fiducialsMs.pOff ?? 220;
  if (templateMs <= pEndMs) {
    return getTemplateValueAtMs(DEFAULT_TEMPLATE, templateMs);
  }

  return 0;
}

function getWenckebachBeatMs(bpm: number): number {
  return bpm > 0 ? 60_000 / bpm : DEFAULT_TEMPLATE.durationMs;
}

function getWenckebachCycleIndex(beatIndex: number): number {
  return (
    ((beatIndex % WENCKEBACH_CYCLE_BEATS) + WENCKEBACH_CYCLE_BEATS) %
    WENCKEBACH_CYCLE_BEATS
  );
}

function isWenckebachDroppedBeat(beatIndex: number): boolean {
  return getWenckebachCycleIndex(beatIndex) === WENCKEBACH_CYCLE_BEATS - 1;
}

function getWenckebachPPeakOffsetMs(beatMs: number): number {
  return beatMs * 0.15;
}

function getWenckebachQrsPeakOffsetMs(
  beatMs: number,
  beatIndex: number
): number | null {
  if (isWenckebachDroppedBeat(beatIndex)) return null;

  const cycleIndex = getWenckebachCycleIndex(beatIndex);
  const prDelayMs = WENCKEBACH_PR_DELAY_FRACTIONS[cycleIndex] * beatMs;
  return getWenckebachPPeakOffsetMs(beatMs) + prDelayMs;
}

function getWenckebachRhythmValueAtTimeMs(timeMs: number, bpm: number): number {
  const beatMs = getWenckebachBeatMs(bpm);
  const beatIndex = Math.floor(timeMs / beatMs);
  let value = 0;

  for (let i = beatIndex - 1; i <= beatIndex + 1; i++) {
    const beatStartMs = i * beatMs;
    const pPeakTimeMs = beatStartMs + getWenckebachPPeakOffsetMs(beatMs);
    const qrsPeakOffsetMs = getWenckebachQrsPeakOffsetMs(beatMs, i);

    value += getPOnlyValueAtOffsetMs(timeMs - pPeakTimeMs);

    if (qrsPeakOffsetMs !== null) {
      value += getNarrowQrsValueAtOffsetMs(
        timeMs - (beatStartMs + qrsPeakOffsetMs)
      );
    }
  }

  return value;
}

function getSvtRhythmValueAtTimeMs(timeMs: number): number {
  const beatMs = 60_000 / SVT_LOCKED_BPM;
  const phaseMs = ((timeMs % beatMs) + beatMs) % beatMs;
  const templateMs = (phaseMs / beatMs) * DEFAULT_TEMPLATE.durationMs;
  const baseValue = getTemplateValueAtMs(DEFAULT_TEMPLATE, templateMs);
  const pPeakMs = DEFAULT_TEMPLATE.fiducialsMs.pPeak ?? 180;
  const pSuppression = gaussian(templateMs, pPeakMs, 44) * 0.13;
  const buriedRetrogradeP = gaussian(templateMs, 720, 38) * -0.025;

  return baseValue - pSuppression + buriedRetrogradeP;
}

function getStemiRhythmValueAtTimeMs(timeMs: number, bpm: number): number {
  const beatMs = bpm > 0 ? 60_000 / bpm : DEFAULT_TEMPLATE.durationMs;
  const phaseMs = ((timeMs % beatMs) + beatMs) % beatMs;
  const templateMs = (phaseMs / beatMs) * DEFAULT_TEMPLATE.durationMs;
  const baseValue = getTemplateValueAtMs(DEFAULT_TEMPLATE, templateMs);
  const sWaveLift = gaussian(templateMs, DEFAULT_TEMPLATE.fiducialsMs.s ?? 430, 28) * 0.23;
  const stWindow =
    smoothstep(430, 500, templateMs) * (1 - smoothstep(790, 900, templateMs));
  const domeProgress = clamp01((templateMs - 430) / 470);
  const domeLift = Math.sin(Math.PI * domeProgress) * 0.13;

  return baseValue + sWaveLift + stWindow * 0.34 + domeLift;
}

function getNarrowQrsValueAtOffsetMs(offsetMs: number): number {
  return (
    gaussian(offsetMs, -22, 8) * -0.12 +
    gaussian(offsetMs, 0, 10) * 0.98 +
    gaussian(offsetMs, 28, 15) * -0.24 +
    gaussian(offsetMs, 205, 78) * 0.16
  );
}

function getWideEscapeBeatValueAtOffsetMs(offsetMs: number): number {
  return (
    gaussian(offsetMs, -55, 22) * -0.18 +
    gaussian(offsetMs, 0, 52) * 1.05 +
    gaussian(offsetMs, 95, 60) * -0.38 +
    gaussian(offsetMs, 310, 105) * 0.22
  );
}

function getPOnlyValueAtOffsetMs(offsetMs: number): number {
  return gaussian(offsetMs, 0, 42) * 0.13;
}

function getTdpRhythmValueAtTimeMs(timeMs: number): number {
  const beatMs = 60_000 / TDP_LOCKED_BPM;
  const phase = (((timeMs % beatMs) + beatMs) % beatMs) / beatMs;
  const twist =
    Math.sin((timeMs / TDP_TWIST_PERIOD_MS) * Math.PI * 2);
  const broadComplex =
    Math.sin(phase * Math.PI * 2 - 0.25) +
    Math.sin(phase * Math.PI * 4 + 0.55) * 0.34 +
    Math.sin(phase * Math.PI * 6 - 0.2) * 0.16;

  return broadComplex * twist * 1.35;
}

function getAflFlutterWaveValueAtTimeMs(timeMs: number): number {
  const flutterMs = 60_000 / AFL_ATRIAL_BPM;
  const phase = (((timeMs % flutterMs) + flutterMs) % flutterMs) / flutterMs;

  if (phase < 0.78) {
    return 0.18 - (phase / 0.78) * 0.38;
  }

  return -0.2 + ((phase - 0.78) / 0.22) * 0.38;
}

function getAflRhythmValueAtTimeMs(timeMs: number): number {
  const ventricularBeatMs = 60_000 / AFL_VENTRICULAR_BPM;
  const beatIndex = Math.floor(timeMs / ventricularBeatMs);
  let value = getAflFlutterWaveValueAtTimeMs(timeMs);

  for (let i = beatIndex - 1; i <= beatIndex + 1; i++) {
    const peakTimeMs = i * ventricularBeatMs + AFL_QRS_PEAK_OFFSET_MS;
    value += getNarrowQrsValueAtOffsetMs(timeMs - peakTimeMs);
  }

  return value;
}

function getAvBlock3RhythmValueAtTimeMs(timeMs: number): number {
  const pBeatMs = 60_000 / AV_BLOCK_P_BPM;
  const qrsBeatMs = 60_000 / AV_BLOCK_ESCAPE_BPM;
  const pIndex = Math.floor(timeMs / pBeatMs);
  const qrsIndex = Math.floor(
    (timeMs + AV_BLOCK_ESCAPE_PHASE_OFFSET_MS) / qrsBeatMs
  );
  let value = 0;

  for (let i = pIndex - 1; i <= pIndex + 1; i++) {
    const pPeakTimeMs = i * pBeatMs + AV_BLOCK_P_PEAK_OFFSET_MS;
    value += getPOnlyValueAtOffsetMs(timeMs - pPeakTimeMs);
  }

  for (let i = qrsIndex - 1; i <= qrsIndex + 1; i++) {
    const qrsPeakTimeMs =
      i * qrsBeatMs -
      AV_BLOCK_ESCAPE_PHASE_OFFSET_MS +
      AV_BLOCK_QRS_PEAK_OFFSET_MS;
    value += getWideEscapeBeatValueAtOffsetMs(timeMs - qrsPeakTimeMs);
  }

  return value;
}

function getAfQrsValueAtTimeMs(
  timeMs: number,
  bpm: number,
  beatIndex: number
): number {
  const qrsStartMs = getAfBeatStartMs(bpm, beatIndex);
  const dt = timeMs - qrsStartMs;

  return (
    gaussian(dt, 0, 8) * -0.16 +
    gaussian(dt, 24, 12) * 1.02 +
    gaussian(dt, 58, 18) * -0.24
  );
}

function getShockArtifactValueAtTimeMs(timeMs: number): number {
  const t = timeMs / 1000;
  const carrier =
    Math.sin(t * Math.PI * 2 * 74) +
    Math.sin(t * Math.PI * 2 * 113 + 0.9) * 0.72 +
    Math.sin(t * Math.PI * 2 * 167 + 1.7) * 0.5;
  const pseudoRandom =
    Math.sin(timeMs * 12.9898 + 78.233) *
    Math.sin(timeMs * 4.1414 + 19.19);

  return (carrier + pseudoRandom) * 2.2;
}

function getEcgValueAtTimeMs(
  template: BeatTemplate,
  timeMs: number,
  bpm: number
) {
  const beatMs = bpm > 0 ? 60_000 / bpm : template.durationMs;

  // timeMsを1拍内の位置に変換
  const phaseMs = ((timeMs % beatMs) + beatMs) % beatMs;

  // BPMに合わせて、1拍テンプレートを伸縮する
  const templateMs = (phaseMs / beatMs) * template.durationMs;

  return getTemplateValueAtMs(template, templateMs);
}

function seededUnitNoise(index: number): number {
  const value = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function getVariableBeatStartMs(
  beatIndex: number,
  getBeatDurationMs: (index: number) => number
): number {
  let startMs = 0;

  if (beatIndex >= 0) {
    for (let i = 0; i < beatIndex; i++) {
      startMs += getBeatDurationMs(i);
    }
  } else {
    for (let i = -1; i >= beatIndex; i--) {
      startMs -= getBeatDurationMs(i);
    }
  }

  return startMs;
}

function findVariableBeatIndex(
  timeMs: number,
  estimatedBeatMs: number,
  getBeatDurationMs: (index: number) => number,
  getBeatStartMs: (index: number) => number
): number {
  let beatIndex = Math.floor(timeMs / estimatedBeatMs);
  let beatStartMs = getBeatStartMs(beatIndex);
  let beatDurationMs = getBeatDurationMs(beatIndex);

  while (timeMs < beatStartMs) {
    beatIndex--;
    beatDurationMs = getBeatDurationMs(beatIndex);
    beatStartMs -= beatDurationMs;
  }

  while (timeMs >= beatStartMs + beatDurationMs) {
    beatStartMs += beatDurationMs;
    beatIndex++;
    beatDurationMs = getBeatDurationMs(beatIndex);
  }

  return beatIndex;
}

function getIrregularBeatDurationMs(baseBeatMs: number, beatIndex: number): number {
  return baseBeatMs * (0.8 + seededUnitNoise(beatIndex) * 0.4);
}

function getIrregularBeatStartMs(baseBeatMs: number, beatIndex: number): number {
  return getVariableBeatStartMs(beatIndex, (index) =>
    getIrregularBeatDurationMs(baseBeatMs, index)
  );
}

function findIrregularBeatIndex(timeMs: number, baseBeatMs: number): number {
  return findVariableBeatIndex(
    timeMs,
    baseBeatMs,
    (index) => getIrregularBeatDurationMs(baseBeatMs, index),
    (index) => getIrregularBeatStartMs(baseBeatMs, index)
  );
}

function getAfBaseBpm(bpm: number): number {
  return Math.max(1, Math.round(bpm));
}

function getAfBeatBpm(bpm: number, beatIndex: number): number {
  const baseBpm = getAfBaseBpm(bpm);
  const minBpm = baseBpm * (1 - AF_BPM_VARIATION);
  const maxBpm = baseBpm * (1 + AF_BPM_VARIATION);

  return minBpm + seededUnitNoise(beatIndex * 3.917 + 17.31) * (maxBpm - minBpm);
}

function getAfBeatDurationMs(bpm: number, beatIndex: number): number {
  return 60_000 / getAfBeatBpm(bpm, beatIndex);
}

function getAfTimingCache(bpm: number): {
  forwardBeatStartsMs: number[];
  backwardBeatStartsMs: number[];
} {
  const baseBpm = getAfBaseBpm(bpm);
  let cache = afTimingCaches.get(baseBpm);

  if (!cache) {
    cache = { forwardBeatStartsMs: [0], backwardBeatStartsMs: [0] };
    afTimingCaches.set(baseBpm, cache);
  }

  return cache;
}

function getAfBeatStartMs(bpm: number, beatIndex: number): number {
  const cache = getAfTimingCache(bpm);

  if (beatIndex >= 0) {
    for (let i = cache.forwardBeatStartsMs.length; i <= beatIndex; i++) {
      cache.forwardBeatStartsMs[i] =
        cache.forwardBeatStartsMs[i - 1] + getAfBeatDurationMs(bpm, i - 1);
    }
    return cache.forwardBeatStartsMs[beatIndex];
  }

  const cacheIndex = -beatIndex;
  for (let i = cache.backwardBeatStartsMs.length; i <= cacheIndex; i++) {
    cache.backwardBeatStartsMs[i] =
      cache.backwardBeatStartsMs[i - 1] - getAfBeatDurationMs(bpm, -i);
  }

  return cache.backwardBeatStartsMs[cacheIndex];
}

function findAfBeatIndex(timeMs: number, bpm: number): number {
  const baseBpm = getAfBaseBpm(bpm);

  return findVariableBeatIndex(
    timeMs,
    60_000 / baseBpm,
    (index) => getAfBeatDurationMs(baseBpm, index),
    (index) => getAfBeatStartMs(baseBpm, index)
  );
}

function getAfEcgValueAtTimeMs(timeMs: number, bpm: number) {
  const beatIndex = findAfBeatIndex(timeMs, bpm);
  const qrs =
    getAfQrsValueAtTimeMs(timeMs, bpm, beatIndex - 1) +
    getAfQrsValueAtTimeMs(timeMs, bpm, beatIndex) +
    getAfQrsValueAtTimeMs(timeMs, bpm, beatIndex + 1);

  return getAfBaselineValueAtTimeMs(timeMs) + qrs;
}

function getIrregularEcgValueAtTimeMs(
  template: BeatTemplate,
  timeMs: number,
  bpm: number
) {
  const baseBeatMs = 60_000 / Math.max(bpm, 1);
  const beatIndex = findIrregularBeatIndex(timeMs, baseBeatMs);
  const beatStartMs = getIrregularBeatStartMs(baseBeatMs, beatIndex);
  const beatDurationMs = getIrregularBeatDurationMs(baseBeatMs, beatIndex);
  const phaseMs = timeMs - beatStartMs;
  const templateMs = (phaseMs / beatDurationMs) * template.durationMs;

  return getTemplateValueAtMs(template, templateMs);
}

function getRhythmValueAtTimeMs(
  template: BeatTemplate,
  timeMs: number,
  bpm: number,
  rhythm: ECGCaseRhythm
) {
  const effectiveBpm = getEffectiveBpmForTemplate(template, bpm);

  if (isVfTemplate(template)) {
    return getVfChaosValueAtTimeMs(timeMs);
  }

  if (isSvtTemplate(template)) {
    return getSvtRhythmValueAtTimeMs(timeMs);
  }

  if (isTdpTemplate(template)) {
    return getTdpRhythmValueAtTimeMs(timeMs);
  }

  if (isAflTemplate(template)) {
    return getAflRhythmValueAtTimeMs(timeMs);
  }

  if (isAvBlock3Template(template)) {
    return getAvBlock3RhythmValueAtTimeMs(timeMs);
  }

  if (isStemiTemplate(template)) {
    return getStemiRhythmValueAtTimeMs(timeMs, effectiveBpm);
  }

  if (isPvcTemplate(template)) {
    return getPvcRhythmValueAtTimeMs(timeMs, effectiveBpm);
  }

  if (isPacTemplate(template)) {
    return getPacRhythmValueAtTimeMs(timeMs, effectiveBpm);
  }

  if (isMobitz2Template(template)) {
    return getMobitz2RhythmValueAtTimeMs(timeMs, effectiveBpm);
  }

  if (isWenckebachTemplate(template)) {
    return getWenckebachRhythmValueAtTimeMs(timeMs, effectiveBpm);
  }

  if (isAfTemplate(template)) {
    return getAfEcgValueAtTimeMs(timeMs, effectiveBpm);
  }

  if (rhythm === "irregular" && effectiveBpm > 0) {
    return getIrregularEcgValueAtTimeMs(template, timeMs, effectiveBpm);
  }

  return getEcgValueAtTimeMs(template, timeMs, effectiveBpm);
}

function getTimelineValueAtTimeMs(
  shockEvent: ShockEvent | null,
  template: BeatTemplate,
  timeMs: number,
  bpm: number,
  rhythm: ECGCaseRhythm
): number {
  if (!shockEvent) {
    return getRhythmValueAtTimeMs(template, timeMs, bpm, rhythm);
  }

  const msSinceShock = timeMs - shockEvent.startMs;

  if (msSinceShock < 0) {
    return getRhythmValueAtTimeMs(
      shockEvent.sourceTemplate,
      timeMs,
      shockEvent.sourceBpm,
      shockEvent.sourceRhythm
    );
  }

  if (msSinceShock < SHOCK_ARTIFACT_MS) {
    return getShockArtifactValueAtTimeMs(timeMs);
  }

  if (msSinceShock < SHOCK_FLATLINE_END_MS) {
    return 0;
  }

  return getRhythmValueAtTimeMs(
    shockEvent.recoveryTemplate,
    msSinceShock - SHOCK_FLATLINE_END_MS,
    shockEvent.recoveryBpm,
    shockEvent.recoveryRhythm
  );
}

function getFiducialFractionsInBeat(template: BeatTemplate): number[] {
  return Object.values(template.fiducialsMs)
    .filter((value): value is number => typeof value === "number")
    .map((templateMs) => templateMs / template.durationMs);
}

function forEachQrsPeakInRange(
  template: BeatTemplate,
  fromMs: number,
  toMs: number,
  bpm: number,
  rhythm: ECGCaseRhythm,
  callback: (timeMs: number) => void
) {
  if (toMs <= fromMs || isVfTemplate(template)) return;
  const activeBpm = getEffectiveBpmForTemplate(template, bpm);

  if (isPvcTemplate(template)) {
    const cycleMs = getPvcCycleMs(activeBpm);
    const firstCycleIndex = Math.floor(fromMs / cycleMs) - 1;
    const lastCycleIndex = Math.floor(toMs / cycleMs) + 1;
    const beatMs = getPvcBeatMs(activeBpm);
    const pvcPeakOffsetMs =
      (PVC_EVERY_N_BEATS - 1 + PVC_PREMATURE_FRACTION) * beatMs +
      PVC_PEAK_OFFSET_MS;
    const nsrRPeakOffsetMs =
      ((DEFAULT_TEMPLATE.fiducialsMs.r ?? 400) / DEFAULT_TEMPLATE.durationMs) *
      beatMs;

    for (
      let cycleIndex = firstCycleIndex;
      cycleIndex <= lastCycleIndex;
      cycleIndex++
    ) {
      const cycleStartMs = cycleIndex * cycleMs;

      for (let beatIndex = 0; beatIndex < PVC_EVERY_N_BEATS - 1; beatIndex++) {
        const peakTimeMs = cycleStartMs + beatIndex * beatMs + nsrRPeakOffsetMs;
        if (peakTimeMs > fromMs && peakTimeMs <= toMs) {
          callback(peakTimeMs);
        }
      }

      const pvcPeakTimeMs = cycleStartMs + pvcPeakOffsetMs;
      if (pvcPeakTimeMs > fromMs && pvcPeakTimeMs <= toMs) {
        callback(pvcPeakTimeMs);
      }
    }
    return;
  }

  if (isPacTemplate(template)) {
    const cycleMs = getPacCycleMs(activeBpm);
    const firstCycleIndex = Math.floor(fromMs / cycleMs) - 1;
    const lastCycleIndex = Math.floor(toMs / cycleMs) + 1;
    const beatMs = getPacBeatMs(activeBpm);
    const pacPeakOffsetMs =
      (PAC_EVERY_N_BEATS - 1 + PAC_PREMATURE_FRACTION) * beatMs +
      ((DEFAULT_TEMPLATE.fiducialsMs.r ?? 350) / DEFAULT_TEMPLATE.durationMs) *
        getPacDurationMs(activeBpm);
    const nsrRPeakOffsetMs =
      ((DEFAULT_TEMPLATE.fiducialsMs.r ?? 350) / DEFAULT_TEMPLATE.durationMs) *
      beatMs;

    for (
      let cycleIndex = firstCycleIndex;
      cycleIndex <= lastCycleIndex;
      cycleIndex++
    ) {
      const cycleStartMs = cycleIndex * cycleMs;

      for (let beatIndex = 0; beatIndex < PAC_EVERY_N_BEATS - 1; beatIndex++) {
        const peakTimeMs = cycleStartMs + beatIndex * beatMs + nsrRPeakOffsetMs;
        if (peakTimeMs > fromMs && peakTimeMs <= toMs) {
          callback(peakTimeMs);
        }
      }

      const pacPeakTimeMs = cycleStartMs + pacPeakOffsetMs;
      if (pacPeakTimeMs > fromMs && pacPeakTimeMs <= toMs) {
        callback(pacPeakTimeMs);
      }
    }
    return;
  }

  if (isTdpTemplate(template)) {
    const beatMs = 60_000 / TDP_LOCKED_BPM;
    const firstBeatIndex =
      Math.floor((fromMs - TDP_QRS_PEAK_OFFSET_MS) / beatMs) - 1;
    const lastBeatIndex =
      Math.floor((toMs - TDP_QRS_PEAK_OFFSET_MS) / beatMs) + 1;

    for (
      let beatIndex = firstBeatIndex;
      beatIndex <= lastBeatIndex;
      beatIndex++
    ) {
      const peakTimeMs = beatIndex * beatMs + TDP_QRS_PEAK_OFFSET_MS;
      if (peakTimeMs > fromMs && peakTimeMs <= toMs) {
        callback(peakTimeMs);
      }
    }
    return;
  }

  if (isAflTemplate(template)) {
    const beatMs = 60_000 / AFL_VENTRICULAR_BPM;
    const firstBeatIndex =
      Math.floor((fromMs - AFL_QRS_PEAK_OFFSET_MS) / beatMs) - 1;
    const lastBeatIndex =
      Math.floor((toMs - AFL_QRS_PEAK_OFFSET_MS) / beatMs) + 1;

    for (
      let beatIndex = firstBeatIndex;
      beatIndex <= lastBeatIndex;
      beatIndex++
    ) {
      const peakTimeMs = beatIndex * beatMs + AFL_QRS_PEAK_OFFSET_MS;
      if (peakTimeMs > fromMs && peakTimeMs <= toMs) {
        callback(peakTimeMs);
      }
    }
    return;
  }

  if (isAvBlock3Template(template)) {
    const beatMs = 60_000 / AV_BLOCK_ESCAPE_BPM;
    const firstBeatIndex =
      Math.floor(
        (fromMs + AV_BLOCK_ESCAPE_PHASE_OFFSET_MS - AV_BLOCK_QRS_PEAK_OFFSET_MS) /
          beatMs
      ) - 1;
    const lastBeatIndex =
      Math.floor(
        (toMs + AV_BLOCK_ESCAPE_PHASE_OFFSET_MS - AV_BLOCK_QRS_PEAK_OFFSET_MS) /
          beatMs
      ) + 1;

    for (
      let beatIndex = firstBeatIndex;
      beatIndex <= lastBeatIndex;
      beatIndex++
    ) {
      const peakTimeMs =
        beatIndex * beatMs -
        AV_BLOCK_ESCAPE_PHASE_OFFSET_MS +
        AV_BLOCK_QRS_PEAK_OFFSET_MS;
      if (peakTimeMs > fromMs && peakTimeMs <= toMs) {
        callback(peakTimeMs);
      }
    }
    return;
  }

  if (isMobitz2Template(template)) {
    const beatMs =
      activeBpm > 0 ? 60_000 / activeBpm : DEFAULT_TEMPLATE.durationMs;
    const qrsPeakTemplateMs =
      DEFAULT_TEMPLATE.fiducialsMs.r ?? DEFAULT_TEMPLATE.fiducialsMs.qrsOn ?? 0;
    const qrsPeakOffsetMs =
      (qrsPeakTemplateMs / DEFAULT_TEMPLATE.durationMs) * beatMs;
    const firstBeatIndex = Math.floor((fromMs - qrsPeakOffsetMs) / beatMs) - 1;
    const lastBeatIndex = Math.floor((toMs - qrsPeakOffsetMs) / beatMs) + 1;

    for (
      let beatIndex = firstBeatIndex;
      beatIndex <= lastBeatIndex;
      beatIndex++
    ) {
      if (isMobitz2DroppedBeat(beatIndex)) continue;
      const peakTimeMs = beatIndex * beatMs + qrsPeakOffsetMs;
      if (peakTimeMs > fromMs && peakTimeMs <= toMs) {
        callback(peakTimeMs);
      }
    }
    return;
  }

  if (isWenckebachTemplate(template)) {
    const beatMs = getWenckebachBeatMs(activeBpm);
    const firstBeatIndex = Math.floor(fromMs / beatMs) - 2;
    const lastBeatIndex = Math.floor(toMs / beatMs) + 2;

    for (
      let beatIndex = firstBeatIndex;
      beatIndex <= lastBeatIndex;
      beatIndex++
    ) {
      const qrsPeakOffsetMs = getWenckebachQrsPeakOffsetMs(beatMs, beatIndex);
      if (qrsPeakOffsetMs === null) continue;

      const peakTimeMs = beatIndex * beatMs + qrsPeakOffsetMs;
      if (peakTimeMs > fromMs && peakTimeMs <= toMs) {
        callback(peakTimeMs);
      }
    }
    return;
  }

  if (isAfTemplate(template)) {
    const firstBeatIndex = findAfBeatIndex(fromMs, activeBpm) - 1;
    const lastBeatIndex = findAfBeatIndex(toMs, activeBpm) + 1;

    for (let beatIndex = firstBeatIndex; beatIndex <= lastBeatIndex; beatIndex++) {
      const peakTimeMs =
        getAfBeatStartMs(activeBpm, beatIndex) + AF_QRS_PEAK_OFFSET_MS;
      if (peakTimeMs > fromMs && peakTimeMs <= toMs) {
        callback(peakTimeMs);
      }
    }
    return;
  }

  const beatMs = activeBpm > 0 ? 60_000 / activeBpm : template.durationMs;
  const qrsPeakTemplateMs =
    template.fiducialsMs.r ?? template.fiducialsMs.qrsOn ?? 0;

  if (rhythm === "irregular" && activeBpm > 0) {
    const firstBeatIndex = findIrregularBeatIndex(fromMs, beatMs) - 1;
    const lastBeatIndex = findIrregularBeatIndex(toMs, beatMs) + 1;

    for (let beatIndex = firstBeatIndex; beatIndex <= lastBeatIndex; beatIndex++) {
      const beatStartMs = getIrregularBeatStartMs(beatMs, beatIndex);
      const beatDurationMs = getIrregularBeatDurationMs(beatMs, beatIndex);
      const peakTimeMs =
        beatStartMs + (qrsPeakTemplateMs / template.durationMs) * beatDurationMs;
      if (peakTimeMs > fromMs && peakTimeMs <= toMs) {
        callback(peakTimeMs);
      }
    }
    return;
  }

  const qrsPeakOffsetMs = (qrsPeakTemplateMs / template.durationMs) * beatMs;
  const firstBeatIndex = Math.floor((fromMs - qrsPeakOffsetMs) / beatMs) - 1;
  const lastBeatIndex = Math.floor((toMs - qrsPeakOffsetMs) / beatMs) + 1;

  for (let beatIndex = firstBeatIndex; beatIndex <= lastBeatIndex; beatIndex++) {
    const peakTimeMs = beatIndex * beatMs + qrsPeakOffsetMs;
    if (peakTimeMs > fromMs && peakTimeMs <= toMs) {
      callback(peakTimeMs);
    }
  }
}

function forEachPvcRhythmPeakInRange(
  fromMs: number,
  toMs: number,
  bpm: number,
  onNormalPeak: () => void,
  onPvcPeak: () => void
) {
  if (toMs <= fromMs) return;

  const cycleMs = getPvcCycleMs(bpm);
  const beatMs = getPvcBeatMs(bpm);
  const firstCycleIndex = Math.floor(fromMs / cycleMs) - 1;
  const lastCycleIndex = Math.floor(toMs / cycleMs) + 1;
  const nsrRPeakOffsetMs =
    ((DEFAULT_TEMPLATE.fiducialsMs.r ?? 400) / DEFAULT_TEMPLATE.durationMs) *
    beatMs;
  const pvcPeakOffsetMs =
    (PVC_EVERY_N_BEATS - 1 + PVC_PREMATURE_FRACTION) * beatMs +
    PVC_PEAK_OFFSET_MS;

  for (
    let cycleIndex = firstCycleIndex;
    cycleIndex <= lastCycleIndex;
    cycleIndex++
  ) {
    const cycleStartMs = cycleIndex * cycleMs;

    for (let beatIndex = 0; beatIndex < PVC_EVERY_N_BEATS - 1; beatIndex++) {
      const peakTimeMs = cycleStartMs + beatIndex * beatMs + nsrRPeakOffsetMs;
      if (peakTimeMs > fromMs && peakTimeMs <= toMs) {
        onNormalPeak();
      }
    }

    const pvcPeakTimeMs = cycleStartMs + pvcPeakOffsetMs;
    if (pvcPeakTimeMs > fromMs && pvcPeakTimeMs <= toMs) {
      onPvcPeak();
    }
  }
}

function buildWaveformSampleXs(
  width: number,
  visibleMs: number,
  elapsedMs: number,
  bpm: number,
  template: BeatTemplate,
  rhythm: ECGCaseRhythm
): number[] {
  const xs: number[] = [];
  const activeBpm = getEffectiveBpmForTemplate(template, bpm);

  for (let x = 0; x < width; x += WAVEFORM_SAMPLE_STEP_PX) {
    xs.push(x);
  }
  xs.push(width);

  const beatMs = activeBpm > 0 ? 60_000 / activeBpm : template.durationMs;
  const visibleStartMs = elapsedMs - visibleMs;
  const fiducialFractions = getFiducialFractionsInBeat(template);
  if (isPvcTemplate(template)) {
    const cycleMs = getPvcCycleMs(activeBpm);
    const beatMs = getPvcBeatMs(activeBpm);
    const firstCycleIndex = Math.floor(visibleStartMs / cycleMs) - 1;
    const lastCycleIndex = Math.floor(elapsedMs / cycleMs) + 1;
    const nsrFiducialFractions = getFiducialFractionsInBeat(DEFAULT_TEMPLATE);

    for (
      let cycleIndex = firstCycleIndex;
      cycleIndex <= lastCycleIndex;
      cycleIndex++
    ) {
      const cycleStartMs = cycleIndex * cycleMs;
      const pvcStartMs =
        cycleStartMs +
        (PVC_EVERY_N_BEATS - 1 + PVC_PREMATURE_FRACTION) * beatMs;

      for (let beatIndex = 0; beatIndex < PVC_EVERY_N_BEATS - 1; beatIndex++) {
        const beatStartMs = cycleStartMs + beatIndex * beatMs;
        for (const fiducialFraction of nsrFiducialFractions) {
          const sampleTimeMs = beatStartMs + fiducialFraction * beatMs;
          if (sampleTimeMs < visibleStartMs || sampleTimeMs > elapsedMs) {
            continue;
          }
          const x = ((sampleTimeMs - visibleStartMs) / visibleMs) * width;
          if (x >= 0 && x <= width) xs.push(x);
        }
      }

      for (const offsetMs of [
        0,
        58,
        150,
        PVC_PEAK_OFFSET_MS,
        265,
        455,
        PVC_DURATION_MS,
      ]) {
        const sampleTimeMs = pvcStartMs + offsetMs;
        if (sampleTimeMs < visibleStartMs || sampleTimeMs > elapsedMs) continue;
        const x = ((sampleTimeMs - visibleStartMs) / visibleMs) * width;
        if (x >= 0 && x <= width) xs.push(x);
      }
    }

    return xs.sort((a, b) => a - b);
  }

  if (isPacTemplate(template)) {
    const cycleMs = getPacCycleMs(activeBpm);
    const beatMs = getPacBeatMs(activeBpm);
    const firstCycleIndex = Math.floor(visibleStartMs / cycleMs) - 1;
    const lastCycleIndex = Math.floor(elapsedMs / cycleMs) + 1;
    const nsrFiducialFractions = getFiducialFractionsInBeat(DEFAULT_TEMPLATE);

    for (
      let cycleIndex = firstCycleIndex;
      cycleIndex <= lastCycleIndex;
      cycleIndex++
    ) {
      const cycleStartMs = cycleIndex * cycleMs;
      const pacStartMs =
        cycleStartMs +
        (PAC_EVERY_N_BEATS - 1 + PAC_PREMATURE_FRACTION) * beatMs;
      const pacDurationMs = getPacDurationMs(activeBpm);

      for (let beatIndex = 0; beatIndex < PAC_EVERY_N_BEATS - 1; beatIndex++) {
        const beatStartMs = cycleStartMs + beatIndex * beatMs;
        for (const fiducialFraction of nsrFiducialFractions) {
          const sampleTimeMs = beatStartMs + fiducialFraction * beatMs;
          if (sampleTimeMs < visibleStartMs || sampleTimeMs > elapsedMs) {
            continue;
          }
          const x = ((sampleTimeMs - visibleStartMs) / visibleMs) * width;
          if (x >= 0 && x <= width) xs.push(x);
        }
      }

      for (const fiducialFraction of nsrFiducialFractions) {
        const sampleTimeMs = pacStartMs + fiducialFraction * pacDurationMs;
        if (sampleTimeMs < visibleStartMs || sampleTimeMs > elapsedMs) continue;
        const x = ((sampleTimeMs - visibleStartMs) / visibleMs) * width;
        if (x >= 0 && x <= width) xs.push(x);
      }
    }

    return xs.sort((a, b) => a - b);
  }

  if (isMobitz2Template(template)) {
    const beatMs =
      activeBpm > 0 ? 60_000 / activeBpm : DEFAULT_TEMPLATE.durationMs;
    const firstBeatIndex = Math.floor(visibleStartMs / beatMs) - 1;
    const lastBeatIndex = Math.floor(elapsedMs / beatMs) + 1;
    const nsrFiducialFractions = getFiducialFractionsInBeat(DEFAULT_TEMPLATE);
    const pOnlyFractions = [
      DEFAULT_TEMPLATE.fiducialsMs.pOn,
      DEFAULT_TEMPLATE.fiducialsMs.pPeak,
      DEFAULT_TEMPLATE.fiducialsMs.pOff,
    ]
      .filter((value): value is number => typeof value === "number")
      .map((templateMs) => templateMs / DEFAULT_TEMPLATE.durationMs);

    for (
      let beatIndex = firstBeatIndex;
      beatIndex <= lastBeatIndex;
      beatIndex++
    ) {
      const beatStartMs = beatIndex * beatMs;
      const fractions = isMobitz2DroppedBeat(beatIndex)
        ? pOnlyFractions
        : nsrFiducialFractions;

      for (const fiducialFraction of fractions) {
        const sampleTimeMs = beatStartMs + fiducialFraction * beatMs;
        if (sampleTimeMs < visibleStartMs || sampleTimeMs > elapsedMs) continue;
        const x = ((sampleTimeMs - visibleStartMs) / visibleMs) * width;
        if (x >= 0 && x <= width) xs.push(x);
      }
    }

    return xs.sort((a, b) => a - b);
  }

  if (isWenckebachTemplate(template)) {
    const beatMs = getWenckebachBeatMs(activeBpm);
    const firstBeatIndex = Math.floor(visibleStartMs / beatMs) - 1;
    const lastBeatIndex = Math.floor(elapsedMs / beatMs) + 1;

    for (
      let beatIndex = firstBeatIndex;
      beatIndex <= lastBeatIndex;
      beatIndex++
    ) {
      const beatStartMs = beatIndex * beatMs;
      const pPeakOffsetMs = getWenckebachPPeakOffsetMs(beatMs);
      const qrsPeakOffsetMs = getWenckebachQrsPeakOffsetMs(beatMs, beatIndex);
      const sampleOffsets = [
        pPeakOffsetMs - 70,
        pPeakOffsetMs,
        pPeakOffsetMs + 70,
      ];

      if (qrsPeakOffsetMs !== null) {
        sampleOffsets.push(
          qrsPeakOffsetMs - 35,
          qrsPeakOffsetMs,
          qrsPeakOffsetMs + 45,
          qrsPeakOffsetMs + 205
        );
      }

      for (const sampleOffsetMs of sampleOffsets) {
        const sampleTimeMs = beatStartMs + sampleOffsetMs;
        if (sampleTimeMs < visibleStartMs || sampleTimeMs > elapsedMs) continue;
        const x = ((sampleTimeMs - visibleStartMs) / visibleMs) * width;
        if (x >= 0 && x <= width) xs.push(x);
      }
    }

    return xs.sort((a, b) => a - b);
  }

  const hasAfTiming = isAfTemplate(template);
  const hasIrregularTiming = !hasAfTiming && rhythm === "irregular";
  const firstBeatIndex = hasAfTiming
    ? findAfBeatIndex(visibleStartMs, activeBpm) - 1
    : hasIrregularTiming
      ? findIrregularBeatIndex(visibleStartMs, beatMs) - 1
      : Math.floor(visibleStartMs / beatMs) - 1;
  const lastBeatIndex = hasAfTiming
    ? findAfBeatIndex(elapsedMs, activeBpm) + 1
    : hasIrregularTiming
      ? findIrregularBeatIndex(elapsedMs, beatMs) + 1
      : Math.floor(elapsedMs / beatMs) + 1;

  for (let beatIndex = firstBeatIndex; beatIndex <= lastBeatIndex; beatIndex++) {
    const beatStartMs = hasAfTiming
      ? getAfBeatStartMs(activeBpm, beatIndex)
      : hasIrregularTiming
        ? getIrregularBeatStartMs(beatMs, beatIndex)
        : beatIndex * beatMs;
    const beatDurationMs = hasAfTiming
      ? getAfBeatDurationMs(activeBpm, beatIndex)
      : hasIrregularTiming
        ? getIrregularBeatDurationMs(beatMs, beatIndex)
        : beatMs;

    for (const fiducialFraction of fiducialFractions) {
      const sampleTimeMs = beatStartMs + fiducialFraction * beatDurationMs;
      if (sampleTimeMs < visibleStartMs || sampleTimeMs > elapsedMs) continue;

      const x = ((sampleTimeMs - visibleStartMs) / visibleMs) * width;
      if (x >= 0 && x <= width) {
        xs.push(x);
      }
    }
  }

  return xs.sort((a, b) => a - b);
}

function getTemplateRange(template: BeatTemplate): { min: number; max: number } {
  if (isVfTemplate(template)) {
    return VF_DISPLAY_RANGE_MV;
  }

  if (isPvcTemplate(template)) {
    return PVC_DISPLAY_RANGE_MV;
  }

  if (
    isPacTemplate(template) ||
    isMobitz2Template(template) ||
    isWenckebachTemplate(template)
  ) {
    return MOBITZ2_DISPLAY_RANGE_MV;
  }

  if (isSvtTemplate(template)) {
    return SVT_DISPLAY_RANGE_MV;
  }

  if (isStemiTemplate(template)) {
    return STEMI_DISPLAY_RANGE_MV;
  }

  if (isTdpTemplate(template)) {
    return TDP_DISPLAY_RANGE_MV;
  }

  if (isAflTemplate(template)) {
    return AFL_DISPLAY_RANGE_MV;
  }

  if (isAvBlock3Template(template)) {
    return AV_BLOCK3_DISPLAY_RANGE_MV;
  }

  if (isAfTemplate(template)) {
    return AF_DISPLAY_RANGE_MV;
  }

  let min = 0;
  let max = 0;

  for (const sample of template.samplesMv) {
    min = Math.min(min, sample);
    max = Math.max(max, sample);
  }

  return { min, max };
}

function getTimelineRange(
  template: BeatTemplate,
  shockEvent: ShockEvent | null
): { min: number; max: number } {
  if (!shockEvent) {
    return getTemplateRange(template);
  }

  const sourceRange = getTemplateRange(shockEvent.sourceTemplate);
  const currentRange = getTemplateRange(template);
  const recoveryRange = getTemplateRange(shockEvent.recoveryTemplate);

  return {
    min: Math.min(sourceRange.min, currentRange.min, recoveryRange.min),
    max: Math.max(sourceRange.max, currentRange.max, recoveryRange.max),
  };
}

function getWaveformLayout(
  template: BeatTemplate,
  shockEvent: ShockEvent | null,
  height: number,
  preferredPxPerMv: number
): { baselineY: number; pxPerMv: number } {
  const { min, max } = getTimelineRange(template, shockEvent);
  const availableHeight = Math.max(1, height - WAVEFORM_VERTICAL_PADDING_PX * 2);
  const maxAbsAmplitude = Math.max(0.1, Math.abs(min), Math.abs(max));
  const fittedPxPerMv = availableHeight / (maxAbsAmplitude * 2);
  const nextPxPerMv = Math.min(preferredPxPerMv, fittedPxPerMv);
  const baselineY = height / 2;

  return { baselineY, pxPerMv: nextPxPerMv };
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  ctx.save();

  // 背景
  ctx.fillStyle = "#fff7f7";
  ctx.fillRect(0, 0, width, height);

  // 小マス
  ctx.strokeStyle = "#f3caca";
  ctx.lineWidth = 0.5;

  const small = 10;

  ctx.beginPath();
  for (let x = 0; x <= width; x += small) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = 0; y <= height; y += small) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  // 大マス
  ctx.strokeStyle = "#e59a9a";
  ctx.lineWidth = 1;

  const large = small * 5;

  ctx.beginPath();
  for (let x = 0; x <= width; x += large) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = 0; y <= height; y += large) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  ctx.restore();
}

export const EcgCanvas = forwardRef<EcgCanvasHandle, EcgCanvasProps>(
function EcgCanvas(
  {
    template = DEFAULT_TEMPLATE,
    displayLabel,
    bpm = 60,
    rhythm = "regular",
    onShockComplete,
    onLiveBpmChange,
    audioMuted = true,
    audioVolume = 0.45,
    showAnnotations = false,
    annotationCaseId,
    width,
    height,
    secondsVisible = 6,
    pxPerMv = 80,
    className,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const elapsedMsRef = useRef(0);
  const shockEventRef = useRef<ShockEvent | null>(null);
  const latestSignalRef = useRef({ bpm, rhythm, template });
  const onShockCompleteRef = useRef(onShockComplete);
  const onLiveBpmChangeRef = useRef(onLiveBpmChange);
  const lastReportedLiveBpmRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const flatlineOscillatorRef = useRef<OscillatorNode | null>(null);
  const flatlineGainRef = useRef<GainNode | null>(null);
  const lastAudioScanMsRef = useRef(0);
  const lastVfAlarmMsRef = useRef(-Infinity);
  const audioSettingsRef = useRef({ muted: audioMuted, volume: audioVolume });
  const [isShockFlashVisible, setIsShockFlashVisible] = useState(false);

  latestSignalRef.current = {
    bpm: getEffectiveBpmForTemplate(template, bpm),
    rhythm,
    template,
  };

  useEffect(() => {
    onShockCompleteRef.current = onShockComplete;
  }, [onShockComplete]);

  useEffect(() => {
    onLiveBpmChangeRef.current = onLiveBpmChange;
  }, [onLiveBpmChange]);

  useEffect(() => {
    audioSettingsRef.current = { muted: audioMuted, volume: audioVolume };
    const masterGain = masterGainRef.current;

    if (masterGain) {
      const context = audioContextRef.current;
      const nextGain = audioMuted ? 0 : audioVolume;
      if (context) {
        masterGain.gain.setTargetAtTime(nextGain, context.currentTime, 0.015);
      } else {
        masterGain.gain.value = nextGain;
      }
    }

    if (audioMuted || audioVolume <= 0) {
      const context = audioContextRef.current;
      const oscillator = flatlineOscillatorRef.current;
      const gain = flatlineGainRef.current;

      if (context && oscillator && gain) {
        gain.gain.setTargetAtTime(0.0001, context.currentTime, 0.015);
        oscillator.stop(context.currentTime + 0.08);
      }

      flatlineOscillatorRef.current = null;
      flatlineGainRef.current = null;
    }
  }, [audioMuted, audioVolume]);

  useEffect(() => {
    return () => {
      flatlineOscillatorRef.current?.stop();
      audioContextRef.current?.close();
    };
  }, []);

  function shouldPlayAudio() {
    const { muted, volume } = audioSettingsRef.current;
    return !muted && volume > 0;
  }

  function ensureAudioContext() {
    if (typeof window === "undefined") return null;

    if (!audioContextRef.current) {
      const context = new AudioContext();
      const masterGain = context.createGain();
      masterGain.gain.value = audioSettingsRef.current.muted
        ? 0
        : audioSettingsRef.current.volume;
      masterGain.connect(context.destination);
      audioContextRef.current = context;
      masterGainRef.current = masterGain;
    }

    const context = audioContextRef.current;
    if (context.state === "suspended") {
      void context.resume();
    }

    return context;
  }

  function playTone(
    frequencyHz: number,
    durationSec: number,
    peakGain: number,
    type: OscillatorType = "sine"
  ) {
    if (!shouldPlayAudio()) return;

    const context = ensureAudioContext();
    const masterGain = masterGainRef.current;
    if (!context || !masterGain) return;

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequencyHz, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    oscillator.connect(gain);
    gain.connect(masterGain);
    oscillator.start(now);
    oscillator.stop(now + durationSec + 0.02);
  }

  function playQrsBeep() {
    playTone(ECG_BEEP_FREQUENCY_HZ, ECG_BEEP_DURATION_SEC, 0.08);
  }

  function playPvcBeep() {
    playTone(PVC_BEEP_FREQUENCY_HZ, PVC_BEEP_DURATION_SEC, 0.09, "triangle");
  }

  function playVfAlarmPulse() {
    playTone(VF_ALARM_FREQUENCY_HZ, 0.14, 0.055, "triangle");
  }

  function playShockSound() {
    if (!shouldPlayAudio()) return;

    const context = ensureAudioContext();
    const masterGain = masterGainRef.current;
    if (!context || !masterGain) return;

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(180, now);
    oscillator.frequency.exponentialRampToValueAtTime(48, now + 0.18);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

    oscillator.connect(gain);
    gain.connect(masterGain);
    oscillator.start(now);
    oscillator.stop(now + 0.22);
  }

  function startFlatlineTone() {
    if (!shouldPlayAudio() || flatlineOscillatorRef.current) return;

    const context = ensureAudioContext();
    const masterGain = masterGainRef.current;
    if (!context || !masterGain) return;

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.setTargetAtTime(0.035, now, 0.025);

    oscillator.connect(gain);
    gain.connect(masterGain);
    oscillator.start(now);

    flatlineOscillatorRef.current = oscillator;
    flatlineGainRef.current = gain;
  }

  function stopFlatlineTone() {
    const oscillator = flatlineOscillatorRef.current;
    const gain = flatlineGainRef.current;
    const context = audioContextRef.current;
    if (!oscillator || !gain || !context) return;

    gain.gain.setTargetAtTime(0.0001, context.currentTime, 0.02);
    oscillator.stop(context.currentTime + 0.08);
    flatlineOscillatorRef.current = null;
    flatlineGainRef.current = null;
  }

  function triggerVfAlarmIfDue(elapsedMs: number) {
    if (elapsedMs - lastVfAlarmMsRef.current < VF_ALARM_INTERVAL_MS) return;
    lastVfAlarmMsRef.current = elapsedMs;
    playVfAlarmPulse();
  }

  function syncAudio(
    previousElapsedMs: number,
    elapsedMs: number,
    shockEvent: ShockEvent | null,
    activeTemplate: BeatTemplate,
    activeBpm: number,
    activeRhythm: ECGCaseRhythm
  ) {
    if (!shouldPlayAudio()) {
      stopFlatlineTone();
      return;
    }

    if (!shockEvent) {
      stopFlatlineTone();

      if (isVfTemplate(activeTemplate)) {
        triggerVfAlarmIfDue(elapsedMs);
        return;
      }

      if (isPvcTemplate(activeTemplate)) {
        forEachPvcRhythmPeakInRange(
          previousElapsedMs,
          elapsedMs,
          activeBpm,
          playQrsBeep,
          playPvcBeep
        );
        return;
      }

      forEachQrsPeakInRange(
        activeTemplate,
        previousElapsedMs,
        elapsedMs,
        activeBpm,
        activeRhythm,
        playQrsBeep
      );
      return;
    }

    const previousSinceShock = previousElapsedMs - shockEvent.startMs;
    const currentSinceShock = elapsedMs - shockEvent.startMs;

    if (
      currentSinceShock >= SHOCK_ARTIFACT_MS &&
      previousSinceShock < SHOCK_FLATLINE_END_MS
    ) {
      startFlatlineTone();
    } else {
      stopFlatlineTone();
    }

    if (currentSinceShock < SHOCK_ARTIFACT_MS) {
      return;
    }

    if (currentSinceShock < SHOCK_FLATLINE_END_MS) {
      return;
    }

    stopFlatlineTone();

    const recoveryFromMs = Math.max(
      0,
      previousSinceShock - SHOCK_FLATLINE_END_MS
    );
    const recoveryToMs = currentSinceShock - SHOCK_FLATLINE_END_MS;

    forEachQrsPeakInRange(
      shockEvent.recoveryTemplate,
      recoveryFromMs,
      recoveryToMs,
      shockEvent.recoveryBpm,
      shockEvent.recoveryRhythm,
      playQrsBeep
    );
  }

  useImperativeHandle(
    ref,
    () => ({
      resumeAudio() {
        void ensureAudioContext()?.resume();
      },
      triggerShock() {
        const currentSignal = latestSignalRef.current;
        shockEventRef.current = {
          startMs: elapsedMsRef.current,
          completed: false,
          sourceTemplate: currentSignal.template,
          sourceBpm: currentSignal.bpm,
          sourceRhythm: currentSignal.rhythm,
          recoveryTemplate: DEFAULT_TEMPLATE,
          recoveryBpm: 70,
          recoveryRhythm: "regular",
        };
        playShockSound();
        setIsShockFlashVisible(true);
        window.setTimeout(() => setIsShockFlashVisible(false), SHOCK_FLASH_MS);
      },
      resetTimeline() {
        shockEventRef.current = null;
        elapsedMsRef.current = 0;
        lastAudioScanMsRef.current = 0;
        lastFrameTimeRef.current = null;
        stopFlatlineTone();
        setIsShockFlashVisible(false);
      },
    }),
    // Audio/animation helpers read mutable refs, so the imperative API stays stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let renderWidth = 1;
    let renderHeight = 1;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const nextWidth = Math.max(1, Math.floor(width ?? (rect.width || 900)));
      const nextHeight = Math.max(1, Math.floor(height ?? (rect.height || 280)));
      const dpr = window.devicePixelRatio || 1;

      renderWidth = nextWidth;
      renderHeight = nextHeight;
      canvas.width = nextWidth * dpr;
      canvas.height = nextHeight * dpr;
      canvas.style.width = `${nextWidth}px`;
      canvas.style.height = `${nextHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    const draw = (timestamp: number) => {
      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = timestamp;
      }

      const deltaMs = Math.min(
        timestamp - lastFrameTimeRef.current,
        MAX_FRAME_DELTA_MS
      );
      lastFrameTimeRef.current = timestamp;
      elapsedMsRef.current += deltaMs;

      const elapsedMs = elapsedMsRef.current;
      const visibleMs = secondsVisible * 1000;
      const shockEvent = shockEventRef.current;
      const isRecoveredFromShock =
        !!shockEvent && elapsedMs - shockEvent.startMs >= SHOCK_FLATLINE_END_MS;
      const currentDisplayTemplate =
        isRecoveredFromShock ? shockEvent.recoveryTemplate : template;
      const currentDisplayBpm =
        isRecoveredFromShock
          ? shockEvent.recoveryBpm
          : getEffectiveBpmForTemplate(template, bpm);
      const currentDisplayRhythm =
        isRecoveredFromShock ? shockEvent.recoveryRhythm : rhythm;
      const liveAfBpm = isAfTemplate(currentDisplayTemplate)
        ? getAfBeatBpm(
            currentDisplayBpm,
            findAfBeatIndex(elapsedMs, currentDisplayBpm)
          )
        : null;
      const waveformLayout = getWaveformLayout(
        template,
        shockEvent,
        renderHeight,
        pxPerMv
      );

      if (
        shockEvent &&
        !shockEvent.completed &&
        elapsedMs - shockEvent.startMs >= SHOCK_FLATLINE_END_MS
      ) {
        shockEvent.completed = true;
        onShockCompleteRef.current?.();
      }

      const roundedLiveBpm =
        liveAfBpm === null ? null : Math.round(liveAfBpm);
      if (lastReportedLiveBpmRef.current !== roundedLiveBpm) {
        lastReportedLiveBpmRef.current = roundedLiveBpm;
        onLiveBpmChangeRef.current?.(roundedLiveBpm);
      }

      syncAudio(
        lastAudioScanMsRef.current,
        elapsedMs,
        shockEvent,
        currentDisplayTemplate,
        currentDisplayBpm,
        currentDisplayRhythm
      );
      lastAudioScanMsRef.current = elapsedMs;

      drawGrid(ctx, renderWidth, renderHeight);

      ctx.save();

      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      ctx.beginPath();

      // 高密度サンプリングに加え、Q/R/Sなどのランドマークを必ず通してピークの取り逃しを防ぐ。
      const sampleXs = buildWaveformSampleXs(
        renderWidth,
        visibleMs,
        elapsedMs,
        currentDisplayBpm,
        currentDisplayTemplate,
        currentDisplayRhythm
      );
      let hasStartedPath = false;
      for (const x of sampleXs) {
        // 左端が過去、右端が現在
        const positionRatio = x / renderWidth;
        const timeOffsetMs = (positionRatio - 1) * visibleMs;
        const sampleTimeMs = elapsedMs + timeOffsetMs;

        const mv = getTimelineValueAtTimeMs(
          shockEvent,
          template,
          sampleTimeMs,
          bpm,
          rhythm
        );
        // 座標は浮動小数点のまま渡し、Canvasネイティブのアンチエイリアスを最大活用する
        const y = waveformLayout.baselineY - mv * waveformLayout.pxPerMv;

        if (!hasStartedPath) {
          ctx.moveTo(x, y);
          hasStartedPath = true;
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
      ctx.restore();

      // BPM表示
      ctx.save();
      ctx.fillStyle = "#111111";
      ctx.font = "14px sans-serif";
      ctx.fillText(
        `${displayLabel ?? currentDisplayTemplate.label} | ${
          roundedLiveBpm ?? currentDisplayBpm
        } bpm`,
        16,
        24
      );
      ctx.restore();

      animationIdRef.current = window.requestAnimationFrame(draw);
    };

    animationIdRef.current = window.requestAnimationFrame(draw);

    return () => {
      if (animationIdRef.current !== null) {
        window.cancelAnimationFrame(animationIdRef.current);
      }
      observer.disconnect();
    };
    // The RAF loop is restarted only when rendering inputs change; audio state flows through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm, displayLabel, rhythm, width, height, secondsVisible, pxPerMv, template]);

  return (
    <div ref={containerRef} className={cn("relative h-full w-full", className)}>
      <canvas
        ref={canvasRef}
        aria-label="ECG waveform canvas"
        className="block h-full w-full"
      />
      {showAnnotations ? (
        <EcgAnnotationOverlay
          template={template}
          caseId={annotationCaseId}
          bpm={bpm}
          rhythm={rhythm}
          secondsVisible={secondsVisible}
        />
      ) : null}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 bg-yellow-100 opacity-0 mix-blend-screen transition-opacity duration-150",
          isShockFlashVisible && "opacity-90"
        )}
      />
    </div>
  );
});

EcgCanvas.displayName = "EcgCanvas";
