"use client";

import { useEffect, useRef, useState } from "react";

import { CaseExplanationCard } from "@/components/CaseExplanationCard";
import { CaseSelector } from "@/components/CaseSelector";
import type { EcgCanvasHandle } from "@/components/EcgCanvas";
import { ParameterDashboard } from "@/components/dashboard/ParameterDashboard";
import { HybridLayout } from "@/components/layout/HybridLayout";
import { ECG_CASES, findCaseById, type ECGCase } from "@/data/ecgCases";
import {
  findTemplateOptionByTemplateId,
} from "@/src/data/ecg/templates";

export function ECGWorkspace() {
  const defaultCase = ECG_CASES[0];
  const ecgCanvasRef = useRef<EcgCanvasHandle | null>(null);
  const [selectedCase, setSelectedCase] = useState<ECGCase | null>(null);
  const [bpm, setBpm] = useState(defaultCase.initialBpm);
  const activeCase = selectedCase ?? defaultCase;
  const activeCaseRef = useRef(activeCase);
  const shockOriginCaseRef = useRef<ECGCase | null>(null);
  const [isShockInProgress, setIsShockInProgress] = useState(false);
  const [isShockComplete, setIsShockComplete] = useState(false);
  const [liveBpm, setLiveBpm] = useState<number | null>(null);
  const [audioMuted, setAudioMuted] = useState(true);
  const [audioVolume, setAudioVolume] = useState(0.45);
  const selectedTemplate = findTemplateOptionByTemplateId(
    activeCase.templateId
  );
  const recoveryTemplate = findTemplateOptionByTemplateId("nsr-lead2-v0");
  const monitorTemplate = isShockComplete
    ? recoveryTemplate.template
    : selectedTemplate.template;
  const isAfCase = activeCase.templateId.includes("af");
  const monitorBpm = isShockComplete ? 70 : isAfCase ? liveBpm ?? bpm : bpm;

  useEffect(() => {
    activeCaseRef.current = activeCase;
  }, [activeCase]);

  const handleCaseChange = (caseId: string) => {
    const ecgCase = findCaseById(caseId);
    if (!ecgCase) return;

    shockOriginCaseRef.current = null;
    setIsShockInProgress(false);
    setIsShockComplete(false);
    setLiveBpm(null);
    setSelectedCase(ecgCase);
    setBpm(ecgCase.initialBpm);
    ecgCanvasRef.current?.resetTimeline();
  };

  const handleBpmChange = (nextBpm: number) => {
    setLiveBpm(null);
    setBpm(nextBpm);
  };

  const handleAudioMutedChange = (muted: boolean) => {
    setAudioMuted(muted);
    if (!muted) {
      ecgCanvasRef.current?.resumeAudio();
    }
  };

  const handleAudioVolumeChange = (volume: number) => {
    setAudioVolume(volume);
    if (volume > 0 && !audioMuted) {
      ecgCanvasRef.current?.resumeAudio();
    }
  };

  const handleShock = () => {
    const currentCase = activeCaseRef.current;
    if (currentCase.id !== "vt" && currentCase.id !== "vf") return;
    shockOriginCaseRef.current = currentCase;
    setIsShockInProgress(true);
    setIsShockComplete(false);
    setLiveBpm(null);
    ecgCanvasRef.current?.triggerShock();
  };

  const handleShockComplete = () => {
    setIsShockInProgress(false);
    setIsShockComplete(true);
  };

  const handleReset = () => {
    const currentCase = shockOriginCaseRef.current ?? activeCaseRef.current;
    shockOriginCaseRef.current = null;
    setIsShockInProgress(false);
    setIsShockComplete(false);
    setLiveBpm(null);
    setSelectedCase(currentCase);
    setBpm(currentCase.initialBpm);
    ecgCanvasRef.current?.resetTimeline();
  };

  const controlPanel = (
    <div className="flex flex-col gap-6 md:gap-8 pb-12">
      <CaseSelector
        selectedCaseId={selectedCase?.id ?? null}
        onCaseChange={handleCaseChange}
      />
      <CaseExplanationCard selectedCase={selectedCase} />
      <ParameterDashboard
        bpm={bpm}
        selectedCase={activeCase}
        onBpmChange={handleBpmChange}
        onShock={handleShock}
        isShockInProgress={isShockInProgress}
        isShockComplete={isShockComplete}
        onReset={handleReset}
      />
    </div>
  );

  return (
    <HybridLayout
      canvasRef={ecgCanvasRef}
      bpm={bpm}
      rhythm={activeCase.rhythm ?? "regular"}
      template={selectedTemplate.template}
      displayBpm={monitorBpm}
      displayTemplate={monitorTemplate}
      onShockComplete={handleShockComplete}
      onLiveBpmChange={setLiveBpm}
      audioMuted={audioMuted}
      audioVolume={audioVolume}
      onAudioMutedChange={handleAudioMutedChange}
      onAudioVolumeChange={handleAudioVolumeChange}
      dashboard={controlPanel}
    />
  );
}
