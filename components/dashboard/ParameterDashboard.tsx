"use client";

import {
  Activity,
  ArrowDown,
  ArrowUp,
  Minus,
  MoveHorizontal,
} from "lucide-react";

import { Slider } from "@/components/ui/slider";
import type { ECGParameters } from "@/lib/ecg/types";
import { cn } from "@/lib/utils";

interface ParameterDashboardProps {
  params: ECGParameters;
  onHeartRateChange: (value: number) => void;
  onQrsWidthChange: (value: number) => void;
  onStLevelChange: (value: number) => void;
}

function sliderValue(values: number | readonly number[]): number {
  if (typeof values === "number") return values;
  return values[0] ?? 0;
}

function ParamCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function ParameterDashboard({
  params,
  onHeartRateChange,
  onQrsWidthChange,
  onStLevelChange,
}: ParameterDashboardProps) {
  const stLevel = params.stT_Segment.stElevation;
  const stLabel =
    stLevel > 0.08 ? "上昇" : stLevel < -0.08 ? "低下" : "正常";
  const qrsLabel =
    params.qrsComplex.width < 0.33
      ? "狭い"
      : params.qrsComplex.width > 0.66
        ? "広い"
        : "中等度";

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* 心拍数 */}
      <ParamCard>
        <div className="flex items-start justify-between">
          <div className="flex size-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
            <Activity className="size-5" aria-hidden />
          </div>
          <span className="font-mono text-3xl font-semibold tabular-nums tracking-tight">
            {Math.round(params.global.heartRate)}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              bpm
            </span>
          </span>
        </div>

        <Slider
          min={30}
          max={200}
          step={1}
          value={[params.global.heartRate]}
          onValueChange={(v) => onHeartRateChange(sliderValue(v))}
          aria-label="心拍数"
        />

        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-rose-300" />
            徐脈
          </span>
          <span className="flex items-center gap-1">
            頻脈
            <span className="size-1.5 rounded-full bg-rose-500" />
          </span>
        </div>
      </ParamCard>

      {/* QRS幅 */}
      <ParamCard>
        <div className="flex items-start justify-between">
          <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
            <MoveHorizontal className="size-5" aria-hidden />
          </div>
          <span className="rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-600 dark:text-violet-400">
            {qrsLabel}
          </span>
        </div>

        <div className="flex items-end justify-center gap-3 py-1" aria-hidden>
          <svg viewBox="0 0 24 40" className="h-10 w-6 text-muted-foreground/50">
            <path
              d="M12 36 L12 28 L8 28 L8 12 L12 4 L16 12 L16 28 L12 28"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          <svg
            viewBox="0 0 40 40"
            className={cn(
              "h-10 w-10 text-violet-500 transition-all duration-200",
              params.qrsComplex.width > 0.5 && "scale-110"
            )}
          >
            <path
              d="M20 36 L20 30 L10 30 L10 14 L20 4 L30 14 L30 30 L20 30"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          <svg viewBox="0 0 32 40" className="h-10 w-8 text-muted-foreground/50">
            <path
              d="M16 36 L16 28 L4 28 L4 10 L16 2 L28 10 L28 28 L16 28"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <Slider
          min={0}
          max={1}
          step={0.01}
          value={[params.qrsComplex.width]}
          onValueChange={(v) => onQrsWidthChange(sliderValue(v))}
          aria-label="QRS幅"
        />

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>狭い</span>
          <span>広い</span>
        </div>
      </ParamCard>

      {/* STレベル */}
      <ParamCard>
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-xl",
              stLevel > 0.08
                ? "bg-amber-500/10 text-amber-500"
                : stLevel < -0.08
                  ? "bg-sky-500/10 text-sky-500"
                  : "bg-emerald-500/10 text-emerald-500"
            )}
          >
            {stLevel > 0.08 ? (
              <ArrowUp className="size-5" aria-hidden />
            ) : stLevel < -0.08 ? (
              <ArrowDown className="size-5" aria-hidden />
            ) : (
              <Minus className="size-5" aria-hidden />
            )}
          </div>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              stLevel > 0.08
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : stLevel < -0.08
                  ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            )}
          >
            {stLabel}
          </span>
        </div>

        <div className="relative flex h-10 items-center justify-center" aria-hidden>
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
          <div
            className="absolute left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-emerald-500"
            style={{ top: "50%" }}
          />
          <div
            className={cn(
              "absolute left-1/2 size-3 -translate-x-1/2 rounded-full border-2 border-background bg-primary shadow-sm transition-all duration-150",
              stLevel > 0 && "bg-amber-500",
              stLevel < 0 && "bg-sky-500"
            )}
            style={{
              top: `${50 - stLevel * 28}%`,
            }}
          />
        </div>

        <Slider
          min={-1}
          max={1}
          step={0.01}
          value={[stLevel]}
          onValueChange={(v) => onStLevelChange(sliderValue(v))}
          aria-label="STレベル"
        />

        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1 text-sky-600/80 dark:text-sky-400/80">
            <ArrowDown className="size-3" />
            低下
          </span>
          <span>正常</span>
          <span className="flex items-center gap-1 text-amber-600/80 dark:text-amber-400/80">
            上昇
            <ArrowUp className="size-3" />
          </span>
        </div>
      </ParamCard>
    </div>
  );
}
