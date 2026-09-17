import type { MeasurementKind } from "@/lib/ecg/measurementPractice";
import { Monitor, Pause, Play, SlidersHorizontal, Volume2, VolumeX } from "lucide-react";
import { useLayoutEffect, useRef, type RefObject } from "react";

import { EcgCanvas, type EcgCanvasHandle } from "@/components/EcgCanvas";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { ECGCaseRhythm } from "@/data/ecgCases";
import type { TeachingFocus } from "@/lib/ecg/teachingHighlights";
import type { BeatTemplate } from "@/src/data/ecg/templates";
import { cn } from "@/lib/utils";

export type MobileLayoutFocus = "waveform" | "explanation";

interface HybridLayoutProps {
  initialScrollTop: number;
  onDashboardScroll: (scrollTop: number) => void;
  mobileFocus: MobileLayoutFocus;
  onMobileFocusChange: (focus: MobileLayoutFocus) => void;
  paused: boolean;
  measurementPractice?: {kind: MeasurementKind; hint: boolean};
  teachingFocus?: TeachingFocus | null;
  onClearTeaching?: () => void;
  onPausedChange: (paused: boolean) => void;
  pauseDisabled: boolean;
  canvasKey: string;
  canvasRef?: RefObject<EcgCanvasHandle | null>;
  bpm: number;
  rhythm: ECGCaseRhythm;
  template: BeatTemplate;
  displayBpm?: number;
  rateLabel?: string;
  displayTemplate?: BeatTemplate;
  displayLabel?: string;
  onShockComplete?: () => void;
  onLiveBpmChange?: (bpm: number | null) => void;
  audioMuted?: boolean;
  audioVolume?: number;
  onAudioMutedChange?: (muted: boolean) => void;
  onAudioVolumeChange?: (volume: number) => void;
  dashboard: React.ReactNode;
}

function sliderValue(values: number | readonly number[]): number {
  if (typeof values === "number") return values;
  return values[0] ?? 0;
}

