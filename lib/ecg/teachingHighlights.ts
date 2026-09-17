import { templateToBeatMs } from "./rateTiming.ts";
import type { BeatTemplate } from "../../src/data/ecg/templates";
import {
  AV_BLOCK_P_BPM, AV_BLOCK_ESCAPE_BPM, AV_BLOCK_P_PEAK_OFFSET_MS,
  AV_BLOCK_QRS_PEAK_OFFSET_MS, AV_BLOCK_ESCAPE_PHASE_OFFSET_MS,
  isMobitz2DroppedBeat, isWenckebachDroppedBeat,
  getWenckebachPPeakOffsetMs, getWenckebachQrsPeakOffsetMs,
  WENCKEBACH_PR_DELAY_FRACTIONS,
} from "./teachingTiming.ts";

export type TeachingKind = "p" | "qrs" | "pr" | "rr" | "pq" | "sequence" | "dropped" | "independent";
export type TeachingFocus = { kind: TeachingKind; label: string; hint: string };
export type TeachingSelection = { caseId: string; step: number };
export type TeachingMark = {
  startMs: number;
  endMs: number;
  kind: "p" | "qrs" | "t" | "pr" | "rr" | "dropped";
  label: string;
};
const P: TeachingFocus = { kind: "p", label: "P波", hint: "青い帯がP波です。出る間隔を追ってみましょう。" };
const QRS: TeachingFocus = { kind: "qrs", label: "QRS波", hint: "紫の帯がQRS波です。P波との並び方を見ます。" };
const PR: TeachingFocus = { kind: "pr", label: "PR間隔", hint: "帯の横幅を比べます。P波の始まりからQRS波の始まりまでがPR間隔です。" };
const DROP: TeachingFocus = { kind: "dropped", label: "QRSの脱落", hint: "赤い破線はQRSが来ない位置の目安です。その前の青いP波は残っています。" };
const CASE_STEPS: Record<string, readonly TeachingFocus[]> = {
  "sinus-brady": [
    { kind: "rr", label: "RR間隔", hint: "隣り合うR波を結ぶ帯です。正常洞調律の例と横幅を比べてみましょう。" },
    P,
    { kind: "pq", label: "P波とQRS波の並び", hint: "青のP波のあとに、紫のQRS波が毎回続くか追います。" },
  ],
  "sinus-tachy": [
    { kind: "rr", label: "RR間隔", hint: "隣り合うR波を結ぶ帯です。短い間隔で並ぶ様子を見ます。" },
    P,
    { kind: "pq", label: "P波とQRS波の並び", hint: "青がP波、紫がQRS波です。速いリズムでも順番を追ってみましょう。" },
  ],
  nsr: [
    { kind: "rr", label: "RR間隔", hint: "隣り合うR波を結ぶ帯の横幅を比べてみましょう。" },
    P,
    { kind: "sequence", label: "P → QRS → T", hint: "青がP波、紫がQRS波、緑がT波です。左から順に追います。" },
  ],
  avblock1: [PR, PR, QRS],
  mobitz2: [P, PR, DROP],
  wenckebach: [P, { ...PR, hint: "PRの帯が順に長くなり、QRSが抜けたあとに短く戻る様子を見ます。" }, DROP],
  avblock3: [P, QRS, { kind: "independent", label: "P波とQRS波の関係", hint: "青のP波と紫のQRS波を別々に追います。両者の間隔が変わっていきます。" }],
};
export function getTeachingSteps(caseId: string): readonly TeachingFocus[] {
  return CASE_STEPS[caseId] ?? [];
}

export function getComparisonFocuses(leftId: string, rightId: string): TeachingFocus[] {
  const supported = (id: string): string[] => {
    if (!CASE_STEPS[id]) return [];
    if (id === "avblock3") return ["p", "qrs"];
    if (id === "mobitz2" || id === "wenckebach") return ["p", "qrs", "pr", "dropped"];
    return ["p", "qrs", "pr", "rr"];
  };
  const left = supported(leftId), right = supported(rightId);
  return [P, QRS, PR, { kind: "rr", label: "RR間隔", hint: "隣り合うR波を結ぶ帯の横幅を左右で比べます。" } as TeachingFocus, DROP]
    .filter(focus => left.includes(focus.kind) && right.includes(focus.kind));
}

