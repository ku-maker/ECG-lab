import { ECG_CASES, type ECGCase } from "../../data/ecgCases.ts";
import { REASON_TOPICS, type ReasonTopicId } from "../../data/quizReasons.ts";
export type QuizScope = "basic" | "block" | "ectopy" | "all";
export const QUIZ_SCOPES: { id: QuizScope; label: string; hint: string; caseIds: readonly string[] }[] = [
  { id: "basic", label: "入門：基本のリズム", hint: "洞調律4症例から出題。速さ、P波、RR間隔を見ます。", caseIds: ["nsr", "sinus-brady", "sinus-tachy", "sinus-arrhythmia"] },
  { id: "block", label: "中級：房室ブロック", hint: "4種類の房室ブロックから出題。P波とQRS波のつながりを比べます。", caseIds: ["avblock1", "mobitz2", "wenckebach", "avblock3"] },
  { id: "ectopy", label: "中級：期外収縮", hint: "単発の期外収縮と二段脈を見分けます。", caseIds: ["nsr", "pac", "pvc", "pvc-bigeminy"] },
  { id: "all", label: "総合：全25症例", hint: "全25症例から出題する4択です。", caseIds: ECG_CASES.map(c => c.id) },
];
export function getQuizCases(scope: QuizScope) {
  const ids = QUIZ_SCOPES.find(item => item.id === scope)?.caseIds ?? QUIZ_SCOPES[3].caseIds;
  return ECG_CASES.filter(item => ids.includes(item.id));
}
export function getScopedReviewIds(ids: readonly string[], scope: QuizScope) {
  const candidates = getQuizCases(scope);
  return ids.filter(id => candidates.some(item => item.id === id));
}
export function getReasonReviewIds(ids: readonly string[], scope: QuizScope, topic: ReasonTopicId) {
  const caseIds: readonly string[] = REASON_TOPICS.find(item => item.id === topic)?.caseIds ?? [];
  return getScopedReviewIds(ids, scope).filter(id => caseIds.includes(id));
}

export type QuizQuestion = {
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

export function createQuizSeed(): number {
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

export function createQuizQuestion(seed: number, targetCaseId: string | null, scope: QuizScope = "all"): QuizQuestion {
  const random = createSeededRandom(seed + 1);
  const candidates = getQuizCases(scope);
  const correctCase =
    candidates.find((item) => item.id === targetCaseId) ??
    candidates[Math.floor(random() * candidates.length)] ?? ECG_CASES[0];
  const distractors = shuffleItems(
    candidates.filter((ecgCase) => ecgCase.id !== correctCase.id),
    random
  ).slice(0, 3);

  return {
    correctCase,
    choices: shuffleItems([correctCase, ...distractors], random),
  };
}
