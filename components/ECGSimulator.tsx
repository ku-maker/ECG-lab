"use client";

import { useEffect, useRef } from "react";

import { DEFAULT_ECG_PARAMS } from "@/lib/ecg/defaults";
import {
  lerpECGParams,
  paramsNearlyEqual,
} from "@/lib/ecg/interpolation";
import type { ECGParameters } from "@/lib/ecg/types";
import { nextBeatDuration, sampleECGAtPhase } from "@/lib/ecg/waveform";
import { cn } from "@/lib/utils";

/** 走紙速度相当 (px/s) — 25 mm/s を模倣 */
const SCROLL_SPEED = 90;

/** 1 mV 相当の振幅 (px) — 10 mm/mV を模倣 */
const MV_SCALE = 28;

/** パラメータ補間係数 */
const PARAM_LERP = 0.22;

const GRID_MINOR = 10;
const GRID_MAJOR = 50;

interface ECGSimulatorProps {
  params: ECGParameters;
  className?: string;
}

function mergeParams(params: ECGParameters): ECGParameters {
  return {
    global: { ...DEFAULT_ECG_PARAMS.global, ...params.global },
    pWave: { ...DEFAULT_ECG_PARAMS.pWave, ...params.pWave },
    qrsComplex: { ...DEFAULT_ECG_PARAMS.qrsComplex, ...params.qrsComplex },
    stT_Segment: { ...DEFAULT_ECG_PARAMS.stT_Segment, ...params.stT_Segment },
  };
}

/** 全サンプルを現在の表示パラメータで再生成（QRS/ST モーフィングの核心） */
function recomputeSamples(
  samples: Float32Array,
  phases: Float32Array,
  displayParams: ECGParameters
) {
  for (let i = 0; i < samples.length; i++) {
    samples[i] = sampleECGAtPhase(phases[i], displayParams);
  }
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  const minorColor = "rgba(16, 185, 129, 0.1)";
  const majorColor = "rgba(16, 185, 129, 0.22)";

  for (let x = 0; x <= width; x += GRID_MINOR) {
    ctx.strokeStyle = x % GRID_MAJOR === 0 ? majorColor : minorColor;
    ctx.lineWidth = x % GRID_MAJOR === 0 ? 1 : 0.5;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }

  for (let y = 0; y <= height; y += GRID_MINOR) {
    ctx.strokeStyle = y % GRID_MAJOR === 0 ? majorColor : minorColor;
    ctx.lineWidth = y % GRID_MAJOR === 0 ? 1 : 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
  }
}

