"use client";

import { useState } from "react";

import type { AppMode } from "@/components/appMode";
import { ECGWorkspace } from "@/components/ECGWorkspace";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppNav } from "@/components/layout/AppNav";
import { VectorVisualizer } from "@/components/VectorVisualizer";

function createQuizSeed(): number {
  return Math.floor(Math.random() * 1_000_000_000);
}

export function ECGAppShell() {
  const [appMode, setAppMode] = useState<AppMode>("learning");
  const [quizSessionId, setQuizSessionId] = useState(createQuizSeed);

  const handleAppModeChange = (nextMode: AppMode) => {
    setAppMode(nextMode);
    if (nextMode === "quiz") {
      setQuizSessionId(createQuizSeed());
    }
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <AppHeader appMode={appMode} onAppModeChange={handleAppModeChange} />
      <AppNav />
      {appMode === "vector" ? (
        <VectorVisualizer />
      ) : (
        <ECGWorkspace appMode={appMode} quizSessionId={quizSessionId} />
      )}
    </div>
  );
}
