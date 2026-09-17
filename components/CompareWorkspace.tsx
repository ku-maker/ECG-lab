"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import {
  Activity,
  ArrowLeft,
  AlertTriangle,
  GitCompareArrows,
  ListChecks,
  ShieldCheck,
} from "lucide-react";

import { EcgCanvas, type EcgCanvasHandle } from "@/components/EcgCanvas";
import { TermHelp } from "@/components/TermHelp";
import { getComparisonFocuses, type TeachingFocus } from "@/lib/ecg/teachingHighlights";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  freezeAtMs,
  teachingFocus,
  canvasRef,
}: {
  ecgCase: ECGCase;
  sideLabel: string;
  missingCaseId?: string;
  freezeAtMs: number | null;
  teachingFocus: TeachingFocus | null;
  canvasRef?: RefObject<EcgCanvasHandle | null>;
}) {
  const templateOption = findTemplateOptionByTemplateId(ecgCase.templateId);
  const bpm = getCaseBpm(ecgCase);

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
              {{ normal: "正常", warning: "注意", critical: "緊急" }[ecgCase.severity]}
            </Badge>
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/50 px-2.5 py-1 text-right font-mono text-xs">
          <div className="text-muted-foreground">{["mobitz2", "wenckebach"].includes(ecgCase.id) ? "心房 bpm" : ["pvc", "pac"].includes(ecgCase.id) ? "基礎 bpm" : "BPM"}</div>
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

      <div className="relative h-48 overflow-hidden bg-[#0a1628] sm:h-56 lg:h-60">
        <EcgCanvas
          key={ecgCase.id}
          ref={canvasRef}
          paused={freezeAtMs !== null}
          freezeAtMs={freezeAtMs ?? undefined}
          teachingFocus={teachingFocus}
          bpm={bpm}
          rhythm={ecgCase.rhythm ?? "regular"}
          template={templateOption.template}
          audioMuted={true}
          audioVolume={0}
          className="absolute inset-0"
        />
      </div>

      <p className="border-b border-border px-4 py-2 text-xs text-muted-foreground">表示6秒 · 小マス：横40 ms / 縦0.1 mV（縦横を自動拡縮）</p>
    </section>
  );
}

function CompareCaseExplanation({ ecgCase }: { ecgCase: ECGCase }) {
  return (
      <section aria-label={`${ecgCase.label}の比較解説`} className="grid content-start gap-4 rounded-lg border border-border bg-card p-4 sm:p-5">
        <h2 className="text-base font-semibold">{ecgCase.label}</h2>
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
            この波形の見方
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
            {ecgCase.learningPoints.map((point, index) => (
              <li key={point}>
                <p><span className="mr-2 font-semibold text-foreground">{index + 1}.</span>{point}</p>
                <TermHelp text={point} caseId={ecgCase.id} />
              </li>
            ))}
          </ul>
        </section>

        <details className="rounded-md border border-border bg-muted/25 p-3">
          <summary className="cursor-pointer text-sm font-semibold focus-visible:outline-2 focus-visible:outline-sky-500">実際の患者さんでは</summary>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {ecgCase.clinicalNote}
          </p>
        </details>
      </section>
  );
}

