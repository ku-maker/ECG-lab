import type { BeatTemplate } from "@/src/data/ecg/templates";
import { ECG_TEMPLATE_OPTIONS } from "@/src/data/ecg/templates";
import { buildTeachingMarks, type TeachingFocus } from "@/lib/ecg/teachingHighlights";
import type { MonitorScale } from "@/lib/ecg/monitorScale";

const COLORS = { p: "#0369a1", qrs: "#7e22ce", t: "#047857", pr: "#a16207", rr: "#0369a1", dropped: "#be123c" };

export function WaveformTeachingOverlay({ focus, template, bpm, scale, elapsedMs, bottomInset = 0 }: {
  focus: TeachingFocus; template: BeatTemplate; bpm: number; scale: MonitorScale; elapsedMs: number; bottomInset?: number;
}) {
  const fromMs = elapsedMs - scale.visibleMs;
  const marks = buildTeachingMarks(template, ECG_TEMPLATE_OPTIONS[0].template, bpm, fromMs, elapsedMs, focus.kind);
  const x = (ms: number) => (ms - fromMs) / scale.visibleMs * scale.width;
  // Label one central, complete occurrence of each type; all other bands remain visible.
  const labelIndices = new Set<number>();
  for (const type of new Set(marks.map((mark) => mark.kind))) {
    const candidates = marks.map((mark, index) => ({ mark, index }))
      .filter(({ mark }) => mark.kind === type && mark.startMs >= fromMs && mark.endMs <= elapsedMs)
      .sort((a, b) => Math.abs((a.mark.startMs + a.mark.endMs) / 2 - (fromMs + elapsedMs) / 2)
        - Math.abs((b.mark.startMs + b.mark.endMs) / 2 - (fromMs + elapsedMs) / 2));
    if (focus.kind === "dropped") {
      candidates.forEach(({ index }) => labelIndices.add(index));
    } else if (candidates[0]) labelIndices.add(candidates[0].index);
  }
  return (
    <svg role="img" aria-label={`波形の強調：${focus.label}。${focus.hint}`}
      viewBox={`0 0 ${scale.width} ${scale.height}`}
      className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden">
      <title>{focus.label}</title>
      <desc>{focus.hint} 色の帯は表示中の教育用波形の位置を示します。</desc>
      {marks.map((mark, index) => {
        const left = Math.max(0, x(mark.startMs));
        const right = Math.min(scale.width, x(mark.endMs));
        const color = COLORS[mark.kind];
        const lane = mark.kind === "qrs" || mark.kind === "dropped" ? 1 : mark.kind === "t" ? 2 : 0;
        const top = Math.max(24, scale.height - 12 - lane * 19 - bottomInset);
        const labelWidth = mark.label.length > 3 ? 76 : 38;
        const labelX = Math.max(labelWidth / 2 + 2, Math.min(scale.width - labelWidth / 2 - 2, (left + right) / 2));
        return (
          <g key={`${mark.kind}-${mark.startMs}`} data-highlight-kind={mark.kind}>
            <rect x={left} y={0} width={Math.max(1, right - left)} height={scale.height}
              fill={color} fillOpacity={0.1} stroke={color} strokeWidth={1.2}
              strokeDasharray={mark.kind === "dropped" ? "4 3" : undefined} />
            <path d={`M ${left} ${top + 6} V ${top} H ${right} V ${top + 6}`} fill="none" stroke={color} strokeWidth={2} />
            {labelIndices.has(index) ? <g>
              <rect x={labelX - labelWidth / 2} y={top - 12} width={labelWidth} height={17} rx={4} fill="white" fillOpacity={0.95} />
              <text x={labelX} y={top} textAnchor="middle" fontSize={11} fontWeight={700} fill={color}>{mark.label}</text>
            </g> : null}
          </g>
        );
      })}
    </svg>
  );
}
