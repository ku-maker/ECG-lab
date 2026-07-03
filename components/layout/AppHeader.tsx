"use client";

import { Activity, BrainCircuit, GraduationCap } from "lucide-react";

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
  { id: "learning", label: "Learning", icon: GraduationCap },
  { id: "quiz", label: "Quiz", icon: BrainCircuit },
  { id: "vector", label: "Conduction", icon: Activity },
];

export function AppHeader({ appMode, onAppModeChange }: AppHeaderProps) {
  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 md:px-6">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Activity className="size-5" aria-hidden />
        </div>
        <div>
          <h1 className="text-base font-semibold tracking-tight md:text-lg">
            ECG Lab
          </h1>
          <p className="text-xs text-muted-foreground md:text-sm">
            リアルタイム心電図シミュレーター
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div
          className="flex rounded-lg border border-border bg-muted/60 p-1"
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
                  "h-8 gap-1.5 px-2.5 text-xs",
                  isActive && "shadow-sm"
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                {mode.label}
              </Button>
            );
          })}
        </div>
        <Badge variant="secondary" className="hidden sm:inline-flex">
          {appMode === "quiz"
            ? "クイズモード"
            : appMode === "vector"
              ? "伝導マップ"
              : "学習モード"}
        </Badge>
        <Badge variant="outline" className="font-mono text-xs">
          v1.0
        </Badge>
      </div>
    </header>
  );
}
