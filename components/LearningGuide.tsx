"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type GuideAction = "normal" | "compare" | "quiz" | "conduction" | "measure" | "review";
const lessons: { action: GuideAction; title: string; description: string; button: string }[] = [
  { action: "normal", title: "初めて学ぶ", description: "正常洞調律を開きます。解説の3ステップを押して、色が付いた場所と文章を見比べましょう。", button: "正常洞調律から始める" },
  { action: "compare", title: "似た波形と比べる", description: "正常洞調律と洞性徐脈を並べます。共通する形と、拍の間隔の違いに注目しましょう。", button: "正常洞調律と洞性徐脈を比べる" },
  { action: "measure", title: "計測する", description: "正常洞調律を止めて、PR間隔の計測を始めます。波形の2点を選び、始点・終点の位置を確認しましょう。QRS幅やRR間隔にも切り替えられます。", button: "PR間隔を測ってみる" },
  { action: "review", title: "苦手を復習する", description: "全症例の復習一覧を開きます。症例名や判断の根拠で間違えたポイントから再挑戦できます。記録がない場合は、まずクイズを1問解いてみましょう。", button: "苦手の一覧を開く" },
];

export function LearningGuide({ onClose, onAction }: { onClose: () => void; onAction: (action: GuideAction) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);
  return <dialog ref={dialogRef} aria-labelledby="learning-guide-title"
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_1.5rem)] max-w-2xl overflow-hidden rounded-2xl border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-slate-950/60">
    <div className="flex max-h-[90dvh] flex-col">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border p-4 md:p-6">
        <div><h2 id="learning-guide-title" className="text-lg font-semibold">目的から学ぶ</h2>
          <p className="mt-1 text-sm text-muted-foreground">今日は何を学びますか？目的から選んで始められます。</p></div>
        <Button type="button" variant="ghost" size="icon" aria-label="学習ガイドを閉じる" onClick={onClose}><X aria-hidden /></Button>
      </header>
      <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain p-4 md:p-6">
        <ol className="space-y-3">{lessons.map((lesson, index) => <li key={lesson.action} className="rounded-xl border border-border bg-card p-4">
          <h3 className="flex items-center gap-2 font-semibold"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-sm text-sky-700 dark:text-sky-300">{index + 1}</span>{lesson.title}</h3>
          <p className="mt-3 text-sm leading-7 text-foreground/80">{lesson.description}</p>
          <Button type="button" variant="outline" className="mt-3 h-auto min-h-10 w-full whitespace-normal py-2" onClick={() => onAction(lesson.action)}>{lesson.button}<ArrowRight aria-hidden /></Button>
        </li>)}</ol>
        <section className="rounded-xl bg-muted/50 p-4">
          <h3 className="font-semibold">電気の伝わり方も見たいとき</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">刺激伝導マップでは、波形と3Dモデルを一緒に観察できます。誘導ボタンで視点を変え、スロー再生や一時停止で動きを追いましょう。</p>
          <Button type="button" variant="outline" className="mt-3 h-10" onClick={() => onAction("conduction")}>刺激伝導マップを開く<ArrowRight aria-hidden /></Button>
        </section>
        <p className="text-xs leading-6 text-muted-foreground">途中で迷ったら、どの画面からでもこのガイドを開けます。特定の症例を探すときは「症例ライブラリ」を使ってください。</p>
      </div>
    </div>
  </dialog>;
}
