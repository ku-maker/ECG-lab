"use client";
import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTermsInText } from '@/data/ecgTerms';
import { getTeachingSteps } from '@/lib/ecg/teachingHighlights';

export function TermHelp({text, caseId, onStepSelect}: {text: string; caseId: string; onStepSelect?: (step: number) => void}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const close = () => { setSelectedId(null); triggerRef.current?.focus(); };
  const terms = getTermsInText(text);
  const selected = terms.find(term => term.id === selectedId);
  const steps = getTeachingSteps(caseId);
  const step = selected ? steps.findIndex(focus => selected.kinds.includes(focus.kind)) : -1;
  if (!terms.length) return null;
  return <div className="mt-2" onKeyDown={event => { if(event.key === 'Escape' && selected) {event.stopPropagation(); close();} }}>
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span>用語：</span>
      {terms.map(term => <button key={term.id} type="button" aria-expanded={selectedId === term.id} aria-label={`${term.label}の意味`}
        className="rounded px-1 py-1 text-sky-700 underline decoration-dotted underline-offset-4 focus-visible:outline-2 focus-visible:outline-sky-500 dark:text-sky-300"
        onClick={event => { triggerRef.current = event.currentTarget; setSelectedId(selectedId === term.id ? null : term.id); }}>{term.label}</button>)}
    </div>
    {selected ? <section aria-label={`${selected.label}の説明`} className="mt-2 rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
      <div className="flex items-center justify-between gap-2"><h5 className="text-sm font-semibold">{selected.label}</h5>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="用語の説明を閉じる" onClick={close}><X aria-hidden /></Button></div>
      <p className="mt-1 text-sm leading-7">{selected.meaning}</p>
      {step >= 0 && onStepSelect ? <Button type="button" variant="outline" className="mt-2 h-auto min-h-9 whitespace-normal py-2" onClick={() => onStepSelect(step)}>関連する波形を見る：{steps[step].label}</Button> : onStepSelect && selected.kinds.length > 0 ? <p className="mt-2 text-xs text-muted-foreground">この用語に対応する位置の強調は、この症例では未対応です。</p> : null}
    </section> : null}
  </div>;
}
