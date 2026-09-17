"use client";

import {
  Activity,
  BrainCircuit,
  GitCompareArrows,
  GraduationCap,
} from "lucide-react";

import { ECGLabLogo } from "@/components/ECGLabLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AppMode } from "@/components/appMode";
import { cn } from "@/lib/utils";

type AppHeaderProps = {
  appMode: AppMode;
  onAppModeChange: (mode: AppMode) => void;
};

const modeTabs: Array<{
  id: AppMode;
  label: string;
  icon: typeof GraduationCap;
}> = [
  { id: "learning", label: "学習", icon: GraduationCap },
  { id: "quiz", label: "クイズ", icon: BrainCircuit },
  { id: "compare", label: "比較", icon: GitCompareArrows },
  { id: "vector", label: "刺激伝導", icon: Activity },
  { id: "twelve", label: "12誘導学習", icon: GraduationCap },
  { id: "twelveQuiz", label: "12誘導クイズ", icon: BrainCircuit },
];

export function AppHeader({ appMode, onAppModeChange }: AppHeaderProps) {
  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 md:px-6">
      <div className="flex items-center gap-3">
        <ECGLabLogo className="size-9" iconClassName="size-5" />
        <div>
          <h1 className="text-base font-semibold tracking-tight md:text-lg">
            ECG Lab
          </h1>
          <p className="text-xs text-muted-foreground md:text-sm">
            リアルタイム心電図シミュレーター
          </p>
        </div>
      </div>

      <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
        <div
          className="grid min-w-0 flex-1 grid-cols-6 rounded-lg border border-border bg-muted/60 p-1"
          role="tablist"
          aria-label="アプリモード"
        >
          {modeTabs.map((mode) => {
            const Icon = mode.icon;
            const isActive = appMode === mode.id;

            return (
              <Button
                key={mode.id}
                type="button"
                size="sm"
                variant={isActive ? "secondary" : "ghost"}
                role="tab"
                aria-selected={isActive}
                onClick={() => onAppModeChange(mode.id)}
                className={cn(
                  "h-8 min-w-0 gap-1.5 px-1 text-xs sm:px-2.5",
                  isActive && "shadow-sm"
                )}
              >
                <Icon className="hidden size-3.5 sm:block" aria-hidden />
                {mode.label}
              </Button>
            );
          })}
        </div>
        <Badge variant="secondary" className="hidden sm:inline-flex">
          {appMode === "twelve" ? "12誘導学習" : appMode === "twelveQuiz" ? "12誘導クイズ" : appMode === "quiz"
            ? "クイズモード"
            : appMode === "compare"
              ? "比較モード"
            : appMode === "vector"
              ? "伝導マップ"
              : "学習モード"}
        </Badge>
        <Badge variant="outline" className="hidden font-mono text-xs sm:inline-flex">
          v1.3
        </Badge>
      </div>
    </header>
  );
}
