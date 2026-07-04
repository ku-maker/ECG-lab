"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  GitCompareArrows,
  ListChecks,
  ShieldCheck,
  Tags,
} from "lucide-react";

import {
  ANNOTATION_SAFETY_NOTE,
} from "@/components/EcgAnnotationOverlay";
import { EcgCanvas } from "@/components/EcgCanvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COMPARISON_PAIRS,
  findComparisonPairById,
  type ComparisonPair,
} from "@/data/comparisonPairs";
import { ECG_CASES, findCaseById, type ECGCase } from "@/data/ecgCases";
import { cn } from "@/lib/utils";
import { findTemplateOptionByTemplateId } from "@/src/data/ecg/templates";

const SAFETY_NOTE =
  "この比較は心電図学習用であり、実際の診断や治療判断の代替ではありません。実臨床では12誘導心電図、症状、バイタル、患者背景、医療者の評価と合わせて判断します。";

const severityBadgeClass: Record<ECGCase["severity"], string> = {
  normal: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  critical: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

function getLockedBpmForTemplateId(templateId: string): number | null {
  if (templateId === "svt-lead2-v0") return 180;
  if (templateId === "tdp-lead2-v0") return 200;
  if (templateId === "afl-lead2-v0") return 75;
  if (templateId === "avblock3-lead2-v0") return 35;
  return null;
}

function getCaseBpm(ecgCase: ECGCase): number {
  return getLockedBpmForTemplateId(ecgCase.templateId) ?? ecgCase.initialBpm;
}

function getInitialPair(): ComparisonPair {
  return COMPARISON_PAIRS[0];
}

function CompareCaseCard({
  ecgCase,
  sideLabel,
  missingCaseId,
  showAnnotations,
}: {
  ecgCase: ECGCase;
  sideLabel: string;
  missingCaseId?: string;
  showAnnotations: boolean;
}) {
  const templateOption = findTemplateOptionByTemplateId(ecgCase.templateId);
  const bpm = getCaseBpm(ecgCase);
  const recognitionPoints = [
    ...ecgCase.recognitionTips,
    ...ecgCase.learningPoints,
  ].slice(0, 4);

  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {sideLabel}
          </div>
          <h2 className="mt-1 text-base font-semibold leading-snug break-words">
            {ecgCase.label}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              {ecgCase.abbr}
            </span>
            <Badge
              variant="outline"
              className={cn("capitalize", severityBadgeClass[ecgCase.severity])}
            >
              {ecgCase.severity}
            </Badge>
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/50 px-2.5 py-1 text-right font-mono text-xs">
          <div className="text-muted-foreground">BPM</div>
          <div className="text-sm font-semibold">
            {bpm > 0 ? Math.round(bpm) : "--"}
          </div>
        </div>
      </div>

      {missingCaseId ? (
        <div className="flex items-start gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            比較ペアのcaseId「{missingCaseId}」が見つからないため、
            fallback症例を表示しています。
          </span>
        </div>
      ) : null}

      <div className="relative h-60 overflow-hidden bg-[#0a1628] sm:h-64 lg:h-72">
        <EcgCanvas
          bpm={bpm}
          rhythm={ecgCase.rhythm ?? "regular"}
          template={templateOption.template}
          audioMuted={true}
          audioVolume={0}
          showAnnotations={showAnnotations}
          annotationCaseId={ecgCase.id}
          paused={showAnnotations}
          className="absolute inset-0"
        />
      </div>

      <div className="grid gap-4 px-4 py-4 sm:px-5">
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
            重要な見分けポイント
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
            {recognitionPoints.map((point) => (
              <li key={point} className="flex gap-2">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-current opacity-60" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-md border border-border bg-muted/25 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
            Clinical note
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {ecgCase.clinicalNote}
          </p>
        </section>
      </div>
    </section>
  );
}

export function CompareWorkspace() {
  const fallbackCase = ECG_CASES[0];
  const [selectedPairId, setSelectedPairId] = useState(getInitialPair().id);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const selectedPair = useMemo(
    () => findComparisonPairById(selectedPairId) ?? getInitialPair(),
    [selectedPairId]
  );
  const leftCase = findCaseById(selectedPair.leftCaseId) ?? fallbackCase;
  const rightCase = findCaseById(selectedPair.rightCaseId) ?? fallbackCase;
  const missingLeftCaseId =
    leftCase.id === fallbackCase.id && selectedPair.leftCaseId !== fallbackCase.id
      ? selectedPair.leftCaseId
      : undefined;
  const missingRightCaseId =
    rightCase.id === fallbackCase.id &&
    selectedPair.rightCaseId !== fallbackCase.id
      ? selectedPair.rightCaseId
      : undefined;

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-5 md:px-6 md:py-6">
        <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-sm md:flex-row md:items-start md:justify-between md:p-5">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-primary">
              <GitCompareArrows className="size-4" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Compare Mode / 比較モード
              </span>
            </div>
            <h1 className="mt-2 text-xl font-semibold tracking-tight md:text-2xl">
              似ているLead II波形を並べて比較
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              症例同士を横に並べ、P波、RR間隔、QRS幅、規則性などの違いを観察します。
            </p>
          </div>

          <div className="w-full space-y-3 md:w-80">
            <label
              htmlFor="comparison-pair-selector"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              比較ペア
            </label>
            <Select
              value={selectedPair.id}
              onValueChange={(value) => {
                if (value) setSelectedPairId(value);
              }}
            >
              <SelectTrigger
                id="comparison-pair-selector"
                className="mt-2 h-10 w-full rounded-lg border-border bg-background text-sm"
                aria-label="比較ペアを選択"
              >
                <SelectValue placeholder="比較ペアを選択" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {COMPARISON_PAIRS.map((pair) => (
                  <SelectItem
                    key={pair.id}
                    value={pair.id}
                    className="cursor-pointer rounded-lg py-2.5"
                  >
                    {pair.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="rounded-lg border border-border bg-background/70 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Tags
                    className="size-4 text-emerald-600 dark:text-emerald-400"
                    aria-hidden
                  />
                  <div>
                    <div className="text-xs font-semibold">
                      Annotations / 波形ラベル
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      ONで左右の波形を一時停止
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant={showAnnotations ? "secondary" : "outline"}
                  size="sm"
                  role="switch"
                  aria-checked={showAnnotations}
                  onClick={() => setShowAnnotations((current) => !current)}
                  className="h-auto shrink-0 whitespace-normal px-2 py-1.5 text-xs leading-tight"
                >
                  {showAnnotations ? "ON（一時停止中）" : "OFF"}
                </Button>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                ONにすると左右の波形を一時停止し、同じ設定で学習用ラベルを表示します。
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                {ANNOTATION_SAFETY_NOTE}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <Activity className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <div>
              <h2 className="text-sm font-semibold">Focus</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {selectedPair.focus}
              </p>
            </div>
          </div>
        </section>

        <div className="grid min-h-0 gap-4 lg:grid-cols-2">
          <CompareCaseCard
            ecgCase={leftCase}
            sideLabel="Left case"
            missingCaseId={missingLeftCaseId}
            showAnnotations={showAnnotations}
          />
          <CompareCaseCard
            ecgCase={rightCase}
            sideLabel="Right case"
            missingCaseId={missingRightCaseId}
            showAnnotations={showAnnotations}
          />
        </div>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.45fr)]">
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <ListChecks className="size-4 text-primary" aria-hidden />
              <h2 className="text-sm font-semibold">Key differences</h2>
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
              {selectedPair.keyDifferences.map((difference) => (
                <li key={difference} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70" />
                  <span>{difference}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" aria-hidden />
              <h2 className="text-sm font-semibold">Safety note</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {selectedPair.caution ?? SAFETY_NOTE}
            </p>
            <p className="mt-3 rounded-md border border-border bg-muted/25 p-3 text-xs leading-relaxed text-muted-foreground">
              {SAFETY_NOTE}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
