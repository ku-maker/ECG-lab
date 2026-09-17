"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ECG_CASES, type ECGCase } from "@/data/ecgCases";
import { getTeachingSteps } from "@/lib/ecg/teachingHighlights";
import { CASE_CATEGORIES, getCaseCategory, type CaseCategoryId } from "@/data/caseCategories";
import { findComparisonPairsForCase } from "@/data/comparisonPairs";

function normalizeSearch(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().trim();
}

export function CaseLibrary({ onClose, onSelect }: {
  onClose: () => void;
  onSelect: (ecgCase: ECGCase) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [highlightOnly, setHighlightOnly] = useState(false);
  const [category, setCategory] = useState<CaseCategoryId>("all");
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  const cases = ECG_CASES.filter((ecgCase) => {
    if (highlightOnly && getTeachingSteps(ecgCase.id).length === 0) return false;
    if (category !== "all" && getCaseCategory(ecgCase.id) !== category) return false;
    const text = normalizeSearch([ecgCase.label, ecgCase.abbr, ecgCase.description, ...ecgCase.learningPoints].join(" "));
    return terms.every((term) => text.includes(term));
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);

  return (
    <dialog ref={dialogRef} aria-labelledby="case-library-title" aria-describedby="case-library-description"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_1.5rem)] max-w-4xl overflow-hidden rounded-2xl border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-slate-950/60">
      <div className="flex max-h-[90dvh] flex-col">
        <header className="shrink-0 border-b border-border p-4 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="case-library-title" className="text-lg font-semibold">症例ライブラリ</h2>
              <p id="case-library-description" className="mt-1 text-sm leading-6 text-muted-foreground">概要を見て、学びたい波形を選びましょう。</p>
            </div>
            <Button type="button" variant="ghost" size="icon" aria-label="症例ライブラリを閉じる" onClick={onClose}>
              <X aria-hidden />
            </Button>
          </div>
          <label htmlFor="case-library-search" className="mt-4 block text-xs font-medium">症例名・略称・解説の言葉で検索</label>
          <div className="relative mt-2">
            <Search aria-hidden className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" />
            <input ref={searchRef} id="case-library-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)}
              placeholder="例：房室ブロック、AF、P波"
              className="h-11 w-full rounded-lg border border-border bg-card pr-3 pl-10 text-base outline-none focus-visible:ring-2 focus-visible:ring-sky-500" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="症例の分類">{CASE_CATEGORIES.map(item => <Button key={item.id} type="button" size="sm" variant={category === item.id ? "secondary" : "outline"} aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.label}</Button>)}</div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={highlightOnly} onChange={(event) => setHighlightOnly(event.target.checked)} className="size-4 accent-sky-600" />
              波形の強調に対応した症例のみ
            </label>
            <p role="status" className="text-xs text-muted-foreground">{ECG_CASES.length}症例中 {cases.length}症例</p>
          </div>
        </header>
        <div className="min-h-0 overflow-y-auto overscroll-contain p-4 md:p-6">
          {cases.length > 0 ? <ul className="grid gap-3 md:grid-cols-2">
            {cases.map((ecgCase) => <li key={ecgCase.id} className="flex flex-col rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold">{ecgCase.label}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{CASE_CATEGORIES.find(item => item.id === getCaseCategory(ecgCase.id))?.label} · <span className="font-mono">{ecgCase.abbr}</span></p>
              <p className="mt-3 flex-1 text-sm leading-7 text-foreground/80">{ecgCase.description}</p>
              {getTeachingSteps(ecgCase.id).length > 0 ? <p className="mt-3 text-xs text-sky-700 dark:text-sky-300">解説から波形の該当箇所を強調できます</p> : null}
              {(() => { const pair = findComparisonPairsForCase(ecgCase.id)[0]; const other = pair && ECG_CASES.find(item => item.id === (pair.leftCaseId === ecgCase.id ? pair.rightCaseId : pair.leftCaseId)); return other ? <Button type="button" variant="ghost" className="mt-2 h-auto min-h-10 justify-start whitespace-normal text-left text-sky-700 dark:text-sky-300" onClick={() => onSelect(other)}>似た症例：{other.label}を見る</Button> : null; })()}
              <Button type="button" variant="outline" className="mt-4 h-10 w-full" aria-label={`${ecgCase.label}を学ぶ`} onClick={() => onSelect(ecgCase)}>
                この症例を学ぶ <ArrowRight aria-hidden />
              </Button>
            </li>)}
          </ul> : <div className="py-10 text-center">
            <p className="font-medium">条件に合う症例がありません</p>
            <p className="mt-2 text-sm text-muted-foreground">短い言葉や略称で検索するか、条件を解除してください。</p>
            <Button type="button" variant="outline" className="mt-4" onClick={() => { setQuery(""); setHighlightOnly(false); setCategory("all"); searchRef.current?.focus(); }}>検索条件をクリア</Button>
          </div>}
        </div>
      </div>
    </dialog>
  );
}
