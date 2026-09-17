import { TermHelp } from "@/components/TermHelp";
import { Eye } from "lucide-react";

import type { ECGCase } from "@/data/ecgCases";
import { getTeachingSteps } from "@/lib/ecg/teachingHighlights";
import { cn } from "@/lib/utils";

export function ObservationGuideCard({ ecgCase, selectedStep, onStepSelect }: {
  ecgCase: ECGCase;
  selectedStep?: number | null;
  onStepSelect?: (step: number) => void;
}) {
  const steps = getTeachingSteps(ecgCase.id);
  return (
    <section className="space-y-3 rounded-xl border border-sky-500/20 bg-background/70 p-3 md:p-4">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Eye className="size-4 text-sky-500" aria-hidden />
        波形を見る3ステップ
      </h4>
      {steps.length > 0 && onStepSelect ? <p className="text-xs leading-5 text-muted-foreground">
        ステップを押すと波形を一時停止し、見る場所を色で示します。
      </p> : null}
      <ol className="space-y-2">
        {ecgCase.learningPoints.map((point, index) => {
          const step = steps[index];
          const content = <>
            <span aria-hidden className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-sky-500/10 font-mono text-xs font-semibold text-sky-700 dark:text-sky-300">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 text-foreground/85">
              {point}
              {step && onStepSelect ? <span className="mt-1 block text-xs font-medium text-sky-700 dark:text-sky-300">
                {selectedStep === index ? "表示中：" : "波形で見る："}{step.label}
              </span> : null}
            </span>
          </>;
          return (
            <li key={`${ecgCase.id}-${point}`}>
              {step && onStepSelect ? (
                <button type="button" aria-pressed={selectedStep === index}
                  aria-label={`ステップ${index + 1}：${step.label}を波形で見る`}
                  onClick={() => onStepSelect(index)}
                  className={cn("flex w-full items-start gap-3 rounded-lg border p-2.5 text-left text-sm leading-7 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500",
                    selectedStep === index ? "border-sky-500 bg-sky-500/10" : "border-border hover:border-sky-500/50 hover:bg-sky-500/5")}>
                  {content}
                </button>
              ) : <div className="flex items-start gap-3 text-sm leading-7">{content}</div>}
              <TermHelp text={point} caseId={ecgCase.id} onStepSelect={onStepSelect} />
            </li>
          );
        })}
      </ol>
    </section>
  );
}
