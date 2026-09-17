"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { WaveformCalipers } from "@/components/WaveformCalipers";
import { emptyTwelveLeadDraft, parseTwelveLeadDraft, formatTwelveLeadNotes } from "@/lib/ecg/twelveLeadProgress";
import { TWELVE_EXPLANATIONS } from "@/data/twelveLeadExplanations";
import { Button } from "@/components/ui/button";
import { CLINICAL_CHOICES, CLINICAL_LESSONS, LOCALIZATION_CHOICES, READING_STEPS } from "@/data/twelveLeadLessons";
import { clinicalPath, isClinicalRecord, REPORT_ROWS, TWELVE_LEADS, type ClinicalRecord, type TwelveLead } from "@/lib/ecg/twelveLead";

function Trace({data, lead, start, seconds, extent}: {data: ClinicalRecord; lead: TwelveLead; start: number; seconds: number; extent: number}) {
  const id = useId();
  const height = extent * 80 + 32, baseline = height / 2;
  const path = useMemo(() => clinicalPath(data.leads[lead], data.sampleRate, start, seconds, baseline), [data, lead, start, seconds, baseline]);
  return <svg role="img" aria-label={`${lead}誘導 ${start}〜${start + seconds}秒`} width={seconds * 100 + 32} height={height} viewBox={`0 0 ${seconds * 100 + 32} ${height}`} className="block bg-white text-slate-950">
    <defs><pattern id={id} width="20" height="20" patternUnits="userSpaceOnUse"><path d="M4 0V20 M8 0V20 M12 0V20 M16 0V20 M0 4H20 M0 8H20 M0 12H20 M0 16H20" stroke="#ffe4e6" strokeWidth="0.4"/><path d="M20 0H0V20" fill="none" stroke="#fda4af" strokeWidth="0.6"/></pattern></defs>
    <rect width="100%" height="100%" fill={`url(#${id})`}/>
    <text x="4" y="14" fontSize="12" fill="currentColor">{lead}</text>
    <path d={`M2 ${baseline}H6V${baseline-40}H26V${baseline}H30`} fill="none" stroke="#64748b" strokeWidth="1"/>
    <path d={path} transform="translate(32 0)" fill="none" stroke="#0f172a" strokeWidth="1"/>
  </svg>;
}
function Lesson({lesson, studyMode, onNext}: {lesson: typeof CLINICAL_LESSONS[number]; studyMode: boolean; onNext: () => void}) {
  const explanation = TWELVE_EXPLANATIONS[lesson.id];
  const answerChoices: readonly string[] = "kind" in lesson && lesson.kind === "localization" ? LOCALIZATION_CHOICES : CLINICAL_CHOICES;
  const [quizAnswer, setQuizAnswer] = useState("");
  const quizChoices = useMemo(() => { const pool = answerChoices.filter(choice => choice !== lesson.answer && choice !== "判断を保留"); const base = [lesson.answer, ...pool.slice(0, 3)]; const offset = lesson.id.charCodeAt(0) % base.length; return [...base.slice(offset), ...base.slice(0, offset)]; }, [answerChoices, lesson.answer, lesson.id]);
  const compareRef = useRef<HTMLDetailsElement>(null);
  const [secondLead, setSecondLead] = useState<TwelveLead>("V1");
  const [fullTen, setFullTen] = useState(true);
  const [measuring, setMeasuring] = useState(false);
  const [measurementRevision, setMeasurementRevision] = useState(0);
  const [data, setData] = useState<ClinicalRecord | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [start, setStart] = useState(0);
  const [lead, setLead] = useState<TwelveLead>("II");
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/ecg/ptbxl/${lesson.id}.json`, {signal: controller.signal}).then(r => {if (!r.ok) throw new Error(); return r.json();}).then(value => {
      if (!isClinicalRecord(value)) throw new Error();
      setData(value);
    }).catch(() => {if (!controller.signal.aborted) setError(true);});
    return () => controller.abort();
  }, [lesson.id, retry]);
  const extent = useMemo(() => data ? Math.max(2, Math.ceil(Math.max(...TWELVE_LEADS.map(l => Math.max(...data.leads[l].map(Math.abs)))))) : 2, [data]);
  if (error) return <div role="alert" className="p-4">波形を読み込めませんでした。<Button onClick={() => {setError(false); setRetry(v => v + 1);}}>再試行</Button></div>;
  if (!data) return <p role="status" className="p-4">12誘導の実記録を読み込んでいます…</p>;
  return <div className="space-y-5">
    <section className="rounded-xl border border-sky-200 bg-sky-50/40 p-3 md:p-5 dark:border-sky-900 dark:bg-sky-950/20" aria-label="12誘導一覧">
      <h3 className="flex items-center gap-2 font-semibold"><span className="inline-flex size-7 items-center justify-center rounded-full bg-sky-600 text-sm text-white">1</span>12誘導を見る</h3>
      <p className="mt-1 text-sm text-muted-foreground">気になる誘導を押すと拡大できます。</p>
      <div className="my-3 flex flex-wrap gap-2" aria-label="表示する時間区間" role="group">{[0,2.5,5,7.5].map(t => <Button key={t} variant={start === t ? "secondary" : "outline"} aria-pressed={start === t} onClick={() => setStart(t)}>{t}〜{t+2.5}秒</Button>)}</div>
      <div className="overflow-x-auto rounded-lg border" tabIndex={0} role="region" aria-label="12誘導波形・横スクロール可能">
        <div className="grid w-max grid-cols-4">{REPORT_ROWS.flat().map(l => <button key={l} type="button" aria-label={`${l}誘導を拡大`} aria-pressed={lead === l} onClick={() => setLead(l)} className="border border-rose-100 text-left focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-sky-600"><Trace data={data} lead={l} start={start} seconds={2.5} extent={extent}/></button>)}</div>
      </div>
      <details className="mt-2 text-xs text-muted-foreground"><summary className="cursor-pointer py-1">表示条件</summary><p className="mt-1 leading-5">全誘導は同じ時刻・尺度です。25 mm/s、10 mm/mV相当。小マスは40 ms、0.1 mVです。画面では横にスクロールできます。</p></details>
    </section>
    <details ref={compareRef} aria-label="注目誘導の拡大と計測" className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 md:p-5 focus-visible:outline-2 focus-visible:outline-amber-500 dark:border-amber-900 dark:bg-amber-950/20">
      <summary className="cursor-pointer font-semibold text-amber-950 dark:text-amber-100">注目誘導を拡大する <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-100">任意</span></summary>
      <div className="my-3 flex flex-wrap gap-3">
        <label className="text-sm">上の誘導<select className="ml-2 min-h-11 rounded border bg-background p-2" value={lead} onChange={e => setLead(e.target.value as TwelveLead)}>{TWELVE_LEADS.map(l => <option key={l}>{l}</option>)}</select></label>
        <label className="text-sm">下の誘導<select className="ml-2 min-h-11 rounded border bg-background p-2" value={secondLead} onChange={e => setSecondLead(e.target.value as TwelveLead)}>{TWELVE_LEADS.map(l => <option key={l}>{l}</option>)}</select></label>
        <Button type="button" variant="outline" onClick={() => {setLead("V1"); setSecondLead("V6");}}>QRSを見る：V1・V6</Button>
        <Button type="button" variant="outline" onClick={() => {setLead("I"); setSecondLead("aVF");}}>電気軸を見る：I・aVF</Button>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <Button type="button" variant={fullTen ? "secondary" : "outline"} aria-pressed={fullTen} onClick={() => setFullTen(true)}>10秒全体</Button>
        <Button type="button" variant={!fullTen ? "secondary" : "outline"} aria-pressed={!fullTen} onClick={() => setFullTen(false)}>一覧と同じ{start}〜{start+2.5}秒</Button>
        <Button type="button" variant="outline" aria-pressed={measuring} onClick={() => setMeasuring(v => !v)}>{measuring ? "計測を終了" : "2点を選んで計測"}</Button>
        {measuring ? <Button type="button" variant="ghost" onClick={() => setMeasurementRevision(v => v + 1)}>計測点をクリア</Button> : null}
      </div>
      {lead === secondLead ? <p className="mb-2 text-sm">同じ誘導を表示しています。違いを比べる場合は片方を変更してください。</p> : null}
      <div className="overflow-x-auto border" tabIndex={0} role="region" aria-label="同期した2誘導波形・横スクロール可能">
        <div className="w-max">{[lead,secondLead].map((l,index) => <div key={`${index}-${l}-${fullTen}-${start}-${measurementRevision}`} className="relative border-b">
          <Trace data={data} lead={l} start={fullTen ? 0 : start} seconds={fullTen ? 10 : 2.5} extent={extent}/>
          {measuring ? <div className="absolute top-0 left-8" style={{width:fullTen ? 1000 : 250, height:extent*80+32}}>
            <WaveformCalipers scale={{width:fullTen ? 1000 : 250,height:extent*80+32,visibleMs:fullTen ? 10000 : 2500,baselineY:(extent*80+32)/2,pxPerMv:40}}/>
          </div> : null}
        </div>)}</div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">上下は同じ時刻・尺度です。</p>
      {measuring ? <p className="mt-2 text-sm leading-6">PR：P波の始まりからQRSの始まり。QRS：同じQRSの始まりから終わり。RR：隣のR波の頂点まで。同じ誘導内で2点を選びます。左右キーで5 ms、Shift併用で40 ms、Enterで指定。境界位置の自動採点はありません。</p> : null}
    </details>
    {studyMode ? <section aria-label="この波形の学び方" className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 md:p-5 dark:border-violet-900 dark:bg-violet-950/20">
      <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white">まず学ぶ</span><h3 className="text-lg font-semibold">{lesson.answer}</h3></div>
      <p className="mt-3 rounded-lg bg-background p-3 font-medium">{explanation.takeaway}</p>
      <h4 className="mt-4 font-semibold">ここを順に見る</h4>
      <ol className="mt-2 grid gap-3 lg:grid-cols-3">{explanation.steps.map((step,i) => <li key={step.title} className="rounded-lg border bg-background p-3 text-sm">
        <div className="flex items-center gap-2"><span className="inline-flex size-6 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-800 dark:bg-violet-900 dark:text-violet-100">{i+1}</span><span className="font-semibold">{step.title}</span></div>
        <p className="mt-2 font-medium text-sky-700 dark:text-sky-300">{step.leads.join("・")}</p><p className="mt-1">{step.where}</p>
        <p className="mt-2 text-muted-foreground">見るもの：{step.lookFor}</p><p className="mt-2 rounded bg-amber-50 p-2 dark:bg-amber-950/40">目安：{step.criterion}</p>
        <Button type="button" variant="outline" className="mt-3 h-auto min-h-10 whitespace-normal" onClick={() => {setLead(step.leads[0]); setSecondLead(step.leads[1]); setFullTen(true); setMeasuring(false); compareRef.current?.setAttribute("open", ""); compareRef.current?.scrollIntoView({block:"start"});}}>{step.leads.join("・")}を拡大</Button>
      </li>)}</ol>
      <div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-lg border bg-background p-3"><h4 className="font-semibold">鑑別の考え方</h4><p className="mt-2 text-sm leading-6">{explanation.distinction}</p></div><div className="rounded-lg border bg-background p-3"><h4 className="font-semibold">見落としやすい点</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">{explanation.checklist.map(item => <li key={item}>{item}</li>)}</ul></div></div>
      <p className="mt-3 text-xs text-muted-foreground">この記録の提供元ラベルを使った学習項目です。急性冠閉塞や責任血管を、この画面だけで確定するものではありません。</p>
    </section> : <section aria-label="12誘導4択クイズ" className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 md:p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
      <h3 className="flex items-center gap-2 font-semibold"><span className="inline-flex size-7 items-center justify-center rounded-full bg-emerald-600 text-sm text-white">2</span>{"kind" in lesson && lesson.kind === "localization" ? "変化の領域はどこですか？" : "この12誘導はどれですか？"}</h3>
      <p className="mt-1 text-sm text-muted-foreground">最も当てはまるものを1つ選んでください。</p>
      <div className="mt-4 grid gap-2 md:grid-cols-2">{quizChoices.map(choice => { const answered = !!quizAnswer; const correct = choice === lesson.answer; const selected = choice === quizAnswer; return <Button key={choice} type="button" variant="outline" disabled={answered} onClick={() => setQuizAnswer(choice)} className={`h-auto min-h-12 justify-start whitespace-normal py-3 text-left disabled:opacity-100 ${answered && correct ? "border-emerald-600 bg-emerald-100 dark:bg-emerald-950" : selected ? "border-rose-600 bg-rose-100 dark:bg-rose-950" : ""}`}>{choice}</Button>;})}</div>
      {quizAnswer ? <section aria-label="回答結果" className="mt-4 rounded-lg border bg-background p-4"><p role="status" className={`font-semibold ${quizAnswer === lesson.answer ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>{quizAnswer === lesson.answer ? "正解です" : `正解は「${lesson.answer}」です`}</p><p className="mt-2 font-medium">{explanation.takeaway}</p><h4 className="mt-4 text-sm font-semibold">判読手順</h4><ol className="mt-2 space-y-2">{explanation.steps.map((step,i) => <li key={step.title} className="rounded border p-3 text-sm"><p className="font-semibold">{i+1}. {step.leads.join("・")}：{step.title}</p><p className="mt-1">{step.lookFor}</p><p className="mt-1 text-muted-foreground">目安：{step.criterion}</p></li>)}</ol><div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30"><b>鑑別：</b>{explanation.distinction}</div><Button type="button" className="mt-4" onClick={onNext}>次の問題</Button></section> : null}
    </section>}
  </div>;
}
export function TwelveLeadWorkspace({mode = "study"}: {mode?: "study" | "quiz"}) {
  const [index,setIndex] = useState(0);
  const studyMode = mode === "study";
  const selectLesson = (nextIndex: number) => setIndex(nextIndex);
  const [exportMessage, setExportMessage] = useState("");
  const readSaved = () => CLINICAL_LESSONS.map(c => {
    try {return parseTwelveLeadDraft(window.localStorage.getItem(`ecg-lab.twelve.v1.${c.id}`));}
    catch {return emptyTwelveLeadDraft();}
  });
  const [saved, setSaved] = useState(readSaved);
  const exportNotes = () => {
    try {
      const latest = CLINICAL_LESSONS.map(c => parseTwelveLeadDraft(window.localStorage.getItem(`ecg-lab.twelve.v1.${c.id}`)));
      const blob = new Blob(["\uFEFF", formatTwelveLeadNotes(latest)], {type:"text/plain;charset=utf-8"});
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "ecg-12lead-notes.txt";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setSaved(latest);
      setExportMessage("書き出しを開始しました。ブラウザのダウンロードを確認してください。");
    } catch {
      setExportMessage("書き出せませんでした。保存した内容を開き、文章をコピーしてください。");
    }
  };
  const lesson = CLINICAL_LESSONS[index];
  return <main className="min-h-0 flex-1 overflow-y-auto bg-muted/20"><div className="mx-auto max-w-7xl space-y-4 p-3 md:p-6">
    <header><h2 className="text-xl font-semibold">{studyMode ? "12誘導学習" : "12誘導クイズ"}</h2><p className="mt-1 text-sm text-muted-foreground">{studyMode ? "症例を選び、12誘導波形と判読手順を一緒に確認します。" : "12誘導を観察し、4択で診断や変化の領域を答えます。"}</p></header>
    {studyMode ? <details className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-900 dark:bg-rose-950/20"><summary className="cursor-pointer font-semibold">虚血・梗塞部位と誘導の対応</summary><div className="mt-3 grid gap-2 text-sm md:grid-cols-2 lg:grid-cols-3"><p className="rounded bg-background p-3"><b>前壁中隔</b><br/>V1〜V4</p><p className="rounded bg-background p-3"><b>側壁</b><br/>I・aVL・V5・V6</p><p className="rounded bg-background p-3"><b>下壁</b><br/>II・III・aVF</p><p className="rounded bg-background p-3"><b>後壁</b><br/>V1〜V3の鏡像変化。V7〜V9で直接確認</p><p className="rounded bg-background p-3"><b>右室</b><br/>下壁変化から疑い、V3R・V4Rで確認</p><p className="rounded bg-background p-3"><b>対側性変化</b><br/>変化のある領域と反対側の誘導も照合</p></div></details> : null}
    {studyMode ? <label className="block rounded-xl border bg-card p-4 text-sm font-medium">症例プリセット<select value={index} onChange={event => selectLesson(Number(event.target.value))} className="mt-2 block min-h-11 w-full rounded-md border bg-background p-2"><optgroup label="疾患の判読">{CLINICAL_LESSONS.slice(0,10).map((item,i) => <option key={item.id} value={i}>{item.answer}</option>)}</optgroup><optgroup label="虚血・梗塞部位">{CLINICAL_LESSONS.slice(10).map((item,i) => <option key={item.id} value={i+10}>{item.answer}</option>)}</optgroup></select></label> : <p className="rounded-xl border bg-card p-3 text-sm font-medium">問題 {index + 1} / {CLINICAL_LESSONS.length}</p>}
    {studyMode ? <details className="rounded-xl border bg-card p-4" aria-label="保存した回答・メモ">
      <summary className="cursor-pointer font-semibold">保存した回答・メモ</summary>
      <Button type="button" variant="outline" className="mt-3" onClick={exportNotes}>保存した{CLINICAL_LESSONS.length}症例のメモを書き出す（.txt）</Button>
      <p role="status" className="mt-1 text-xs">{exportMessage}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">{saved.map((draft, i) => {
        const hasContent = draft.answer || draft.reason.trim() || draft.differential || draft.exclusion.trim() || draft.reflection.trim() || draft.evidence.length > 0 || draft.notes.some(note => note.trim());
        return <article key={CLINICAL_LESSONS[i].id} className="rounded-lg border p-3 text-sm">
          <h4 className="font-medium">症例 {i+1} · {draft.revealed ? "回答済み" : hasContent ? "下書き保存済み" : "保存した回答・メモはありません"}</h4>
          {hasContent ? <details className="mt-2">
            <summary className="cursor-pointer py-2 underline">保存した内容を読む</summary>
            <dl className="space-y-3 py-2">
              <div><dt className="font-medium">あなたの判断</dt><dd>{draft.answer || "未選択"}</dd></div>
              <div><dt className="font-medium">別に考えた診断</dt><dd>{draft.differential || "未選択"}</dd></div>
              <div><dt className="font-medium">除外・保留した根拠</dt><dd className="whitespace-pre-wrap break-words">{draft.exclusion || "未記入"}</dd></div>
              <div><dt className="font-medium">根拠に使った誘導</dt><dd>{draft.evidence.join("・") || "未選択"}</dd></div>
              {READING_STEPS.map((step,j) => <div key={step.label}><dt className="font-medium">{step.label}</dt><dd className="whitespace-pre-wrap break-words">{draft.notes[j] || "未記入"}</dd></div>)}
              <div><dt className="font-medium">その判断を支える所見</dt><dd className="whitespace-pre-wrap break-words">{draft.reason || "未記入"}</dd></div>
              <div><dt className="font-medium">解説を読んで気づいたこと</dt><dd className="whitespace-pre-wrap break-words">{draft.reflection || "未記入"}</dd></div>
            </dl>
          </details> : null}
          <Button type="button" variant="outline" className="mt-2" onClick={() => selectLesson(i)}>症例 {i+1} の回答欄へ</Button>
        </article>;
      })}</div>
    </details> : null}
    <Lesson key={lesson.id} lesson={lesson} studyMode={studyMode} onNext={() => setIndex(current => (current + 1) % CLINICAL_LESSONS.length)}/>
    <footer className="rounded-xl border bg-card p-4 text-xs leading-6 text-muted-foreground"><details><summary className="cursor-pointer font-medium text-foreground">データ出典・表示条件</summary>
      <p className="mt-3">波形：Wagnerほか、PTB-XL v1.0.3（PhysioNet, 2022）。CC BY 4.0。</p>
      <p><a className="underline" href="https://physionet.org/content/ptb-xl/1.0.3/" target="_blank" rel="noreferrer">データ出典と原著</a> · <a className="underline" href="/ecg/ptbxl/ATTRIBUTION.md" target="_blank" rel="noreferrer">出典・変更内容</a> · <a className="underline" href="/ecg/ptbxl/LICENSE.txt" target="_blank" rel="noreferrer">CC BY 4.0 ライセンス</a> · <a className="underline" href="https://www.jacc.org/doi/10.1016/j.jacc.2007.01.024" target="_blank" rel="noreferrer">AHA/ACC/HRS 表示・技術の標準化勧告</a></p>
      <p>25 mm/s・10 mm/mV相当。画面の実寸は保証しません。</p>
    </details></footer>
  </div></main>;
}