export function CompareWorkspace({ initialPairId, originCaseId, onReturnToLearning }: {
  initialPairId?: string;
  originCaseId?: string;
  onReturnToLearning?: () => void;
}) {
  const originCase = originCaseId ? findCaseById(originCaseId) : undefined;
  const fallbackCase = ECG_CASES[0];
  const [selectedPairId, setSelectedPairId] = useState(() => findComparisonPairById(initialPairId ?? "")?.id ?? getInitialPair().id);
  const selectedPair = useMemo(
    () => findComparisonPairById(selectedPairId) ?? getInitialPair(),
    [selectedPairId]
  );
  const leftCase = findCaseById(selectedPair.leftCaseId) ?? fallbackCase;
  const rightCase = findCaseById(selectedPair.rightCaseId) ?? fallbackCase;
  const leftCanvasRef = useRef<EcgCanvasHandle | null>(null);
  const waveformsRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<HTMLElement | null>(null);
  const moveTo = (element: HTMLElement | null) => {
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ block: "start", behavior: "instant" });
  };
  const [freezeAtMs, setFreezeAtMs] = useState<number | null>(null);
  const [teachingFocus, setTeachingFocus] = useState<TeachingFocus | null>(null);
  const focuses = getComparisonFocuses(leftCase.id, rightCase.id);
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
        {originCase && onReturnToLearning ? <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={onReturnToLearning}
            className="h-auto min-h-10 max-w-full whitespace-normal py-2 text-left">
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
            {originCase.label}の解説に戻る
          </Button>
          <p className="text-xs text-muted-foreground">戻ると、元の症例・心拍数・観察ステップ・解説の表示位置を復元します。</p>
        </div> : null}
        <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-sm md:flex-row md:items-start md:justify-between md:p-5">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-primary">
              <GitCompareArrows className="size-4" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wider">
                比較モード
              </span>
            </div>
            <h1 className="mt-2 text-xl font-semibold tracking-tight md:text-2xl">
              似ているLead II波形を並べて比較
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              症例同士を横に並べ、P波、RR間隔、QRS幅、規則性などの違いを観察します。
            </p>
          </div>

          <div className="w-full md:w-80">
            <label
              htmlFor="comparison-pair-selector"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              比較ペア
            </label>
            <Select
              value={selectedPair.id}
              onValueChange={(value) => {
                if (value) { setSelectedPairId(value); setFreezeAtMs(null); setTeachingFocus(null); }
              }}
            >
              <SelectTrigger
                id="comparison-pair-selector"
                className="mt-2 h-10 w-full rounded-lg border-border bg-background text-sm"
                aria-label="比較ペアを選択"
              >
                <SelectValue placeholder="比較ペアを選択">{selectedPair.label}</SelectValue>
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
          </div>
        </section>

        <section className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <Activity className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <div>
              <h2 className="text-sm font-semibold">ここを比べる</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {selectedPair.focus}
              </p>
            </div>
          </div>
        </section>

        <section ref={controlsRef} tabIndex={-1} aria-label="左右の波形を一緒に観察" className="scroll-mt-4 rounded-lg border border-border bg-card p-4 focus-visible:outline-2 focus-visible:outline-sky-500">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" aria-pressed={freezeAtMs !== null} onClick={() => {
              setFreezeAtMs(freezeAtMs === null ? leftCanvasRef.current?.getElapsedMs() ?? 0 : null);
              setTeachingFocus(null);
            }}>{freezeAtMs === null ? "2枚を一時停止" : "2枚を再生"}</Button>
            {focuses.map(focus => <Button key={focus.kind} type="button" variant="outline" aria-pressed={teachingFocus?.kind === focus.kind}
              onClick={() => { setFreezeAtMs(leftCanvasRef.current?.getElapsedMs() ?? 0); setTeachingFocus(focus); }}>{focus.label}を比較</Button>)}
            {teachingFocus ? <Button type="button" variant="ghost" onClick={() => setTeachingFocus(null)}>強調を解除</Button> : null}
            <Button type="button" variant="ghost" onClick={() => moveTo(waveformsRef.current)}>波形へ移動</Button>
          </div>
          <p role="status" className="mt-2 text-xs leading-6 text-muted-foreground">
            {teachingFocus ? `${teachingFocus.label}を左右で強調しています。同じ終了時刻の6秒間を表示します。` : focuses.length ? "観察項目を押すと、左右の波形を同じ時刻で止め、見る場所を強調します。" : "この組み合わせは強調表示に未対応です。一時停止すると、左右それぞれで2点計測ができます。"}
          </p>
        </section>
        <div ref={waveformsRef} role="region" aria-label="比較する2枚の波形" tabIndex={-1} className="grid min-h-0 scroll-mt-4 gap-4 rounded-lg focus-visible:outline-2 focus-visible:outline-sky-500 lg:grid-cols-2">
          <CompareCaseCard
            canvasRef={leftCanvasRef}
            freezeAtMs={freezeAtMs}
            teachingFocus={teachingFocus}
            ecgCase={leftCase}
            sideLabel={originCaseId === leftCase.id ? "学習していた症例" : "比較する症例①"}
            missingCaseId={missingLeftCaseId}
          />
          <CompareCaseCard
            freezeAtMs={freezeAtMs}
            teachingFocus={teachingFocus}
            ecgCase={rightCase}
            sideLabel={originCaseId === rightCase.id ? "学習していた症例" : "比較する症例②"}
            missingCaseId={missingRightCaseId}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">同じ6秒間の幅で表示しています。症例ごとの見方は下で確認できます。</p>
          <Button type="button" variant="outline" onClick={() => moveTo(controlsRef.current)}>比較の操作に戻る</Button>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <CompareCaseExplanation key={leftCase.id} ecgCase={leftCase} />
          <CompareCaseExplanation key={rightCase.id} ecgCase={rightCase} />
        </div>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.45fr)]">
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <ListChecks className="size-4 text-primary" aria-hidden />
              <h2 className="text-sm font-semibold">見分けるポイント</h2>
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
              <h2 className="text-sm font-semibold">学習上の補足</h2>
            </div>
            {selectedPair.caution ? <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {selectedPair.caution}
            </p> : null}
            <p className="mt-3 rounded-md border border-border bg-muted/25 p-3 text-xs leading-relaxed text-muted-foreground">
              {SAFETY_NOTE}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
