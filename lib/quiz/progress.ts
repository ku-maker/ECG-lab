import { QUIZ_REASONS } from "../../data/quizReasons.ts";
export type QuizAttempt = { caseId: string; selectedCaseId: string; at: number };
export type ReasonAttempt = { caseId: string; selectedReason: string; at: number };
export type QuizProgress = { version: 1; attempts: QuizAttempt[]; reasonAttempts?: ReasonAttempt[] };
export const QUIZ_HISTORY_LIMIT = 100;
export const emptyProgress = (): QuizProgress => ({ version: 1, attempts: [] });

export function parseProgress(raw: string, validCaseIds: readonly string[]): QuizProgress {
  try {
    const value = JSON.parse(raw);
    if (value?.version !== 1 || !Array.isArray(value.attempts)) return emptyProgress();
    const ids = new Set(validCaseIds);
    return {
      version: 1,
      attempts: value.attempts.filter((attempt: QuizAttempt) =>
        attempt && ids.has(attempt.caseId) && ids.has(attempt.selectedCaseId) &&
        Number.isFinite(attempt.at) && attempt.at >= 0
      ).slice(-QUIZ_HISTORY_LIMIT),
      ...(Array.isArray(value.reasonAttempts) ? { reasonAttempts: value.reasonAttempts.filter((attempt: ReasonAttempt) => {
        const exercise = attempt && ids.has(attempt.caseId) ? QUIZ_REASONS[attempt.caseId] : null;
        return exercise && [exercise.correct, ...exercise.alternatives].includes(attempt.selectedReason) && Number.isFinite(attempt.at) && attempt.at >= 0;
      }).slice(-QUIZ_HISTORY_LIMIT) } : {}),
    };
  } catch { return emptyProgress(); }
}

export function recordAttempt(progress: QuizProgress, attempt: QuizAttempt): QuizProgress {
  return { ...progress, attempts: [...progress.attempts, attempt].slice(-QUIZ_HISTORY_LIMIT) };
}

export function recordReasonAttempt(progress: QuizProgress, attempt: ReasonAttempt): QuizProgress {
  return { ...progress, reasonAttempts: [...(progress.reasonAttempts ?? []), attempt].slice(-QUIZ_HISTORY_LIMIT) };
}
export function summarizeReasons(progress: QuizProgress) {
  const latest = new Map<string, boolean>();
  let correct = 0;
  for (const attempt of progress.reasonAttempts ?? []) {
    const isCorrect = QUIZ_REASONS[attempt.caseId]?.correct === attempt.selectedReason;
    if (isCorrect) correct++;
    latest.set(attempt.caseId, isCorrect);
  }
  return { total: progress.reasonAttempts?.length ?? 0, correct,
    missedCaseIds: [...latest].filter(([, correct]) => !correct).map(([id]) => id) };
}

export function summarizeProgress(progress: QuizProgress) {
  const latest = new Map<string, boolean>();
  let correct = 0;
  for (const attempt of progress.attempts) {
    const isCorrect = attempt.caseId === attempt.selectedCaseId;
    if (isCorrect) correct++;
    latest.set(attempt.caseId, isCorrect);
  }
  return {
    total: progress.attempts.length,
    correct,
    missedCaseIds: [...latest].filter(([, isCorrect]) => !isCorrect).map(([id]) => id),
  };
}

export function chooseReviewCase(ids: readonly string[], currentCaseId: string, random = Math.random): string | undefined {
  const others = ids.filter((id) => id !== currentCaseId);
  const pool = others.length ? others : ids;
  return pool[Math.floor(random() * pool.length)];
}
