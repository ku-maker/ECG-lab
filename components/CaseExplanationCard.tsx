"use client";

import {
  BookOpen,
  Heart,
  GitCompareArrows,
  Lightbulb,
  ShieldCheck,
  TriangleAlert,
  Zap,
} from "lucide-react";
import type { ComponentType } from "react";

import { findCaseById, type ECGCase } from "@/data/ecgCases";
import { findComparisonPairsForCase } from "@/data/comparisonPairs";
import { Button } from "@/components/ui/button";
import { getCaseReferences } from "@/data/ecgReferences";
import { cn } from "@/lib/utils";
import { ECG_TERMS } from "@/data/ecgTerms";
import { TermHelp } from "@/components/TermHelp";
import { ObservationGuideCard } from "@/components/ObservationGuideCard";

interface CaseExplanationCardProps {
  selectedCase: ECGCase | null;
  selectedStep?: number | null;
  onStepSelect?: (step: number) => void;
  onCompare?: (pairId: string) => void;
}

const severityConfig = {
  normal: {
    icon: Heart,
    label: "正常",
    containerClass:
      "border-emerald-500/30 bg-emerald-500/5 shadow-emerald-500/10",
    iconClass: "bg-emerald-500/15 text-emerald-400",
    labelClass: "bg-emerald-500/15 text-emerald-300",
    abbrClass: "text-emerald-400",
    glowClass: "shadow-emerald-500/20",
  },
  warning: {
    icon: Zap,
    label: "注意",
    containerClass: "border-amber-500/30 bg-amber-500/5 shadow-amber-500/10",
    iconClass: "bg-amber-500/15 text-amber-400",
    labelClass: "bg-amber-500/15 text-amber-300",
    abbrClass: "text-amber-400",
    glowClass: "shadow-amber-500/20",
  },
  critical: {
    icon: Zap,
    label: "緊急",
    containerClass: "border-rose-500/30 bg-rose-500/5 shadow-rose-500/10",
    iconClass: "bg-rose-500/15 text-rose-400",
    labelClass: "bg-rose-500/15 text-rose-300",
    abbrClass: "text-rose-400",
    glowClass: "shadow-rose-500/20",
  },
};

function EmptyState() {
  return (
    <div className="flex h-full items-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background/60 text-muted-foreground">
        <BookOpen className="size-4" aria-hidden />
      </div>
      <p className="text-sm text-muted-foreground">
        上のドロップダウンから症例を選択すると、ここに解説が表示されます。
      </p>
    </div>
  );
}

function EducationSection({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  items: string[];
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground/80">
        <Icon className="size-3.5 text-muted-foreground" aria-hidden />
        {title}
      </div>
      <ul className="space-y-1.5 text-sm leading-relaxed text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 size-1 shrink-0 rounded-full bg-current opacity-60" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CaseExplanationCard({
  selectedCase,
  selectedStep,
  onStepSelect,
  onCompare,
}: CaseExplanationCardProps) {
  if (!selectedCase) {
    return <EmptyState />;
  }

  const config = severityConfig[selectedCase.severity];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-2xl border px-3 py-3 shadow-lg transition-all duration-500 md:flex md:gap-4 md:px-5 md:py-4",
        config.containerClass,
        config.glowClass
      )}
      role="region"
      aria-label={`症例解説: ${selectedCase.label}`}
    >
      {/* アイコン */}
      <div
        className={cn(
          "hidden size-10 shrink-0 items-center justify-center rounded-xl md:flex",
          config.iconClass
        )}
      >
        <Icon className="size-5" aria-hidden />
      </div>

      {/* テキスト */}
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-lg md:hidden",
              config.iconClass
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
          <h3 className="text-sm font-bold tracking-tight md:text-base">
            {selectedCase.label}
          </h3>
          <span
            className={cn(
              "font-mono text-xs font-semibold",
              config.abbrClass
            )}
          >
            ({selectedCase.abbr})
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
              config.labelClass
            )}
          >
            {config.label}
          </span>
        </div>
        <div className="space-y-4 md:space-y-5">
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground/80">
              <BookOpen className="size-3.5 text-muted-foreground" aria-hidden />
              ひとことでいうと
            </div>
            <p className="text-sm leading-7 text-foreground/85">
              {selectedCase.description}
            </p>
            <TermHelp key={selectedCase.id} text={selectedCase.description} caseId={selectedCase.id} onStepSelect={onStepSelect} />
          </section>

          <ObservationGuideCard ecgCase={selectedCase} selectedStep={selectedStep} onStepSelect={onStepSelect} />

          <EducationSection
            title="似た波形との違い"
            icon={Lightbulb}
            items={selectedCase.recognitionTips}
          />

          {onCompare ? <div className="flex flex-wrap gap-2" role="group" aria-label="この症例と比較する">
            {findComparisonPairsForCase(selectedCase.id).map((pair) => {
              const otherId = pair.leftCaseId === selectedCase.id ? pair.rightCaseId : pair.leftCaseId;
              const otherCase = findCaseById(otherId);
              return otherCase ? <Button key={pair.id} type="button" variant="outline"
                className="h-auto min-h-10 max-w-full justify-start whitespace-normal py-2 text-left"
                onClick={() => onCompare(pair.id)}>
                <GitCompareArrows className="size-4 shrink-0" aria-hidden />
                {otherCase.label}と比べる
              </Button> : null;
            })}
          </div> : null}

          <details className="rounded-xl border border-border bg-background/50 px-3 py-2.5 md:px-4">
            <summary className="cursor-pointer rounded text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-500">
              用語の意味を確認する
            </summary>
            <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm leading-6 sm:grid-cols-2">
              {ECG_TERMS.map(({ label: term, meaning }) => (
                <div key={term}>
                  <dt className="font-medium text-foreground">{term}</dt>
                  <dd className="mt-0.5 text-muted-foreground">{meaning}</dd>
                </div>
              ))}
            </dl>
          </details>

          <details key={selectedCase.id} className="rounded-xl border border-border bg-background/50 px-3 py-2.5 md:px-4">
            <summary className="cursor-pointer rounded text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-500">
              間違えやすい点・実際の患者さんでは
            </summary>
            <div className="mt-4 space-y-4">
              <EducationSection
                title="間違えやすい点"
                icon={TriangleAlert}
                items={selectedCase.commonPitfalls}
              />
              <section className="space-y-2">
                <h4 className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
                  <ShieldCheck className="size-3.5 text-muted-foreground" aria-hidden />
                  実際の患者さんでは
                </h4>
                <p className="text-sm leading-7 text-muted-foreground">{selectedCase.clinicalNote}</p>
              </section>
              <section className="space-y-2 border-t border-border pt-3">
                <h4 className="text-xs font-semibold text-foreground/80">解説の参考資料</h4>
                <ul className="space-y-2 text-xs leading-5">
                  {getCaseReferences(selectedCase.id).map((reference) => (
                    <li key={reference.url}>
                      <a href={reference.url} target="_blank" rel="noreferrer" className="text-sky-700 underline underline-offset-4 dark:text-sky-300">
                        {reference.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </details>
          <p className="text-xs leading-5 text-muted-foreground">
            この解説は成人の典型的な波形を学ぶためのものです。実際の診断・治療判断の代替ではありません。
          </p>
        </div>
      </div>
    </div>
  );
}
