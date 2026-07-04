"use client";

import { Activity, RotateCcw, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { ECGCase } from "@/data/ecgCases";
import { cn } from "@/lib/utils";

interface ParameterDashboardProps {
  bpm: number;
  selectedCase: ECGCase | null;
  onBpmChange: (value: number) => void;
  onShock?: () => void;
  isShockInProgress?: boolean;
  isShockComplete?: boolean;
  onReset?: () => void;
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

function getLockedBpmForTemplateId(templateId: string | undefined): number | null {
  if (templateId === "svt-lead2-v0") return 180;
  if (templateId === "tdp-lead2-v0") return 200;
  if (templateId === "afl-lead2-v0") return 75;
  if (templateId === "avblock3-lead2-v0") return 35;
  return null;
}

export function ParameterDashboard({
  bpm,
  selectedCase,
  onBpmChange,
  onShock,
  isShockInProgress = false,
  isShockComplete = false,
  onReset,
}: ParameterDashboardProps) {
  const bpmUnavailable = selectedCase?.rhythm === "chaotic";
  const lockedBpm = getLockedBpmForTemplateId(selectedCase?.templateId);
  const bpmLocked = lockedBpm !== null;
  const bpmDisabled = bpmUnavailable || bpmLocked;
  const shockAvailable =
    selectedCase?.templateId === "vt-lead2-v0" ||
    selectedCase?.templateId === "vf-lead2-v0";
  const shockEnabled =
    !isShockInProgress &&
    !isShockComplete &&
    shockAvailable;
  const rhythmLabel = bpmUnavailable
    ? "BPMなし"
    : bpmLocked
      ? `${lockedBpm}固定`
    : bpm < 60
      ? "徐脈域"
      : bpm > 100
        ? "頻脈域"
        : "正常域";

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <ParamCard className="md:col-span-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
            <Activity className="size-5" aria-hidden />
          </div>
          <span className="font-mono text-3xl font-semibold tabular-nums tracking-tight">
            {bpmUnavailable ? "--" : Math.round(lockedBpm ?? bpm)}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              bpm
            </span>
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="font-mono text-sm text-muted-foreground">
            {selectedCase ? `${selectedCase.label} / Lead II` : "Lead II"}
          </div>
          <span className="shrink-0 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-600 dark:text-rose-400">
            {rhythmLabel}
          </span>
        </div>

        <Slider
          min={40}
          max={180}
          step={1}
          value={[bpmUnavailable ? 40 : Math.min(lockedBpm ?? bpm, 180)]}
          onValueChange={(value) => onBpmChange(sliderValue(value))}
          disabled={bpmDisabled}
          aria-label="心拍数"
        />

        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-rose-300" />
            40 bpm
          </span>
          <span className="flex items-center gap-1">
            180 bpm
            <span className="size-1.5 rounded-full bg-rose-500" />
          </span>
        </div>
      </ParamCard>

      <ParamCard
        className={cn(
          "border-border",
          shockAvailable && "border-destructive/30 bg-destructive/5",
          shockEnabled && "shadow-[0_0_0_1px_rgb(239_68_68_/_0.16)]"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              shockAvailable
                ? "bg-destructive text-destructive-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            <Zap className="size-5 fill-current" aria-hidden />
          </div>
          <div className="min-w-0">
            <div
              className={cn(
                "text-sm font-semibold",
                shockAvailable ? "text-destructive" : "text-foreground"
              )}
            >
              除細動
            </div>
            <div className="text-xs text-muted-foreground">
              {shockAvailable
                ? "VT / VFのみ除細動可能"
                : "現在の症例を初期化"}
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {shockAvailable ? (
            <Button
              type="button"
              size="lg"
              disabled={!shockEnabled}
              onClick={onShock}
              className="h-12 w-full bg-red-600 text-base font-black tracking-wide text-white shadow-lg shadow-red-500/20 hover:bg-red-700 disabled:shadow-none"
            >
              <Zap className="size-5 fill-current" aria-hidden />
              {isShockInProgress
                ? "SHOCK中"
                : isShockComplete
                  ? "SHOCK済み"
                  : "SHOCK"}
            </Button>
          ) : null}
          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={onReset}
            className={cn(
              "h-12 w-full text-sm font-semibold",
              !shockAvailable && "sm:col-span-2"
            )}
          >
            <RotateCcw className="size-4" aria-hidden />
            症例リセット
          </Button>
        </div>

        <div className="text-xs leading-relaxed text-muted-foreground">
          {shockAvailable
            ? "通電後、電気的飽和とフラットラインを地続きに流し、正常洞調律へ復帰します。"
            : "現在の疾患プリセットの初期BPMで、波形をクリアして描き直します。"}
        </div>
      </ParamCard>

    </div>
  );
}