function drawWaveform(
  ctx: CanvasRenderingContext2D,
  samples: Float32Array,
  length: number,
  width: number,
  height: number
) {
  if (length < 2) return;

  const baseline = height * 0.58;
  const startIndex = samples.length - length;

  ctx.strokeStyle = "#34d399";
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(52, 211, 153, 0.45)";
  ctx.shadowBlur = 6;

  ctx.beginPath();

  for (let i = 0; i < length; i++) {
    const x = width - length + i;
    const y = baseline - samples[startIndex + i] * MV_SCALE;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();
  ctx.shadowBlur = 0;
}

export function ECGSimulator({ params, className }: ECGSimulatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 毎レンダーで即座に同期（useEffect 遅延を排除）
  const targetParamsRef = useRef<ECGParameters>(mergeParams(params));
  targetParamsRef.current = mergeParams(params);

  const displayParamsRef = useRef<ECGParameters>(mergeParams(params));
  const samplesRef = useRef<Float32Array>(new Float32Array(0));
  const phasesRef = useRef<Float32Array>(new Float32Array(0));
  const phaseRef = useRef(0);
  const beatDurationRef = useRef(
    nextBeatDuration(
      DEFAULT_ECG_PARAMS.global.heartRate,
      DEFAULT_ECG_PARAMS.global.rhythmRegularity
    )
  );
  const scrollRemainderRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const prevSamples = samplesRef.current;
      const prevPhases = phasesRef.current;
      const samples = new Float32Array(w);
      const phases = new Float32Array(w);
      const p = displayParamsRef.current;
      let phase = phaseRef.current;
      let beatDur = beatDurationRef.current;

      for (let i = w - 1; i >= 0; i--) {
        phases[i] = phase;
        samples[i] = sampleECGAtPhase(phase, p);
        phase -= 1 / (beatDur * SCROLL_SPEED);
        if (phase < 0) {
          phase += 1;
          beatDur = nextBeatDuration(
            p.global.heartRate,
            p.global.rhythmRegularity
          );
        }
      }

      phaseRef.current = phase;
      beatDurationRef.current = beatDur;

      if (prevSamples.length > 0) {
        const copyLen = Math.min(prevSamples.length, w);
        samples.set(
          prevSamples.subarray(prevSamples.length - copyLen),
          w - copyLen
        );
        phases.set(
          prevPhases.subarray(prevPhases.length - copyLen),
          w - copyLen
        );
        recomputeSamples(samples, phases, p);
      }

      samplesRef.current = samples;
      phasesRef.current = phases;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    const tick = (now: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = now;
      }

      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;

      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      const samples = samplesRef.current;
      const phases = phasesRef.current;

      if (
        samples.length !== Math.floor(w) ||
        phases.length !== samples.length
      ) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      // --- 毎フレーム: スライダー目標値を取得し補間 ---
      const target = targetParamsRef.current;

      if (!paramsNearlyEqual(displayParamsRef.current, target)) {
        displayParamsRef.current = lerpECGParams(
          displayParamsRef.current,
          target,
          PARAM_LERP
        );
      } else {
        displayParamsRef.current = target;
      }

      const displayParams = displayParamsRef.current;

      // --- スクロール: 新ピクセルの位相を追加 ---
      let pixelsToAdvance = SCROLL_SPEED * dt + scrollRemainderRef.current;
      const pixelCount = Math.floor(pixelsToAdvance);
      scrollRemainderRef.current = pixelsToAdvance - pixelCount;

      for (let i = 0; i < pixelCount; i++) {
        const phaseStep = 1 / (beatDurationRef.current * SCROLL_SPEED);
        phaseRef.current += phaseStep;

        if (phaseRef.current >= 1) {
          phaseRef.current -= 1;
          beatDurationRef.current = nextBeatDuration(
            displayParams.global.heartRate,
            displayParams.global.rhythmRegularity
          );
        }

        phases.copyWithin(0, 1);
        phases[phases.length - 1] = phaseRef.current;
      }

      // --- QRS幅・STレベル・BPM すべて反映: 位相バッファから全波形再生成 ---
      recomputeSamples(samples, phases, displayParams);

      ctx.clearRect(0, 0, w, h);
      drawGrid(ctx, w, h);
      drawWaveform(ctx, samples, samples.length, w, h);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafRef.current);
      lastTimeRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("relative h-full w-full overflow-hidden", className)}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full"
        aria-label="リアルタイム心電図波形"
        role="img"
      />
      <div className="pointer-events-none absolute bottom-3 right-3 flex gap-2">
        <span className="rounded-md bg-black/40 px-2 py-1 font-mono text-[10px] text-emerald-300/90 md:text-xs">
          HR {Math.round(params.global.heartRate)} bpm
        </span>
        <span className="rounded-md bg-black/40 px-2 py-1 font-mono text-[10px] text-violet-300/90 md:text-xs">
          QRS {(params.qrsComplex.width * 100).toFixed(0)}%
        </span>
        <span className="rounded-md bg-black/40 px-2 py-1 font-mono text-[10px] text-amber-300/90 md:text-xs">
          ST {params.stT_Segment.stElevation >= 0 ? "+" : ""}
          {(params.stT_Segment.stElevation * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
