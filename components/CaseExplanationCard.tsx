"use client";

import { BookOpen, Zap, Heart } from "lucide-react";

import type { ECGCase } from "@/data/ecgCases";
import { cn } from "@/lib/utils";

interface CaseExplanationCardProps {
  selectedCase: ECGCase | null;
}

const severityConfig = {
  normal: {
    icon: Heart,
    label: "正常",
    containerClass:
      "border-emerald-500/30 bg-emerald-500/5 shadow-emerald-500/10",
    iconClass: "bg-emerald-500/15 text-emerald-400",
    labelClass: "bg-emerald-500/15 text-emerald-300",
    abbrClass: "text-emerald-400",
    glowClass: "shadow-emerald-500/20",
  },
  warning: {
    icon: Zap,
    label: "注意",
    containerClass: "border-amber-500/30 bg-amber-500/5 shadow-amber-500/10",
    iconClass: "bg-amber-500/15 text-amber-400",
    labelClass: "bg-amber-500/15 text-amber-300",
    abbrClass: "text-amber-400",
    glowClass: "shadow-amber-500/20",
  },
  critical: {
    icon: Zap,
    label: "緊急",
    containerClass: "border-rose-500/30 bg-rose-500/5 shadow-rose-500/10",
    iconClass: "bg-rose-500/15 text-rose-400",
    labelClass: "bg-rose-500/15 text-rose-300",
    abbrClass: "text-rose-400",
    glowClass: "shadow-rose-500/20",
  },
};

function EmptyState() {
  return (
    <div className="flex h-full items-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background/60 text-muted-foreground">
        <BookOpen className="size-4" aria-hidden />
      </div>
      <p className="text-sm text-muted-foreground">
        上のドロップダウンから症例を選択すると、ここに解説が表示されます。
      </p>
    </div>
  );
}

export function CaseExplanationCard({
  selectedCase,
}: CaseExplanationCardProps) {
  if (!selectedCase) {
    return <EmptyState />;
  }

  const config = severityConfig[selectedCase.severity];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex gap-4 rounded-2xl border px-5 py-4 shadow-lg transition-all duration-500",
        config.containerClass,
        config.glowClass
      )}
      role="region"
      aria-label={`症例解説: ${selectedCase.label}`}
    >
      {/* アイコン */}
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          config.iconClass
        )}
      >
        <Icon className="size-5" aria-hidden />
      </div>

      {/* テキスト */}
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold tracking-tight md:text-base">
            {selectedCase.label}
          </h3>
          <span
            className={cn(
              "font-mono text-xs font-semibold",
              config.abbrClass
            )}
          >
            ({selectedCase.abbr})
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
              config.labelClass
            )}
          >
            {config.label}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {selectedCase.description}
        </p>
      </div>
    </div>
  );
}
