export type AppMode = "learning" | "quiz" | "compare" | "vector" | "twelve" | "twelveQuiz";

export const APP_MODE_KEY = "ecg-lab.app-mode.v1";

export function parseAppMode(value: string | null): AppMode {
  return value === "quiz" || value === "compare" || value === "vector" || value === "twelve" || value === "twelveQuiz"
    ? value
    : "learning";
}
