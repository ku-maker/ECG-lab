import { Monitor, SlidersHorizontal, Volume2, VolumeX } from "lucide-react";
import type { RefObject } from "react";

import { EcgCanvas, type EcgCanvasHandle } from "@/components/EcgCanvas";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { ECGCaseRhythm } from "@/data/ecgCases";
import type { BeatTemplate } from "@/src/data/ecg/templates";

interface HybridLayoutProps {
  canvasRef?: RefObject<EcgCanvasHandle | null>;
  bpm: number;
  rhythm: ECGCaseRhythm;
  template: BeatTemplate;
  displayBpm?: number;
  displayTemplate?: BeatTemplate;
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
  canvasRef,
  bpm,
  rhythm,
  template,
  displayBpm,
  displayTemplate,
  onShockComplete,
  onLiveBpmChange,
  audioMuted = true,
  audioVolume = 0.45,
  onAudioMutedChange,
  onAudioVolumeChange,
  dashboard,
}: HybridLayoutProps) {
  const monitorTemplate = displayTemplate ?? template;
  const monitorBpm = displayBpm ?? bpm;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* 上部: ECGモニター領域 (高さ40vhに固定、縮小しない) */}
      <section
        aria-label="心電図モニター"
        className="relative flex h-[40vh] shrink-0 flex-col border-b border-border bg-[#0a1628]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-2 md:px-6">
          <div className="flex items-center gap-2 text-emerald-400">
            <Monitor className="size-4" aria-hidden />
            <span className="text-xs font-medium tracking-wide uppercase md:text-sm">
              {monitorTemplate.label}
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
              {monitorBpm > 0 ? `HR ${Math.round(monitorBpm)} bpm` : "HR --"}
            </span>
            <span className="hidden sm:inline">25 mm/s</span>
            <span className="hidden sm:inline">10 mm/mV</span>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <EcgCanvas
            ref={canvasRef}
            bpm={bpm}
            rhythm={rhythm}
            template={template}
            onShockComplete={onShockComplete}
            onLiveBpmChange={onLiveBpmChange}
            audioMuted={audioMuted}
            audioVolume={audioVolume}
            className="absolute inset-0"
          />
        </div>
      </section>

      {/* 下部: コントロールパネル領域 (残りの高さをすべて割り当て、内部のみスクロール) */}
      <section
        aria-label="パラメータコントロール"
        className="flex min-h-0 flex-1 flex-col bg-background"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3 md:px-6">
          <SlidersHorizontal
            className="size-4 text-muted-foreground"
            aria-hidden
          />
          <h2 className="text-sm font-semibold md:text-base">
            パラメータコントロール
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">{dashboard}</div>
      </section>
    </div>
  );
}
