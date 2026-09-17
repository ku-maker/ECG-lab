"use client";

import { getMaxLearningBpm } from "@/lib/ecg/rateTiming";
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
  const maxBpm = getMaxLearningBpm(selectedCase?.id ?? "");
  const bpmUnavailable = selectedCase?.rhythm === "chaotic";
  const lockedBpm = getLockedBpmForTemplateId(selectedCase?.templateId);
  const bpmLocked = lockedBpm !== null;
  const bpmDisabled = bpmUnavailable || bpmLocked || isShockInProgress || isShockComplete;
  const canAdjustBpm = !bpmUnavailable && !bpmLocked;
  const shockAvailable =
    selectedCase?.templateId === "vt-lead2-v0" ||
    selectedCase?.templateId === "vf-lead2-v0";
  const shouldShowResetCard = shockAvailable || canAdjustBpm;
  const shockEnabled =
    !isShockInProgress && !isShockComplete && shockAvailable;
  const rhythmLabel = bpmUnavailable
    ? "BPMなし"
    : bpmLocked
      ? `${lockedBpm}固定`
    : bpm < 60
      ? "徐脈域"
      : bpm > 100
        ? "頻脈域"
        : selectedCase?.id === "nsr" || selectedCase?.id === "sinus-arrhythmia"
          ? "基準範囲"
          : "心拍数";

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <ParamCard
        className={cn(
          shouldShowResetCard ? "md:col-span-2" : "md:col-span-3"
        )}
      >
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
          max={maxBpm}
          step={1}
          value={[bpmUnavailable ? 40 : Math.min(lockedBpm ?? bpm, maxBpm)]}
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
            {maxBpm} bpm
            <span className="size-1.5 rounded-full bg-rose-500" />
          </span>
        </div>
        <p className="text-xs leading-6 text-muted-foreground">心拍数を変えても、P波・QRS幅と各拍のPR間隔を保つ学習用モデルです。拍の間隔とST・T波付近を調整します。生理学的なQT変化は再現しません。2度房室ブロックの設定値は心房側、期外収縮の設定値は基礎のリズムの速さです。</p>
        {maxBpm === 100 ? <p className="text-xs text-muted-foreground">長いPR間隔を観察できるよう、この症例の操作範囲は40〜100 bpmです。</p> : null}
        {isShockComplete ? <p className="text-xs text-muted-foreground">回復後のモニターは70 bpmの正常洞調律です。症例リセットで元の波形・心拍数に戻ります。</p> : null}
      </ParamCard>

      {shouldShowResetCard ? (
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
              {shockAvailable ? (
                <Zap className="size-5 fill-current" aria-hidden />
              ) : (
                <RotateCcw className="size-5" aria-hidden />
              )}
            </div>
            <div className="min-w-0">
              <div
                className={cn(
                  "text-sm font-semibold",
                  shockAvailable ? "text-destructive" : "text-foreground"
                )}
              >
                {shockAvailable ? "除細動" : "初期値に戻す"}
              </div>
              <div className="text-xs text-muted-foreground">
                {shockAvailable
                  ? "VF・無脈性VTを想定した成功例のデモ"
                  : "BPMと波形を初期状態に戻す"}
              </div>
            </div>
          </div>

          <div
            className={cn("grid gap-2", shockAvailable && "sm:grid-cols-2")}
          >
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
              className="h-12 w-full text-sm font-semibold"
            >
              <RotateCcw className="size-4" aria-hidden />
              {shockAvailable ? "症例リセット" : "初期値に戻す"}
            </Button>
          </div>

          <div className="text-xs leading-relaxed text-muted-foreground">
            {shockAvailable
              ? "このデモはVF・無脈性VTでの成功例として、SHOCK後に正常洞調律を表示します。実際には必ず回復するとは限りません。脈のあるVTでは脈拍・循環動態に応じて対応が異なり、同期カルディオバージョン等との区別が必要です。"
              : "BPMと波形を現在の症例の初期状態に戻します。"}
          </div>
          {shockAvailable ? <a className="text-xs underline underline-offset-2" href="https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-advanced-life-support" target="_blank" rel="noreferrer">参考：AHA 2025 成人二次救命処置ガイドライン</a> : null}
        </ParamCard>
      ) : null}
    </div>
  );
}
