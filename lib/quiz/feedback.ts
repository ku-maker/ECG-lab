import type { ECGCase } from "../../data/ecgCases";
import { COMPARISON_PAIRS } from "../../data/comparisonPairs.ts";

/** No explanation is returned until an answer belonging to this question is submitted. */
export function buildQuizFeedback(
  correctCase: ECGCase,
  choices: readonly ECGCase[],
  selectedCaseId: string | null,
) {
  const selectedCase = choices.find((choice) => choice.id === selectedCaseId);
  if (!selectedCase || !choices.some((choice) => choice.id === correctCase.id)) return null;
  const isCorrect = selectedCase.id === correctCase.id;
  const comparison = isCorrect ? undefined : COMPARISON_PAIRS.find((pair) =>
    (pair.leftCaseId === correctCase.id && pair.rightCaseId === selectedCase.id) ||
    (pair.rightCaseId === correctCase.id && pair.leftCaseId === selectedCase.id),
  );
  return { correctCase, selectedCase, isCorrect, comparison };
}

export type QuizFeedbackData = NonNullable<ReturnType<typeof buildQuizFeedback>>;
