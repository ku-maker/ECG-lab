import { ObservationGuideCard } from "@/components/ObservationGuideCard";
import type { QuizFeedbackData } from "@/lib/quiz/feedback";
import { getTeachingSteps } from "@/lib/ecg/teachingHighlights";
import { getCaseReferences } from "@/data/ecgReferences";

export function QuizFeedback({ feedback, selectedStep, onStepSelect, paused }: {
  feedback: QuizFeedbackData;
  selectedStep: number | null;
  paused: boolean;
  onStepSelect: (step: number) => void;
}) {
  const { correctCase, selectedCase, isCorrect, comparison } = feedback;
  const canHighlight = getTeachingSteps(correctCase.id).length > 0;
  return (
    <section aria-label="回答の振り返り" className="mt-4 space-y-4">
      <p className="text-sm leading-7 text-foreground/85">{correctCase.description}</p>
      <p className="text-xs leading-5 text-muted-foreground">
        {paused ? "上の波形は一時停止中です。" : "上の波形は再生中です。一時停止すると、落ち着いて見直せます。"}
        {canHighlight ? "正解側のステップを押すと、見る場所を強調できます。" : "波形の2点を選んで間隔を計測できます。"}
      </p>
      {comparison ? <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
        <h3 className="text-sm font-semibold">この2つを分けるポイント</h3>
        <p className="mt-1 text-sm leading-7 text-foreground/85">{comparison.focus}</p>
      </div> : null}
      <div className={isCorrect ? "space-y-3" : "grid gap-4 lg:grid-cols-2"}>
        <section aria-label="正解の決め手" className="min-w-0 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">正解の決め手</h3>
            <p className="mt-1 text-sm font-medium">{correctCase.label}</p>
          </div>
          <ObservationGuideCard ecgCase={correctCase} selectedStep={selectedStep}
            onStepSelect={canHighlight ? onStepSelect : undefined} />
        </section>
        {!isCorrect ? <section aria-label="選んだ症例との違い" className="min-w-0 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">あなたが選んだ症例</h3>
            <p className="mt-1 text-sm font-medium">{selectedCase.label}</p>
          </div>
          <div className="rounded-xl border border-border bg-background/70 p-3 md:p-4">
            <p className="mb-3 text-xs leading-5 text-muted-foreground">こちらの症例では、次の所見を探します。上に表示している波形は正解の症例です。</p>
            <ol className="space-y-3">
              {selectedCase.learningPoints.map((point, index) => <li key={point} className="flex items-start gap-3 text-sm leading-7">
                <span aria-hidden className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs">{index + 1}</span>
                <span className="min-w-0 text-foreground/85">{point}</span>
              </li>)}
            </ol>
          </div>
        </section> : null}
      </div>
      <details className="rounded-lg border border-border bg-background/50 px-3 py-2.5">
        <summary className="cursor-pointer text-sm font-medium focus-visible:outline-2 focus-visible:outline-sky-500">間違えやすい点・参考資料</summary>
        <ul className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
          {correctCase.commonPitfalls.map((point) => <li key={point}>{point}</li>)}
        </ul>
        <ul className="mt-3 space-y-2 text-xs leading-5">
          {getCaseReferences(correctCase.id).map((reference) => <li key={reference.url}>
            <a href={reference.url} target="_blank" rel="noreferrer" className="text-sky-700 underline underline-offset-4 dark:text-sky-300">{reference.title}</a>
          </li>)}
        </ul>
      </details>
    </section>
  );
}
