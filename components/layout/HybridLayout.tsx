import { Monitor, SlidersHorizontal } from "lucide-react";

import { ECGSimulator } from "@/components/ECGSimulator";
import { Separator } from "@/components/ui/separator";
import type { ECGParameters } from "@/lib/ecg/types";

interface HybridLayoutProps {
  params: ECGParameters;
  dashboard: React.ReactNode;
}

export function HybridLayout({ params, dashboard }: HybridLayoutProps) {
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
              Lead II — モニター
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono text-xs text-emerald-300/80">
            <span>HR {Math.round(params.global.heartRate)} bpm</span>
            <span className="hidden sm:inline">25 mm/s</span>
            <span className="hidden sm:inline">10 mm/mV</span>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <ECGSimulator params={params} className="absolute inset-0" />
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
