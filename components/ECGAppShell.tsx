"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { defaultPreferences, parsePreferences, PREFERENCES_KEY, type LearningPreferences } from "@/lib/learningPreferences";
import { Button } from "@/components/ui/button";
import { APP_MODE_KEY, parseAppMode, type AppMode } from "@/components/appMode";
import { CompareWorkspace } from "@/components/CompareWorkspace";
import { CaseLibrary } from "@/components/CaseLibrary";
import { LearningGuide, type GuideAction } from "@/components/LearningGuide";
import { ECG_CASES, type ECGCase } from "@/data/ecgCases";
import { findComparisonPairById } from "@/data/comparisonPairs";
import { ECGWorkspace, type LearningSnapshot } from "@/components/ECGWorkspace";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppNav } from "@/components/layout/AppNav";
import dynamic from "next/dynamic";

const VectorVisualizer = dynamic(() => import("@/components/VectorVisualizer").then((module) => module.VectorVisualizer), {
  ssr: false,
  loading: () => <div className="flex flex-1 items-center justify-center bg-slate-950 text-sm text-slate-300" role="status">刺激伝導マップを読み込んでいます…</div>,
});
const TwelveLeadWorkspace = dynamic(() => import("@/components/TwelveLeadWorkspace").then(module => module.TwelveLeadWorkspace), {
  loading: () => <p role="status" className="p-6">12誘導判読を読み込んでいます…</p>,
});

function createQuizSeed(): number {
  return Math.floor(Math.random() * 1_000_000_000);
}

const subscribeToHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
export function ECGAppShell() {
  const ready = useSyncExternalStore(subscribeToHydration, clientReady, serverReady);
  return ready ? <RestoredECGAppShell /> : <div role="status" className="p-6">学習設定を読み込んでいます…</div>;
}
function RestoredECGAppShell() {
  const [loaded] = useState(() => {
    try { return {value: parsePreferences(window.localStorage.getItem(PREFERENCES_KEY)), available: true}; }
    catch { return {value: defaultPreferences(), available: false}; }
  });
  const preferencesRef = useRef(loaded.value);
  const [storageAvailable, setStorageAvailable] = useState(loaded.available);
  const [quizPreferences, setQuizPreferences] = useState({scope: loaded.value.quizScope, mobileFocus: loaded.value.quizMobileFocus});
  const savePreferences = useCallback((patch: Partial<LearningPreferences>) => {
    const next = {...preferencesRef.current, ...patch};
    if (JSON.stringify(next) === JSON.stringify(preferencesRef.current)) return;
    preferencesRef.current = next;
    try { window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(next)); }
    catch { setStorageAvailable(false); }
  }, []);

  const [appMode, setAppMode] = useState<AppMode>(() => {
    try { return parseAppMode(window.localStorage.getItem(APP_MODE_KEY)); }
    catch { return "learning"; }
  });
  useEffect(() => {
    try { window.localStorage.setItem(APP_MODE_KEY, appMode); }
    catch { /* The main preference check already controls the storage status label. */ }
  }, [appMode]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [entryAction, setEntryAction] = useState<"measure" | "review" | null>(null);
  const [learningRevision, setLearningRevision] = useState(0);
  const [learningResume, setLearningResume] = useState<LearningSnapshot | null>(loaded.value.learning);
  const learningMemory = useRef<LearningSnapshot | null>(loaded.value.learning);
  const rememberLearning = useCallback((snapshot: LearningSnapshot) => {
    learningMemory.current = snapshot;
    savePreferences({learning: {caseId: snapshot.caseId, bpm: snapshot.bpm, paused: snapshot.paused,
      teachingStep: snapshot.teachingStep, mobileFocus: snapshot.mobileFocus}});
  }, [savePreferences]);
  const [comparisonEntry, setComparisonEntry] = useState<{ pairId: string; origin: LearningSnapshot } | null>(null);
  const [comparisonRevision, setComparisonRevision] = useState(0);
  const [quizSessionId, setQuizSessionId] = useState(createQuizSeed);

  const handleAppModeChange = (nextMode: AppMode) => {
    if (nextMode === appMode) return;
    setEntryAction(null);
    setLearningResume(nextMode === "learning" ? learningMemory.current ?? comparisonEntry?.origin ?? null : null);
    setComparisonEntry(null);
    setAppMode(nextMode);
    if (nextMode === "quiz") {
      setQuizSessionId(createQuizSeed());
    }
  };

  const handleCompare = (pairId: string, origin: LearningSnapshot) => {
    const pair = findComparisonPairById(pairId);
    if (!pair || (pair.leftCaseId !== origin.caseId && pair.rightCaseId !== origin.caseId)) return;
    setComparisonEntry({ pairId, origin });
    setComparisonRevision((revision) => revision + 1);
    learningMemory.current = origin;
    setLearningResume(null);
    setAppMode("compare");
  };

  const handleLibrarySelect = (ecgCase: ECGCase) => {
    setEntryAction(null);
    const nextLearning = { caseId: ecgCase.id, bpm: ecgCase.initialBpm };
    learningMemory.current = nextLearning;
    setLearningResume(nextLearning);
    setLearningRevision((revision) => revision + 1);
    setComparisonEntry(null);
    setAppMode("learning");
    setLibraryOpen(false);
  };

  const handleGuideAction = (action: GuideAction) => {
    setGuideOpen(false);
    setEntryAction(null);
    if (action === "measure") {
      const next: LearningSnapshot = {caseId: "nsr", bpm: 60, paused: true, teachingStep: null, mobileFocus: "waveform"};
      setEntryAction("measure");
      setLearningResume(next); learningMemory.current = next;
      setLearningRevision(value => value + 1); setComparisonEntry(null); setAppMode("learning");
      return;
    }
    if (action === "review") {
      setEntryAction("review");
      setQuizPreferences({scope: "all", mobileFocus: "explanation"});
      savePreferences({quizScope: "all", quizMobileFocus: "explanation"});
      setLearningRevision(value => value + 1); setQuizSessionId(createQuizSeed()); setAppMode("quiz");
      return;
    }
    if (action === "normal") handleLibrarySelect(ECG_CASES[0]);
    else if (action === "compare") {
      setComparisonEntry({ pairId: "nsr-vs-sinus-brady", origin: learningMemory.current ?? { caseId: "nsr", bpm: 60 } });
      setComparisonRevision((revision) => revision + 1);
      setAppMode("compare");
    }
    else handleAppModeChange(action === "quiz" ? "quiz" : "vector");
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <AppHeader appMode={appMode} onAppModeChange={handleAppModeChange} />
      <AppNav onOpenLibrary={() => setLibraryOpen(true)} onOpenGuide={() => setGuideOpen(true)} />
      <details className="shrink-0 border-b border-border bg-card px-4 py-1 text-xs">
        <summary className="cursor-pointer py-1 focus-visible:outline-2 focus-visible:outline-sky-500">学習設定：{storageAvailable ? "自動保存" : "このページ内で保持"}</summary>
        <div className="flex flex-wrap items-center gap-2 pb-2">
          <p>最後に開いたモードと、症例・心拍数・観察ステップ・表示配分・出題範囲を保存します。計測点・SHOCK・波形の時刻は復元しません。</p>
          <Button type="button" size="sm" variant="outline" onClick={() => {
            const defaults = defaultPreferences();
            savePreferences(defaults);
            try { window.localStorage.setItem(APP_MODE_KEY, "learning"); } catch { setStorageAvailable(false); }
            setQuizPreferences({scope: defaults.quizScope, mobileFocus: defaults.quizMobileFocus});
            setEntryAction(null);
            learningMemory.current = defaults.learning; setLearningResume(defaults.learning);
            setLearningRevision(value => value + 1); setComparisonEntry(null); setAppMode("learning");
          }}>学習設定を初期化（クイズ成績は残す）</Button>
        </div>
      </details>
      {guideOpen ? <LearningGuide onClose={() => setGuideOpen(false)} onAction={handleGuideAction} /> : null}
      {libraryOpen ? <CaseLibrary onClose={() => setLibraryOpen(false)} onSelect={handleLibrarySelect} /> : null}
      {appMode === "twelve" ? <TwelveLeadWorkspace mode="study" /> : appMode === "twelveQuiz" ? <TwelveLeadWorkspace mode="quiz" /> : appMode === "compare" ? (
        <CompareWorkspace key={`${comparisonEntry?.pairId ?? "default"}-${comparisonRevision}`} initialPairId={comparisonEntry?.pairId}
          originCaseId={comparisonEntry?.origin.caseId}
          onReturnToLearning={comparisonEntry ? () => handleAppModeChange("learning") : undefined} />
      ) : appMode === "vector" ? (
        <VectorVisualizer />
      ) : (
        <ECGWorkspace key={`${appMode}-${learningRevision}`} appMode={appMode} quizSessionId={quizSessionId}
          initialMeasurement={entryAction === "measure"} initialReviewFocus={entryAction === "review"}
          initialQuizScope={quizPreferences.scope} initialQuizMobileFocus={quizPreferences.mobileFocus}
          onQuizPreferencesChange={(scope, mobileFocus) => {
            setQuizPreferences(current => current.scope === scope && current.mobileFocus === mobileFocus ? current : {scope, mobileFocus});
            savePreferences({quizScope: scope, quizMobileFocus: mobileFocus});
          }}
          initialLearningState={appMode === "learning" ? learningResume : null} onCompare={handleCompare} onLearningStateChange={rememberLearning} />
      )}
    </div>
  );
}