export function HybridLayout({
  initialScrollTop,
  onDashboardScroll,
  mobileFocus,
  onMobileFocusChange,
  canvasRef,
  paused,
  teachingFocus,
  measurementPractice,
  onClearTeaching,
  onPausedChange,
  pauseDisabled,
  canvasKey,
  bpm,
  rhythm,
  template,
  displayBpm,
  rateLabel = "HR",
  displayTemplate,
  displayLabel,
  onShockComplete,
  onLiveBpmChange,
  audioMuted = true,
  audioVolume = 0.45,
  onAudioMutedChange,
  onAudioVolumeChange,
  dashboard,
}: HybridLayoutProps) {
  const monitorTemplate = displayTemplate ?? template;
  const monitorLabel = displayLabel ?? monitorTemplate.label;
  const monitorBpm = displayBpm ?? bpm;
  const dashboardRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (dashboardRef.current) dashboardRef.current.scrollTop = initialScrollTop;
  }, [initialScrollTop]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div role="group" aria-label="スマートフォンの表示配分" className="grid shrink-0 grid-cols-2 gap-1 border-b border-border bg-card px-3 py-1 md:hidden">
        <Button type="button" size="sm" variant={mobileFocus === "waveform" ? "secondary" : "ghost"} aria-pressed={mobileFocus === "waveform"} onClick={() => onMobileFocusChange("waveform")}>波形を大きく</Button>
        <Button type="button" size="sm" variant={mobileFocus === "explanation" ? "secondary" : "ghost"} aria-pressed={mobileFocus === "explanation"} onClick={() => onMobileFocusChange("explanation")}>解説を広く</Button>
      </div>
      {/* 上部: ECGモニター領域。学習テキストが読めるよう、画面高に対して控えめに固定する。 */}
      <section
        aria-label="心電図モニター"
        className={cn("relative flex shrink-0 flex-col border-b border-border bg-[#0a1628] md:h-[28vh] md:min-h-[190px] md:max-h-[280px]",
          mobileFocus === "explanation" ? "h-[120px] min-h-[120px]" : "h-[30dvh] min-h-[165px] max-h-[260px]")}
      >
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-1 border-b border-white/10 px-4 py-2 md:px-6">
          <div className="flex items-center gap-2 text-emerald-400">
            <Monitor className="size-4" aria-hidden />
            <span className="text-xs font-medium tracking-wide uppercase md:text-sm">
              {monitorLabel}
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono text-xs text-emerald-300/80">
            <div className="flex items-center gap-2 text-emerald-300">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={audioMuted ? "音声をオン" : "ミュート"}
                title={audioMuted ? "音声をオン" : "ミュート"}
                onClick={() => onAudioMutedChange?.(!audioMuted)}
                className="size-8 text-emerald-300 hover:bg-emerald-400/10 hover:text-emerald-200"
              >
                {audioMuted ? (
                  <VolumeX className="size-4" aria-hidden />
                ) : (
                  <Volume2 className="size-4" aria-hidden />
                )}
              </Button>
              <Slider
                min={0}
                max={100}
                step={1}
                value={[Math.round(audioVolume * 100)]}
                onValueChange={(value) =>
                  onAudioVolumeChange?.(sliderValue(value) / 100)
                }
                aria-label="音量"
                className="w-20 sm:w-24"
              />
            </div>
            <span>
              {monitorBpm > 0 ? `${rateLabel} ${Math.round(monitorBpm)} bpm` : "HR --"}
            </span>

          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <EcgCanvas
            key={canvasKey}
            ref={canvasRef}
            paused={paused}
            teachingFocus={teachingFocus}
            measurementPractice={measurementPractice}
            bpm={bpm}
            rhythm={rhythm}
            template={template}
            displayLabel={displayLabel}
            onShockComplete={onShockComplete}
            onLiveBpmChange={onLiveBpmChange}
            audioMuted={audioMuted}
            audioVolume={audioVolume}
            className="absolute inset-0"
          />
        </div>
      </section>

      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-border bg-card px-3 py-2">
        <Button type="button" variant="outline" size="sm" disabled={pauseDisabled}
          aria-pressed={paused} onClick={() => onPausedChange(!paused)}>
          {paused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
          {paused ? "再生する" : "一時停止・計測"}
        </Button>
        <p className="text-xs text-muted-foreground">
          表示6秒 · 小マス：横40 ms / 縦0.1 mV（縦横を自動拡縮）
        </p>
        {paused && !teachingFocus ? <p className="text-xs text-blue-700">波形を2回タップして計測。キーボード：矢印 → Enter、Escでクリア。</p> : null}
      </div>
      {paused && teachingFocus ? <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-sky-500/20 bg-sky-500/5 px-3 py-2">
        <p role="status" className="min-w-0 flex-1 text-xs leading-5 text-foreground">
          <strong>{teachingFocus.label}を強調中：</strong>{teachingFocus.hint}
        </p>
        <Button type="button" size="sm" variant="ghost" onClick={onClearTeaching}>強調を解除</Button>
      </div> : null}
      {/* 下部: 学習パネル領域 (残りの高さをすべて割り当て、内部のみスクロール) */}
      <section
        aria-label="学習パネル"
        className="flex min-h-0 flex-1 flex-col bg-background"
      >
        <div className="hidden shrink-0 items-center gap-2 border-b border-border px-4 py-3 md:flex md:px-6">
          <SlidersHorizontal
            className="size-4 text-muted-foreground"
            aria-hidden
          />
          <h2 className="text-sm font-semibold md:text-base">
            学習パネル
          </h2>
        </div>

        <div ref={dashboardRef} onScroll={(event) => onDashboardScroll(event.currentTarget.scrollTop)} className="flex-1 overflow-y-auto px-2.5 py-4 md:px-8 md:py-8">
          {dashboard}
        </div>
      </section>
    </div>
  );
}