/** Build marks on the same time axis as EcgCanvas, including its negative-time prefill. */
export function buildTeachingMarks(
  template: BeatTemplate,
  normalTemplate: BeatTemplate,
  bpm: number,
  fromMs: number,
  toMs: number,
  kind: TeachingKind,
): TeachingMark[] {
  if (![bpm, fromMs, toMs].every(Number.isFinite) || bpm <= 0 || toMs <= fromMs) return [];
  const caseId = template.id.replace(/-lead2-v0$/, "");
  if (!CASE_STEPS[caseId]) return [];
  const marks: TeachingMark[] = [];
  const add = (startMs: number, endMs: number, type: TeachingMark["kind"], label: string) => {
    if (endMs > fromMs && startMs < toMs && endMs > startMs) marks.push({ startMs, endMs, kind: type, label });
  };
  if (caseId === "avblock3") {
    // These Gaussian wave boundaries are illustrative (±2 sigma), not measured onsets.
    if (kind === "p" || kind === "independent") {
      const period = 60_000 / AV_BLOCK_P_BPM;
      for (let i = Math.floor(fromMs / period) - 1; i <= Math.ceil(toMs / period); i++) {
        const peak = i * period + AV_BLOCK_P_PEAK_OFFSET_MS;
        add(peak - 84, peak + 84, "p", "P");
      }
    }
    if (kind === "qrs" || kind === "independent") {
      const period = 60_000 / AV_BLOCK_ESCAPE_BPM;
      for (let i = Math.floor(fromMs / period) - 1; i <= Math.ceil(toMs / period) + 1; i++) {
        const peak = i * period - AV_BLOCK_ESCAPE_PHASE_OFFSET_MS + AV_BLOCK_QRS_PEAK_OFFSET_MS;
        add(peak - 104, peak + 215, "qrs", "QRS");
      }
    }
    return marks;
  }
  const beatMs = 60_000 / bpm;
  const source = caseId === "mobitz2" ? normalTemplate : template;
  const f = source.fiducialsMs;
  const at = (offset: number) => templateToBeatMs(source, offset, beatMs);
  const sequenceBeat = Math.round(((fromMs + toMs) / 2 - beatMs / 2) / beatMs);
  for (let i = Math.floor(fromMs / beatMs) - 1; i <= Math.ceil(toMs / beatMs); i++) {
    const base = i * beatMs;
    const wenck = caseId === "wenckebach";
    const dropped = caseId === "mobitz2" ? isMobitz2DroppedBeat(i) : wenck && isWenckebachDroppedBeat(i);
    const pPeak = base + (wenck ? getWenckebachPPeakOffsetMs(beatMs) : at(f.pPeak ?? 180));
    const pOn = wenck ? pPeak - 84 : base + at(f.pOn ?? 120);
    const pOff = wenck ? pPeak + 84 : base + at(f.pOff ?? 240);
    // For a dropped Wenckebach beat, the last conducted delay locates the missing-QRS region approximately.
    const qPeak = base + (wenck ? (getWenckebachQrsPeakOffsetMs(beatMs, i)
      ?? getWenckebachPPeakOffsetMs(beatMs) + WENCKEBACH_PR_DELAY_FRACTIONS[2] * 1000) : at(f.r ?? 400));
    const qOn = wenck ? qPeak - 38 : base + at(f.qrsOn ?? 360);
    const qOff = wenck ? qPeak + 58 : base + at(f.qrsOff ?? 460);
    if (kind === "p" || kind === "pq" || (kind === "dropped" && dropped)) add(pOn, pOff, "p", "P");
    if ((kind === "qrs" || kind === "pq") && !dropped) add(qOn, qOff, "qrs", "QRS");
    if (kind === "pr" && !dropped) add(pOn, qOn, "pr", wenck ? "PR（目安）" : "PR");
    if ((kind === "dropped" || kind === "pr") && dropped) add(qOn, qOff, "dropped", "QRSなし");
    if (kind === "rr") add(qPeak, qPeak + beatMs, "rr", "RR");
    if (kind === "sequence" && i === sequenceBeat) {
      add(pOn, pOff, "p", "P");
      add(qOn, qOff, "qrs", "QRS");
      // Templates provide T peak/end, not onset; use the teaching timeline's ±2σ convention.
      const tPeak = f.tPeak ?? 640;
      const tEnd = f.tEnd ?? 820;
      const tOn = Math.max(f.qrsOff ?? 460, tPeak - 2 * (tEnd - (f.qrsOff ?? 460)) / 5);
      add(base + at(tOn), base + at(tEnd), "t", "T（目安）");
    }
  }
  return marks;
}
