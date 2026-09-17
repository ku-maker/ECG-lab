"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ReasonQuiz } from "@/components/ReasonQuiz";
import { QUIZ_REASONS, REASON_TOPICS, type ReasonTopicId } from "@/data/quizReasons";
import { MeasurementPractice } from "@/components/MeasurementPractice";
import { supportsMeasurementPractice, type MeasurementKind } from "@/lib/ecg/measurementPractice";
import { getMaxLearningBpm } from "@/lib/ecg/rateTiming";
import { getTeachingSteps, type TeachingSelection } from "@/lib/ecg/teachingHighlights";
import { buildQuizFeedback } from "@/lib/quiz/feedback";
import { QuizFeedback } from "@/components/QuizFeedback";
import { useQuizProgress } from "@/lib/quiz/useQuizProgress";
import { QUIZ_SCOPES, createQuizQuestion, createQuizSeed, getScopedReviewIds, getReasonReviewIds, type QuizScope, type QuizQuestion } from "@/lib/quiz/questions";
import { chooseReviewCase } from "@/lib/quiz/progress";
import type { AppMode } from "@/components/appMode";
import { CaseExplanationCard } from "@/components/CaseExplanationCard";
import { CaseSelector } from "@/components/CaseSelector";
import type { EcgCanvasHandle } from "@/components/EcgCanvas";
import { ParameterDashboard } from "@/components/dashboard/ParameterDashboard";
import { HybridLayout, type MobileLayoutFocus } from "@/components/layout/HybridLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export type LearningSnapshot = {
  caseId: string;
  bpm: number;
  paused?: boolean;
  teachingStep?: number | null;
  mobileFocus?: MobileLayoutFocus;
  scrollTop?: number;
};

type ECGWorkspaceProps = {
  initialMeasurement?: boolean;
  initialReviewFocus?: boolean;
  appMode: AppMode;
  initialQuizScope?: QuizScope;
  initialQuizMobileFocus?: MobileLayoutFocus;
  onQuizPreferencesChange?: (scope: QuizScope, mobileFocus: MobileLayoutFocus) => void;
  quizSessionId: number;
  initialLearningState?: LearningSnapshot | null;
  onCompare?: (pairId: string, origin: LearningSnapshot) => void;
  onLearningStateChange?: (snapshot: LearningSnapshot) => void;
};

