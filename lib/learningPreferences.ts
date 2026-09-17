import { ECG_CASES } from "../data/ecgCases.ts";
import { getMaxLearningBpm } from "./ecg/rateTiming.ts";
import { getTeachingSteps } from "./ecg/teachingHighlights.ts";
import type { LearningSnapshot } from "../components/ECGWorkspace";
import { QUIZ_SCOPES, type QuizScope } from "./quiz/questions.ts";

export type LearningPreferences = {
  version: 1; learning: LearningSnapshot; quizScope: QuizScope; quizMobileFocus: "waveform" | "explanation";
};
export const PREFERENCES_KEY = "ecg-lab.learning.v1";
export function defaultPreferences(): LearningPreferences {
  return {version: 1, learning: {caseId: "nsr", bpm: 60}, quizScope: "basic", quizMobileFocus: "waveform"};
}
export function parsePreferences(raw: string | null): LearningPreferences {
  const fallback = defaultPreferences();
  try {
    const value = JSON.parse(raw ?? "null");
    if (!value || value.version !== 1) return fallback;
    const source = value.learning;
    const ecgCase = ECG_CASES.find(c => c.id === source?.caseId) ?? ECG_CASES[0];
    const locked = ["svt", "tdp", "afl", "avblock3", "vf"].includes(ecgCase.id);
    const bpm = locked ? ecgCase.initialBpm : typeof source?.bpm === "number" && Number.isFinite(source.bpm)
      ? Math.max(40, Math.min(getMaxLearningBpm(ecgCase.id), source.bpm)) : ecgCase.initialBpm;
    const step = Number.isInteger(source?.teachingStep) && getTeachingSteps(ecgCase.id)[source.teachingStep] ? source.teachingStep : null;
    return {version: 1, learning: {
      caseId: ecgCase.id, bpm, paused: step !== null || source?.paused === true, teachingStep: step,
      mobileFocus: source?.mobileFocus === "explanation" ? "explanation" : "waveform",
    }, quizScope: QUIZ_SCOPES.find(scope => scope.id === value.quizScope)?.id ?? "basic",
    quizMobileFocus: value.quizMobileFocus === "explanation" ? "explanation" : "waveform"};
  } catch { return fallback; }
}
