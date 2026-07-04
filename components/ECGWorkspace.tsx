"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { AppMode } from "@/components/appMode";
import { CaseExplanationCard } from "@/components/CaseExplanationCard";
import { CaseSelector } from "@/components/CaseSelector";
import type { EcgCanvasHandle } from "@/components/EcgCanvas";
import { ParameterDashboard } from "@/components/dashboard/ParameterDashboard";
import { HybridLayout } from "@/components/layout/HybridLayout";
import { Button } from "@/components/ui/button";
import { ECG_CASES, findCaseById, type ECGCase } from "@/data/ecgCases";
import { cn } from "@/lib/utils";
import {
  findTemplateOptionByTemplateId,
} from "@/src/data/ecg/templates";

function getLockedBpmForTemplateId(templateId: string): number | null {
  if (templateId === "svt-lead2-v0") return 180;
  if (templateId === "tdp-lead2-v0") return 200;
  if (templateId === "afl-lead2-v0") return 75;
  if (templateId === "avblock3-lead2-v0") return 35;
  return null;
}

type ECGWorkspaceProps = {
  appMode: AppMode;
  quizSessionId: number;
};

type QuizQuestion = {
  correctCase: ECGCase;
  choices: ECGCase[];
};

function createSeededRandom(seed: number): () => number {
  let state = seed % 2_147_483_647;
  if (state <= 0) state += 2_147_483_646;

  return () => {
    state = (state * 16_807) % 2_147_483_647;
    return (state - 1) / 2_147_483_646;
  };
}

function createQuizSeed(): number {
  return Math.floor(Math.random() * 1_000_000_000);
}

