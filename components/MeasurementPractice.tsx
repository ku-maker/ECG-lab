"use client";
import { Button } from "@/components/ui/button";
import { MEASUREMENT_TASKS, type MeasurementKind } from "@/lib/ecg/measurementPractice";

export function MeasurementPractice({ kind, hint, onStart, onHint, onEnd, onObserve }: {
  kind: MeasurementKind | null; hint: boolean;
  onStart: (kind: MeasurementKind) => void; onHint: () => void; onEnd: () => void;
  onObserve?: () => void;
}) {
  const task = MEASUREMENT_TASKS.find(item => item.kind === kind);
  return <section aria-label="計測の練習" className="rounded-xl border border-border bg-card p-4">
    <h3 className="font-semibold">計測の練習</h3>
    <p className="mt-1 text-sm text-muted-foreground">課題を選ぶと波形が止まります。上の波形で2点を選ぶと、その位置と時間差を確認できます。</p>
    <div className="mt-3 flex flex-wrap gap-2">
      {MEASUREMENT_TASKS.map(item => <Button key={item.kind} type="button" variant={kind === item.kind ? "secondary" : "outline"} aria-pressed={kind === item.kind} onClick={() => onStart(item.kind)}>{item.label}を測る</Button>)}
    </div>
    {task ? <div className="mt-3 space-y-2">
      <p role="status" className="text-sm">{task.instruction} 選ぶ高さは採点に使いません。</p>
      <details key={task.kind} className="rounded-lg border p-3 text-sm leading-6">
        <summary className="cursor-pointer font-medium">{task.label}の測り方・結果の読み方</summary>
        <p className="mt-2">{task.instruction} 左側の点を「始点」、右側の点を「終点」として確認します。クリックした順番は問いません。</p>
        <p className="mt-2">「右へ」は後の時刻、「左へ」は前の時刻に選び直す目安です。長さが合っていても、2点が同じだけずれていれば測る場所を見直しましょう。</p>
        <p className="mt-2">位置のヒントで波形を確認し、次のクリックから2点を選び直してください。キーボードでは左右キーで5 ms、Shift＋左右キーで40 msずつ動かし、Enterで点を置けます。</p>
        {onObserve ? <Button type="button" variant="outline" className="mt-2" onClick={onObserve}>関連する観察ステップへ（練習を終了）</Button> : null}
      </details>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" aria-pressed={hint} onClick={onHint}>{hint ? "位置のヒントを隠す" : "位置のヒントを表示"}</Button>
        <Button type="button" variant="ghost" onClick={onEnd}>練習を終了</Button>
      </div>
    </div> : null}
    <p className="mt-2 text-xs leading-6 text-muted-foreground">教育用波形の基準位置と照合します。始点・終点それぞれ±20 msを目安にします。再生・症例変更・心拍数変更で練習を終了します。</p>
  </section>;
}
