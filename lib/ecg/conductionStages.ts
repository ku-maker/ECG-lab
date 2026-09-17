import type { ActivationTimeline } from "../../src/data/ecg/activation/types";
import type { NsrFiducials } from "../../src/data/ecg/activation/buildTimeline";

export type ConductionStage = {
  id: "rest" | "atrial" | "av" | "qrs" | "st" | "repol";
  label: string;
  title: string;
  description: string;
  color: string;
  startMs: number;
  endMs: number;
  focusMs: number;
};

/** All teaching landmarks use the same template/timeline as the rendered signal. */
export function buildConductionStages(f: NsrFiducials, timeline: ActivationTimeline): ConductionStage[] {
  const repol = timeline.events.find((event) => event.id === "repol");
  // This model has no measured T onset; use the start of its ±2σ envelope.
  const tOn = Math.max(f.qrsOff, repol ? repol.centerMs - 2 * repol.sigmaMs : f.tPeak);
  return [
    { id: "rest", label: "基線", title: "次の興奮を待つ", description: "大きな電位差がない時期です。基線は、心臓の電気的活動が完全に止まったことを意味しません。", color: "#94a3b8", startMs: 0, endMs: f.pOn, focusMs: 0 },
    { id: "atrial", label: "P波", title: "洞結節から、両心房へ", description: "右心房の洞結節を起点に興奮が心房へ広がります。P波は心房筋の脱分極を表し、洞結節そのものの発火を直接描いているわけではありません。", color: "#fbbf24", startMs: f.pOn, endMs: f.pOff, focusMs: f.pPeak },
    { id: "av", label: "PR部分", title: "房室結節で、伝導が遅れる", description: "房室結節で伝導が遅れ、その後His束へ進みます。ここで示すPR部分はP波の終わりからQRSの始まりまでで、PR間隔全体とは異なります。", color: "#6ee7b7", startMs: f.pOff, endMs: f.qrsOn, focusMs: (f.pOff + f.qrsOn) / 2 },
    { id: "qrs", label: "QRS波", title: "His束・脚から、心室筋へ", description: "His束、右脚・左脚、プルキンエ線維を経て興奮が心室筋へ広がります。QRS波は心室筋の脱分極です。伝導路の発光はその順序を示す模式表現です。", color: "#f472b6", startMs: f.qrsOn, endMs: f.qrsOff, focusMs: f.r },
    { id: "st", label: "ST部分", title: "心室の多くが興奮した状態", description: "心室筋の多くが脱分極した状態にあり、表面心電図の電位差は小さくなります。このモデルではSTとT波の境界を再分極の包絡から近似しています。", color: "#c4b5fd", startMs: f.qrsOff, endMs: tOn, focusMs: (f.qrsOff + tOn) / 2 },
    { id: "repol", label: "T波", title: "心室筋が、電気的に回復する", description: "T波は心室筋の再分極を表します。心室全体の穏やかな発光で示し、伝導路を電気が逆向きに戻るような表現にはしていません。", color: "#67e8f9", startMs: tOn, endMs: f.tEnd, focusMs: f.tPeak },
  ];
}

export function conductionStageAt(stages: ConductionStage[], phaseMs: number): ConductionStage {
  return stages.find((stage) => phaseMs >= stage.startMs && phaseMs < stage.endMs) ?? stages[0];
}

export function playbackDelta(rawDeltaMs: number, speed: number): number {
  const safeSpeed = Number.isFinite(speed) ? Math.max(0.1, Math.min(1, speed)) : 1;
  return Math.max(0, Math.min(Number.isFinite(rawDeltaMs) ? rawDeltaMs : 0, 50)) * safeSpeed;
}