function shuffleItems<T>(items: T[], random = Math.random): T[] {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

function createQuizQuestion(seed: number): QuizQuestion {
  const random = createSeededRandom(seed + 1);
  const candidates = ECG_CASES;
  const correctCase =
    candidates[Math.floor(random() * candidates.length)] ?? ECG_CASES[0];
  const distractors = shuffleItems(
    ECG_CASES.filter((ecgCase) => ecgCase.id !== correctCase.id),
    random
  ).slice(0, 3);

  return {
    correctCase,
    choices: shuffleItems([correctCase, ...distractors], random),
  };
}

function QuizPanel({
  question,
  selectedCaseId,
  onAnswer,
  onNextQuestion,
}: {
  question: QuizQuestion | null;
  selectedCaseId: string | null;
  onAnswer: (caseId: string) => void;
  onNextQuestion: () => void;
}) {
  const hasAnswered = selectedCaseId !== null;
  const isCorrect = selectedCaseId === question?.correctCase.id;
  const correctCase = question?.correctCase ?? null;
  const selectedCase =
    question?.choices.find((choice) => choice.id === selectedCaseId) ?? null;
  const keyRecognitionPoints = correctCase
    ? [...correctCase.recognitionTips, ...correctCase.learningPoints].slice(0, 4)
    : [];

  return (
    <div className="flex flex-col gap-4 pb-12">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Quiz
            </div>
            <h2 className="mt-1 text-lg font-semibold">この波形は？</h2>
          </div>
          <div className="rounded-full bg-emerald-500/10 px-3 py-1 font-mono text-xs font-medium text-emerald-600 dark:text-emerald-400">
            4択
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {question?.choices.map((choice) => {
            const isSelected = selectedCaseId === choice.id;
            const isCorrectChoice = choice.id === question.correctCase.id;

            return (
              <Button
                key={choice.id}
                type="button"
                variant="outline"
                size="lg"
                disabled={hasAnswered}
                onClick={() => onAnswer(choice.id)}
                className={cn(
                  "h-auto min-h-14 justify-start whitespace-normal px-4 py-3 text-left",
                  hasAnswered &&
                    isCorrectChoice &&
                    "border-emerald-500 bg-emerald-500/10 text-emerald-700 disabled:opacity-100 dark:text-emerald-300",
                  hasAnswered &&
                    isSelected &&
                    !isCorrectChoice &&
                    "border-destructive bg-destructive/10 text-destructive disabled:opacity-100"
                )}
              >
                <span className="flex min-w-0 flex-col items-start">
                  <span className="font-semibold">{choice.label}</span>
                  <span className="font-mono text-xs opacity-70">
                    {choice.abbr}
                  </span>
                </span>
              </Button>
            );
          })}
        </div>

        {hasAnswered && correctCase ? (
          <div className="mt-5 rounded-xl border border-border bg-muted/40 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div
                  className={cn(
                    "text-sm font-semibold",
                    isCorrect ? "text-emerald-600" : "text-destructive"
                  )}
                >
                  {isCorrect ? "正解" : "不正解"}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Correct answer / 正解:{" "}
                  <span className="font-semibold text-foreground">
                    {correctCase.label} ({correctCase.abbr})
                  </span>
                  {!isCorrect && selectedCase ? (
                    <>
                      {" "}
                      / 選択: {selectedCase.label} ({selectedCase.abbr})
                    </>
                  ) : null}
                </p>
              </div>
              <Button type="button" onClick={onNextQuestion}>
                次の問題へ
              </Button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <section className="space-y-1.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                  Why this rhythm?
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {correctCase.description}
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                  Key recognition points
                </h3>
                <ul className="space-y-1.5 text-sm leading-relaxed text-muted-foreground">
                  {keyRecognitionPoints.map((point) => (
                    <li key={point} className="flex gap-2">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-current opacity-60" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
              この解説は心電図学習用であり、実際の診断や治療判断の代替ではありません。
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ECGWorkspace({ appMode, quizSessionId }: ECGWorkspaceProps) {
  const defaultCase = ECG_CASES[0];
  const ecgCanvasRef = useRef<EcgCanvasHandle | null>(null);
  const [selectedCase, setSelectedCase] = useState<ECGCase | null>(null);
  const [quizQuestionSeed, setQuizQuestionSeed] = useState(createQuizSeed);
  const [quizAnswer, setQuizAnswer] = useState<{
    caseId: string;
    nonce: number;
  } | null>(
    null
  );
  const [bpm, setBpm] = useState(defaultCase.initialBpm);
  const quizNonce = quizSessionId + quizQuestionSeed;
  const quizQuestion = useMemo(
    () => createQuizQuestion(quizNonce),
    [quizNonce]
  );
  const quizSelectedCaseId =
    quizAnswer?.nonce === quizNonce ? quizAnswer.caseId : null;
  const activeCase =
    appMode === "quiz"
      ? quizQuestion.correctCase
      : selectedCase ?? defaultCase;
  const activeCaseRef = useRef(activeCase);
  const shockOriginCaseRef = useRef<ECGCase | null>(null);
  const [isShockInProgress, setIsShockInProgress] = useState(false);
  const [isShockComplete, setIsShockComplete] = useState(false);
  const [liveBpm, setLiveBpm] = useState<number | null>(null);
  const [audioMuted, setAudioMuted] = useState(true);
  const [audioVolume, setAudioVolume] = useState(0.45);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const selectedTemplate = findTemplateOptionByTemplateId(
    activeCase.templateId
  );
  const recoveryTemplate = findTemplateOptionByTemplateId("nsr-lead2-v0");
  const isLearningShockComplete = appMode === "learning" && isShockComplete;
  const monitorTemplate = isLearningShockComplete
    ? recoveryTemplate.template
    : selectedTemplate.template;
  const isAfCase = activeCase.templateId.includes("afib");
  const lockedBpm = getLockedBpmForTemplateId(activeCase.templateId);
  const baseBpm = appMode === "quiz" ? activeCase.initialBpm : bpm;
  const effectiveBpm = lockedBpm ?? baseBpm;
  const monitorBpm = isLearningShockComplete
    ? 70
    : isAfCase
      ? liveBpm ?? baseBpm
      : effectiveBpm;
  const showMonitorAnnotations =
    appMode === "learning" &&
    showAnnotations &&
    !isShockInProgress &&
    !isShockComplete;

  useEffect(() => {
    activeCaseRef.current = activeCase;
  }, [activeCase]);

  useEffect(() => {
    if (appMode !== "quiz") return;
    ecgCanvasRef.current?.resetTimeline();
  }, [appMode, quizNonce]);

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

  const handleQuizAnswer = (caseId: string) => {
    if (quizSelectedCaseId) return;
    setQuizAnswer({ caseId, nonce: quizNonce });
  };

  const handleNextQuizQuestion = () => {
    setQuizQuestionSeed((currentSeed) => {
      let nextSeed = createQuizSeed();
      while (nextSeed === currentSeed) {
        nextSeed = createQuizSeed();
      }
      return nextSeed;
    });
    setLiveBpm(null);
    setIsShockInProgress(false);
    setIsShockComplete(false);
  };

  const learningControlPanel = (
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
        showAnnotations={showAnnotations}
        onShowAnnotationsChange={setShowAnnotations}
      />
    </div>
  );
  const quizControlPanel = (
    <QuizPanel
      question={quizQuestion}
      selectedCaseId={quizSelectedCaseId}
      onAnswer={handleQuizAnswer}
      onNextQuestion={handleNextQuizQuestion}
    />
  );
  const controlPanel =
    appMode === "quiz" ? quizControlPanel : learningControlPanel;

  return (
    <HybridLayout
      canvasRef={ecgCanvasRef}
      bpm={effectiveBpm}
      rhythm={activeCase.rhythm ?? "regular"}
      template={selectedTemplate.template}
      displayBpm={monitorBpm}
      displayTemplate={monitorTemplate}
      displayLabel={appMode === "quiz" ? "Question ? / 問題" : undefined}
      onShockComplete={handleShockComplete}
      onLiveBpmChange={setLiveBpm}
      audioMuted={audioMuted}
      audioVolume={audioVolume}
      showAnnotations={showMonitorAnnotations}
      annotationCaseId={activeCase.id}
      onAudioMutedChange={handleAudioMutedChange}
      onAudioVolumeChange={handleAudioVolumeChange}
      dashboard={controlPanel}
    />
  );
}
