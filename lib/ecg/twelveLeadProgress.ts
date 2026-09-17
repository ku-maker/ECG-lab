import { TWELVE_LEADS, type TwelveLead } from './twelveLead.ts';
import { CLINICAL_CHOICES, CLINICAL_LESSONS, LOCALIZATION_CHOICES, READING_STEPS } from '../../data/twelveLeadLessons.ts';
export type TwelveLeadDraft = { version: 1; notes: string[]; evidence: TwelveLead[]; answer: string; reason: string; differential: string; exclusion: string; reflection: string; revealed: boolean };
export function emptyTwelveLeadDraft(): TwelveLeadDraft {
  return {version: 1, notes: Array(5).fill(''), evidence: [], answer: '', reason: '', differential: '', exclusion: '', reflection: '', revealed: false};
}
export function parseTwelveLeadDraft(raw: string | null): TwelveLeadDraft {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (value?.version !== 1) return emptyTwelveLeadDraft();
    const clean = (v: unknown) => typeof v === 'string' ? v.slice(0,5000) : '';
    const evidence = TWELVE_LEADS.filter(l => Array.isArray(value.evidence) && value.evidence.includes(l));
    const allChoices: readonly string[] = [...CLINICAL_CHOICES, ...LOCALIZATION_CHOICES];
    const answer = allChoices.includes(value.answer) ? value.answer : '';
    const differential = allChoices.includes(value.differential) && value.differential !== answer ? value.differential : '';
    const reason = clean(value.reason);
    return {version:1, notes: Array.from({length:5}, (_,i)=>clean(value.notes?.[i])), evidence, answer, reason,
      differential, exclusion: clean(value.exclusion), reflection: clean(value.reflection),
      revealed: value.revealed === true && !!answer};
  } catch { return emptyTwelveLeadDraft(); }
}

export function formatTwelveLeadNotes(drafts: TwelveLeadDraft[]): string {
  return ["12誘導学習：保存した回答・メモ", "各症例の最新の保存内容です。学習者の記録であり、診断結果ではありません。",
    ...CLINICAL_LESSONS.map((lesson, i) => {
      const draft = drafts[i] ?? emptyTwelveLeadDraft();
      return [
        `症例 ${i + 1}（PTB-XL 記録 ${lesson.record}）`,
        `回答状態：${draft.revealed ? "回答済み" : "未回答・下書き"}`,
        `あなたの判断：${draft.answer || "未選択"}`,
        `別に考えた診断：${draft.differential || "未選択"}`,
        `除外・保留した根拠：\n${draft.exclusion || "未記入"}`,
        `根拠に使った誘導：${draft.evidence.join("・") || "未選択"}`,
        ...READING_STEPS.map((step, j) => `${step.label}：\n${draft.notes[j] || "未記入"}`),
        `その判断を支える所見：\n${draft.reason || "未記入"}`,
        `解説を読んで気づいたこと：\n${draft.reflection || "未記入"}`,
      ].join("\n\n");
    }),
  ].join("\n\n────────────────────\n\n");
}
