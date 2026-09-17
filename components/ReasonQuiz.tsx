"use client";
import { useRef, useState } from "react";
import { getReasonChoices } from "@/data/quizReasons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ReasonQuiz({ caseId, seed, onComplete, onAnswer }: { caseId: string; seed: number; onComplete: () => void; onAnswer: (selectedReason: string) => void }) {
  const completed = useRef(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [skipped, setSkipped] = useState(false);
  const exercise = getReasonChoices(caseId, seed);
  if (!exercise) return null;
  return <section aria-label="判断の根拠を練習" className="mt-4 rounded-lg border border-sky-500/20 bg-sky-500/5 p-4">
    <h3 className="font-semibold">もう一歩：判断の根拠</h3>
    <p className="mt-2 text-sm">{exercise.prompt}</p>
    <div className="mt-3 grid gap-2">
      {exercise.options.map(option => <Button key={option} type="button" variant={answer === option ? "secondary" : "outline"}
        className={cn("h-auto min-h-11 justify-start whitespace-normal py-2 text-left disabled:opacity-100",
          (answer !== null || skipped) && option === exercise.correct && "border-emerald-600 bg-emerald-500/10",
          answer === option && option !== exercise.correct && "border-rose-600 bg-rose-500/10")} disabled={answer !== null || skipped}
        onClick={() => { if (completed.current) return; completed.current = true; setAnswer(option); onAnswer(option); onComplete(); }}>{option}</Button>)}
    </div>
    {answer !== null || skipped ? <p role="status" className="mt-3 text-sm">
      {skipped ? "解説で確認しましょう。" : answer === exercise.correct ? "根拠も正解です。" : "この例では、次の所見に注目します。"} {exercise.correct}
    </p> : <Button type="button" variant="ghost" className="mt-2" onClick={() => { if (completed.current) return; completed.current = true; setSkipped(true); onComplete(); }}>根拠の練習を飛ばして解説を見る</Button>}
    <p className="mt-2 text-xs text-muted-foreground">根拠の成績は症例名と別に記録します。飛ばした問題は採点せず、これまでの復習対象も変えません。</p>
  </section>;
}
