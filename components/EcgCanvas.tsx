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
import type { ECGCaseRhythm } from "@/data/ecgCases";

const DEFAULT_TEMPLATE = ECG_TEMPLATE_OPTIONS[0].template;
const WAVEFORM_SAMPLE_STEP_PX = 0.25;
const MAX_FRAME_DELTA_MS = 50;
const WAVEFORM_VERTICAL_PADDING_PX = 18;
const VF_DISPLAY_RANGE_MV = { min: -2, max: 2 };
const AF_BPM_VARIATION = 0.3;
const AF_QRS_PEAK_OFFSET_MS = 24;
const AF_DISPLAY_RANGE_MV = { min: -0.35, max: 1.15 };
const ECG_BEEP_FREQUENCY_HZ = 500;
const ECG_BEEP_DURATION_SEC = 0.05;
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
  bpm?: number;
  rhythm?: ECGCaseRhythm;
  onShockComplete?: () => void;
  onLiveBpmChange?: (bpm: number | null) => void;
  audioMuted?: boolean;
  audioVolume?: number;
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
  return templateId.includes("af") || templateId.includes("afib");
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

function getAfBaselineValueAtTimeMs(timeMs: number): number {
  const t = timeMs / 1000;

  return (
    Math.sin(t * Math.PI * 2 * 6.3 + Math.sin(t * 0.7)) * 0.04 +
    Math.sin(t * Math.PI * 2 * 8.8 + Math.cos(t * 0.4)) * 0.025 +
    Math.sin(t * Math.PI * 2 * 11.2 + 1.6) * 0.015
  );
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
  if (isVfTemplate(template)) {
    return getVfChaosValueAtTimeMs(timeMs);
  }

  if (isAfTemplate(template)) {
    return getAfEcgValueAtTimeMs(timeMs, bpm);
  }

  if (rhythm === "irregular" && bpm > 0) {
    return getIrregularEcgValueAtTimeMs(template, timeMs, bpm);
  }

  return getEcgValueAtTimeMs(template, timeMs, bpm);
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

  if (isAfTemplate(template)) {
    const firstBeatIndex = findAfBeatIndex(fromMs, bpm) - 1;
    const lastBeatIndex = findAfBeatIndex(toMs, bpm) + 1;

    for (let beatIndex = firstBeatIndex; beatIndex <= lastBeatIndex; beatIndex++) {
      const peakTimeMs =
        getAfBeatStartMs(bpm, beatIndex) + AF_QRS_PEAK_OFFSET_MS;
      if (peakTimeMs > fromMs && peakTimeMs <= toMs) {
        callback(peakTimeMs);
      }
    }
    return;
  }

  const beatMs = bpm > 0 ? 60_000 / bpm : template.durationMs;
  const qrsPeakTemplateMs =
    template.fiducialsMs.r ?? template.fiducialsMs.qrsOn ?? 0;

  if (rhythm === "irregular" && bpm > 0) {
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

function buildWaveformSampleXs(
  width: number,
  visibleMs: number,
  elapsedMs: number,
  bpm: number,
  template: BeatTemplate,
  rhythm: ECGCaseRhythm
): number[] {
  const xs: number[] = [];

  for (let x = 0; x < width; x += WAVEFORM_SAMPLE_STEP_PX) {
    xs.push(x);
  }
  xs.push(width);

  const beatMs = bpm > 0 ? 60_000 / bpm : template.durationMs;
  const visibleStartMs = elapsedMs - visibleMs;
  const fiducialFractions = getFiducialFractionsInBeat(template);
  const hasAfTiming = isAfTemplate(template);
  const hasIrregularTiming = !hasAfTiming && rhythm === "irregular";
  const firstBeatIndex = hasAfTiming
    ? findAfBeatIndex(visibleStartMs, bpm) - 1
    : hasIrregularTiming
      ? findIrregularBeatIndex(visibleStartMs, beatMs) - 1
      : Math.floor(visibleStartMs / beatMs) - 1;
  const lastBeatIndex = hasAfTiming
    ? findAfBeatIndex(elapsedMs, bpm) + 1
    : hasIrregularTiming
      ? findIrregularBeatIndex(elapsedMs, beatMs) + 1
      : Math.floor(elapsedMs / beatMs) + 1;

  for (let beatIndex = firstBeatIndex; beatIndex <= lastBeatIndex; beatIndex++) {
    const beatStartMs = hasAfTiming
      ? getAfBeatStartMs(bpm, beatIndex)
      : hasIrregularTiming
        ? getIrregularBeatStartMs(beatMs, beatIndex)
        : beatIndex * beatMs;
    const beatDurationMs = hasAfTiming
      ? getAfBeatDurationMs(bpm, beatIndex)
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
    bpm = 60,
    rhythm = "regular",
    onShockComplete,
    onLiveBpmChange,
    audioMuted = true,
    audioVolume = 0.45,
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

  latestSignalRef.current = { bpm, rhythm, template };

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
        isRecoveredFromShock ? shockEvent.recoveryBpm : bpm;
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
        template,
        bpm,
        rhythm
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
        `${currentDisplayTemplate.label} | ${
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
  }, [bpm, rhythm, width, height, secondsVisible, pxPerMv, template]);

  return (
    <div ref={containerRef} className={cn("relative h-full w-full", className)}>
      <canvas
        ref={canvasRef}
        aria-label="ECG waveform canvas"
        className="block h-full w-full"
      />
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