function QuizPanel({
  question,
  seed,
  selectedCaseId,
  onAnswer,
  onReasonAnswer,
  onNextQuestion,
  selectedTeachingStep,
  onTeachingStep,
  paused,
}: {
  question: QuizQuestion | null;
  seed: number;
  selectedCaseId: string | null;
  onAnswer: (caseId: string) => void;
  onReasonAnswer: (selectedReason: string) => void;
  onNextQuestion: () => void;
  selectedTeachingStep: number | null;
  paused: boolean;
  onTeachingStep: (step: number) => void;
}) {
  const [reasonComplete, setReasonComplete] = useState(false);
  const feedback = question ? buildQuizFeedback(question.correctCase, question.choices, selectedCaseId) : null;
  const hasAnswered = feedback !== null;
  const isCorrect = feedback?.isCorrect ?? false;
  const correctCase = feedback?.correctCase;
  const selectedCase = feedback?.selectedCase;

  return (
    <div className="flex flex-col gap-4 pb-12">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              クイズ
            </div>
            <h2 className="mt-1 text-lg font-semibold">この波形は？</h2>
          </div>
          <div className="rounded-full bg-emerald-500/10 px-3 py-1 font-mono text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {question?.choices.length ?? 0}択
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

        {feedback && correctCase ? (
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
                  正解：{" "}
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

            <ReasonQuiz caseId={correctCase.id} seed={seed} onAnswer={onReasonAnswer} onComplete={() => setReasonComplete(true)} />
            {reasonComplete ? <QuizFeedback feedback={feedback} selectedStep={selectedTeachingStep} onStepSelect={onTeachingStep} paused={paused} /> : null}

            <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
              この解説は心電図学習用であり、実際の診断や治療判断の代替ではありません。
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ECGWorkspace({ appMode, quizSessionId, initialMeasurement = false, initialReviewFocus = false, initialQuizScope = "basic", initialQuizMobileFocus = "waveform", onQuizPreferencesChange, initialLearningState, onCompare, onLearningStateChange }: ECGWorkspaceProps) {
  const defaultCase = (initialLearningState ? findCaseById(initialLearningState.caseId) : null) ?? ECG_CASES[0];
  const ecgCanvasRef = useRef<EcgCanvasHandle | null>(null);
  const [selectedCase, setSelectedCase] = useState<ECGCase | null>(defaultCase);
  const initialStep = initialLearningState?.teachingStep;
  const validInitialStep = initialStep != null && getTeachingSteps(defaultCase.id)[initialStep] ? initialStep : null;
  const [paused, setPaused] = useState(validInitialStep !== null || initialLearningState?.paused === true);
  const [mobileFocus, setMobileFocus] = useState<MobileLayoutFocus>(appMode === "quiz" ? initialQuizMobileFocus : initialLearningState?.mobileFocus ?? "waveform");
  const [teachingSelection, setTeachingSelection] = useState<TeachingSelection | null>(validInitialStep === null ? null : { caseId: defaultCase.id, step: validInitialStep });
  const learningScrollTop = useRef(initialLearningState?.scrollTop ?? 0);
  const [measurementKind, setMeasurementKind] = useState<MeasurementKind | null>(initialMeasurement && supportsMeasurementPractice(defaultCase.id) ? "pr" : null);
  const reviewPanelRef = useRef<HTMLElement>(null);
  const questionPanelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (initialReviewFocus) {
      reviewPanelRef.current?.focus({preventScroll: true});
      reviewPanelRef.current?.scrollIntoView({block: "start"});
    }
  }, [initialReviewFocus]);
  const [measurementHint, setMeasurementHint] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [reasonReviewTopic, setReasonReviewTopic] = useState<ReasonTopicId | null>(null);
  const [quizScope, setQuizScope] = useState<QuizScope>(initialQuizScope);
  const [quizTargetCaseId, setQuizTargetCaseId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const { progress, summary, reasonSummary, record, recordReason, reset: resetProgress, storageAvailable } = useQuizProgress();
  const [quizQuestionSeed, setQuizQuestionSeed] = useState(createQuizSeed);
  const [quizAnswer, setQuizAnswer] = useState<{
    caseId: string;
    nonce: number;
  } | null>(
    null
  );
  const [bpm, setBpm] = useState(initialLearningState?.bpm ?? defaultCase.initialBpm);
  const quizNonce = quizSessionId + quizQuestionSeed;
  const quizQuestion = useMemo(
    () => createQuizQuestion(quizNonce, quizTargetCaseId, quizScope),
    [quizNonce, quizTargetCaseId, quizScope]
  );
  const quizSelectedCaseId =
    quizAnswer?.nonce === quizNonce ? quizAnswer.caseId : null;
  const activeCase =
    appMode === "quiz"
      ? quizQuestion.correctCase
      : selectedCase ?? defaultCase;
  const canExploreWaveform = appMode === "learning" || (appMode === "quiz" && quizSelectedCaseId !== null);
  const selectedTeachingStep = canExploreWaveform && teachingSelection?.caseId === activeCase.id
    ? teachingSelection.step : null;
  const teachingFocus = selectedTeachingStep !== null ? getTeachingSteps(activeCase.id)[selectedTeachingStep] ?? null : null;
  useEffect(() => {
    if (appMode === "learning") onLearningStateChange?.({ caseId: activeCase.id, bpm, paused, teachingStep: selectedTeachingStep, mobileFocus, scrollTop: learningScrollTop.current });
  }, [appMode, activeCase.id, bpm, paused, selectedTeachingStep, mobileFocus, onLearningStateChange]);
  const learningSnapshot = (): LearningSnapshot => ({ caseId: activeCase.id, bpm, paused, teachingStep: selectedTeachingStep, mobileFocus, scrollTop: learningScrollTop.current });
  const handleTeachingStep = (step: number) => {
    setMeasurementKind(null);
    if (!canExploreWaveform || !getTeachingSteps(activeCase.id)[step]) return;
    setTeachingSelection({ caseId: activeCase.id, step });
    setMobileFocus("waveform");
    if (appMode === "quiz") onQuizPreferencesChange?.(quizScope, "waveform");
    setPaused(true);
  };
  const handlePausedChange = (nextPaused: boolean) => {
    setMeasurementKind(null);
    setTeachingSelection(null);
    setPaused(nextPaused);
  };
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
    setMeasurementKind(null);
    setTeachingSelection(null);
    setPaused(false);
    ecgCanvasRef.current?.resetTimeline();
  };

  const handleBpmChange = (nextBpm: number) => {
    setLiveBpm(null);
    setBpm(Math.min(getMaxLearningBpm(activeCase.id), Math.max(40, nextBpm)));
    setMeasurementKind(null);
    setTeachingSelection(null);
    setPaused(false);
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
    setMeasurementKind(null);
    setTeachingSelection(null);
    setPaused(false);
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
    setMeasurementKind(null);
    setTeachingSelection(null);
    setPaused(false);
    ecgCanvasRef.current?.resetTimeline();
  };

  const handleQuizAnswer = (caseId: string) => {
    if (quizSelectedCaseId || !quizQuestion.choices.some((choice) => choice.id === caseId)) return;
    setPaused(true);
    setQuizAnswer({ caseId, nonce: quizNonce });
    record({ caseId: quizQuestion.correctCase.id, selectedCaseId: caseId, at: Date.now() });
  };

  const scopedReviewIds = getScopedReviewIds(summary.missedCaseIds, quizScope);
  const scopedReasonIds = getScopedReviewIds(reasonSummary.missedCaseIds, quizScope);
  const hasScopedWeakness = scopedReviewIds.length > 0 || scopedReasonIds.length > 0;
  const hasOtherWeakness = summary.missedCaseIds.length > 0 || reasonSummary.missedCaseIds.length > 0;
  const handleNextQuizQuestion = (startReview = reviewMode, topic = reasonReviewTopic) => {
    const reviewIds = topic ? getReasonReviewIds(reasonSummary.missedCaseIds, quizScope, topic) : scopedReviewIds;
    const target = startReview
      ? chooseReviewCase(reviewIds, quizQuestion.correctCase.id) ?? null
      : null;
    setReviewMode(startReview && target !== null);
    setReasonReviewTopic(startReview && target !== null ? topic : null);
    setQuizTargetCaseId(target);
    setMeasurementKind(null);
    setTeachingSelection(null);
    setPaused(false);
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
      <CaseExplanationCard selectedCase={selectedCase} selectedStep={selectedTeachingStep} onStepSelect={handleTeachingStep}
        onCompare={onCompare ? (pairId) => onCompare(pairId, learningSnapshot()) : undefined} />
      {supportsMeasurementPractice(activeCase.id) ? <MeasurementPractice kind={measurementKind} hint={measurementHint}
        onObserve={measurementKind && getTeachingSteps(activeCase.id).some(step => step.kind === measurementKind) ? () => handleTeachingStep(getTeachingSteps(activeCase.id).findIndex(step => step.kind === measurementKind)) : undefined}
        onStart={(kind) => { setTeachingSelection(null); setMeasurementKind(kind); setMeasurementHint(false); setPaused(true); setMobileFocus("waveform"); }}
        onHint={() => setMeasurementHint(value => !value)} onEnd={() => setMeasurementKind(null)} /> : null}
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
  const quizControlPanel = (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-4">
        <label htmlFor="quiz-scope" className="text-sm font-semibold">難易度・出題範囲</label>
        <Select value={quizScope}
          onValueChange={(value) => {
            const next = QUIZ_SCOPES.find(item => item.id === value);
            if (!next || next.id === quizScope) return;
            setQuizScope(next.id); onQuizPreferencesChange?.(next.id, mobileFocus); setReviewMode(false); setReasonReviewTopic(null); setQuizTargetCaseId(null); setQuizAnswer(null);
            setMeasurementKind(null);
    setTeachingSelection(null); setPaused(false); setLiveBpm(null); setQuizQuestionSeed(seed => seed + 1);
          }}>
          <SelectTrigger id="quiz-scope" aria-label="難易度・出題範囲" className="mt-2 h-11 w-full rounded-lg border-border bg-background text-sm">
            <SelectValue>{QUIZ_SCOPES.find(scope => scope.id === quizScope)?.label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {QUIZ_SCOPES.map(scope => <SelectItem key={scope.id} value={scope.id}>{scope.label}{scope.id === "all" ? "" : `（${scope.caseIds.length}症例）`}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">{QUIZ_SCOPES.find(scope => scope.id === quizScope)?.hint} 範囲を変えると新しい問題に切り替わります。復習もこの範囲から出題します。</p>
      </section>
      <section ref={reviewPanelRef} tabIndex={-1} aria-label="クイズ成績" className="rounded-xl border border-border bg-card p-4 text-sm focus-visible:outline-2 focus-visible:outline-sky-500">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p aria-live="polite">
            症例名・全範囲の直近100問：{summary.correct} / {summary.total} 問正解
            {summary.total > 0 ? `（正答率 ${Math.round(summary.correct / summary.total * 100)}%）` : " — まず1問解いてみましょう"}
          </p>
          <Button type="button" variant="outline"
            disabled={!reviewMode && scopedReviewIds.length === 0}
            onClick={() => handleNextQuizQuestion(!reviewMode, null)}>
            {reviewMode ? "通常の出題に戻る" : `苦手を復習（${scopedReviewIds.length}症例）`}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {reviewMode ? reasonReviewTopic ? `根拠を復習中：${REASON_TOPICS.find(topic => topic.id === reasonReviewTopic)?.label}。根拠に正解すると対象から外れ、次の問題で対象がなくなれば通常出題に戻ります。` : "症例名を復習中：最後に間違えた症例から出題します。症例名に正解すると対象から外れます。" : "各症例の最後の回答が不正解なら、復習対象になります。"}
          {storageAvailable ? " 成績はこのブラウザに保存されます。" : " 保存できないため、成績はこのページを開いている間だけ保持します。"}
        </p>
        <div className="mt-4 border-t pt-3">
          <p aria-live="polite">判断の根拠・全範囲の直近100回答：{reasonSummary.correct} / {reasonSummary.total} 問正解</p>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">見落としたポイントを選んで復習できます。下の件数は現在の出題範囲内です。症例名に正解しても、根拠を間違えた症例は残ります。未回答・スキップは成績に含めません。</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {REASON_TOPICS.map(topic => {
              const ids = getReasonReviewIds(reasonSummary.missedCaseIds, quizScope, topic.id);
              return <Button key={topic.id} type="button" variant={reasonReviewTopic === topic.id ? "secondary" : "outline"}
                className="h-auto min-h-11 whitespace-normal text-left" disabled={ids.length === 0}
                onClick={() => handleNextQuizQuestion(true, topic.id)}>{topic.label}を復習（{ids.length}症例）</Button>;
            })}
          </div>
        </div>
        {!hasScopedWeakness ? <div role="status" className="mt-4 rounded-lg bg-sky-500/5 p-3 text-sm leading-6">
          <p className="font-medium">{summary.total === 0 && reasonSummary.total === 0
            ? "まず1問。間違えたポイントがここに集まります。"
            : hasOtherWeakness ? "この出題範囲には、現在の復習対象がありません。"
            : "保存されている回答では、現在の復習対象はありません。"}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hasOtherWeakness
            ? "ほかの範囲に復習対象があります。上の「難易度・出題範囲」を切り替えると確認できます。"
            : reasonSummary.total === 0
              ? "症例名を答えたあと、判断の根拠にも挑戦しましょう。飛ばした根拠は成績に含まれません。"
              : "別の問題にも挑戦してみましょう。未回答の症例は習得済みとは判定していません。"}</p>
        </div> : null}
        <Button type="button" variant="outline" className="mt-3 h-auto min-h-11 whitespace-normal" onClick={() => {
          if (quizSelectedCaseId !== null) handleNextQuizQuestion();
          questionPanelRef.current?.focus({preventScroll: true});
          questionPanelRef.current?.scrollIntoView({block: "start"});
        }}>{quizSelectedCaseId !== null ? "次の問題へ進む" : summary.total === 0 ? "最初の問題を解く" : "今回の問題へ移動"}</Button>
      </section>
      <div ref={questionPanelRef} tabIndex={-1} aria-label="クイズの問題と解説" className="rounded-xl focus-visible:outline-2 focus-visible:outline-sky-500">
      <QuizPanel key={quizNonce} seed={quizNonce}
        question={quizQuestion}
        selectedCaseId={quizSelectedCaseId}
        onAnswer={handleQuizAnswer}
        onReasonAnswer={selectedReason => recordReason({caseId: quizQuestion.correctCase.id, selectedReason, at: Date.now()})}
        onNextQuestion={() => handleNextQuizQuestion()}
        selectedTeachingStep={selectedTeachingStep}
        onTeachingStep={handleTeachingStep}
        paused={paused}
      />
      </div>
      {progress.attempts.length > 0 || (progress.reasonAttempts?.length ?? 0) > 0 ? (
        <details className="rounded-xl border border-border bg-card p-4 text-sm">
          <summary className="cursor-pointer font-medium">最近の回答履歴（最大10問）</summary>
          <ol className="mt-3 space-y-2">
            {progress.attempts.slice(-10).reverse().map((attempt, index) => (
              <li key={`${attempt.at}-${index}`}>
                {attempt.caseId === attempt.selectedCaseId ? "○ 正解" : "× 不正解"}：
                {findCaseById(attempt.caseId)?.label}
                {attempt.caseId !== attempt.selectedCaseId ? `（選択：${findCaseById(attempt.selectedCaseId)?.label}）` : ""}
              </li>
            ))}
          </ol>
          {(progress.reasonAttempts?.length ?? 0) > 0 ? <>
            <h3 className="mt-4 font-medium">判断の根拠の履歴（最大10回答）</h3>
            <ol className="mt-2 space-y-2">
              {progress.reasonAttempts?.slice(-10).reverse().map((attempt, index) => <li key={`${attempt.at}-${index}`}>
                {QUIZ_REASONS[attempt.caseId]?.correct === attempt.selectedReason ? "○ 正解" : "× 不正解"}：{findCaseById(attempt.caseId)?.label} — {attempt.selectedReason}
              </li>)}
            </ol>
          </> : null}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {confirmClear ? <>
              <span className="text-xs">症例名と根拠の成績・復習対象をすべて消去しますか？</span>
              <Button type="button" variant="destructive" size="sm" onClick={() => {
                resetProgress();
                setConfirmClear(false);
              }}>成績を消去する</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setConfirmClear(false)}>キャンセル</Button>
            </> : <Button type="button" variant="outline" size="sm" onClick={() => setConfirmClear(true)}>成績をリセット</Button>}
          </div>
        </details>
      ) : null}
    </div>
  );
  const controlPanel =
    appMode === "quiz" ? quizControlPanel : learningControlPanel;

  return (
    <HybridLayout
      initialScrollTop={initialLearningState?.scrollTop ?? 0}
      onDashboardScroll={(scrollTop) => {
        learningScrollTop.current = scrollTop;
        if (appMode === "learning") onLearningStateChange?.(learningSnapshot());
      }}
      mobileFocus={mobileFocus}
      onMobileFocusChange={(focus) => { setMobileFocus(focus); if (appMode === "quiz") onQuizPreferencesChange?.(quizScope, focus); }}
      canvasRef={ecgCanvasRef}
      canvasKey={`${activeCase.id}-${appMode === "quiz" ? quizNonce : "learning"}`}
      paused={paused}
      onPausedChange={handlePausedChange}
      teachingFocus={teachingFocus}
      measurementPractice={measurementKind && appMode === "learning" && paused && !teachingFocus ? {kind: measurementKind, hint: measurementHint} : undefined}
      onClearTeaching={() => setTeachingSelection(null)}
      pauseDisabled={isShockInProgress}
      bpm={effectiveBpm}
      rhythm={activeCase.rhythm ?? "regular"}
      template={selectedTemplate.template}
      rateLabel={appMode === "quiz" && !quizSelectedCaseId ? "設定" : ["mobitz2", "wenckebach"].includes(activeCase.id) ? "心房" : ["pvc", "pac"].includes(activeCase.id) ? "基礎" : "HR"}
      displayBpm={monitorBpm}
      displayTemplate={monitorTemplate}
      displayLabel={appMode === "quiz" ? (quizSelectedCaseId ? `正解：${activeCase.label}` : "問題の波形") : undefined}
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
