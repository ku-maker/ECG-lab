import type { CSSProperties } from "react";

import type { ECGCaseRhythm } from "@/data/ecgCases";
import { cn } from "@/lib/utils";
import type { BeatTemplate } from "@/src/data/ecg/templates";

export const ANNOTATION_SAFETY_NOTE =
  "波形ラベルは心電図学習用の概念表示であり、正確な計測、診断、治療判断、患者モニタリング、医療機器出力の代替ではありません。";

type AnnotationTone = "landmark" | "interval" | "warning" | "muted";

type AnnotationMarker = {
  id: string;
  label: string;
  left: number;
  top: number;
  tone?: AnnotationTone;
};

type AnnotationInterval = {
  id: string;
  label: string;
  start: number;
  end: number;
  top: number;
  tone?: AnnotationTone;
};

type EcgAnnotationOverlayProps = {
  template: BeatTemplate;
  caseId?: string;
  bpm?: number;
  rhythm?: ECGCaseRhythm;
  secondsVisible?: number;
  className?: string;
};

const LABEL_CLASS: Record<AnnotationTone, string> = {
  landmark:
    "border-emerald-500/30 bg-emerald-500/15 text-emerald-950 shadow-emerald-950/5",
  interval:
    "border-sky-500/30 bg-sky-500/15 text-sky-950 shadow-sky-950/5",
  warning:
    "border-amber-500/40 bg-amber-500/20 text-amber-950 shadow-amber-950/5",
  muted:
    "border-slate-500/25 bg-white/70 text-slate-700 shadow-slate-950/5",
};

const LINE_CLASS: Record<AnnotationTone, string> = {
  landmark: "border-emerald-600/70 text-emerald-950",
  interval: "border-sky-600/70 text-sky-950",
  warning: "border-amber-600/80 text-amber-950",
  muted: "border-slate-500/60 text-slate-700",
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeCaseKey(
  caseId: string | undefined,
  templateId: string
): string {
  return `${caseId ?? ""} ${templateId}`.toLowerCase();
}

function includesAny(value: string, needles: string[]): boolean {
  return needles.some((needle) => value.includes(needle));
}

function getFiducial(
  template: BeatTemplate,
  key: keyof BeatTemplate["fiducialsMs"],
  fallback: number
): number {
  return template.fiducialsMs[key] ?? fallback;
}

function createPositionMapper(
  template: BeatTemplate,
  bpm: number,
  secondsVisible: number
) {
  const activeBpm = bpm > 0 ? bpm : 60;
  const visibleMs = Math.max(1000, secondsVisible * 1000);
  const beatWidth = clamp((60_000 / activeBpm / visibleMs) * 100, 20, 36);
  const qrsCenter = clamp(44, 18, 88 - beatWidth);
  const anchorMs = getFiducial(
    template,
    "r",
    getFiducial(template, "qrsOn", template.durationMs * 0.4)
  );

  return {
    beatWidth,
    qrsCenter,
    xForMs(ms: number) {
      return clamp(
        qrsCenter + ((ms - anchorMs) / template.durationMs) * beatWidth,
        7,
        93
      );
    },
  };
}

function buildBasicAnnotations(
  template: BeatTemplate,
  bpm: number,
  secondsVisible: number,
  options?: { prolongedPr?: boolean; hideP?: boolean; hideT?: boolean }
) {
  const { beatWidth, qrsCenter, xForMs } = createPositionMapper(
    template,
    bpm,
    secondsVisible
  );
  const fiducials = template.fiducialsMs;
  const pPeak = fiducials.pPeak;
  const pOn = fiducials.pOn ?? (pPeak !== undefined ? pPeak - 90 : undefined);
  const qrsOn = getFiducial(template, "qrsOn", template.durationMs * 0.35);
  const qrsOff = getFiducial(template, "qrsOff", template.durationMs * 0.45);
  const tPeak = fiducials.tPeak;
  const markers: AnnotationMarker[] = [
    {
      id: "qrs",
      label: options?.prolongedPr ? "QRS" : "QRS",
      left: qrsCenter,
      top: 18,
      tone: "landmark",
    },
  ];
  const intervals: AnnotationInterval[] = [
    {
      id: "qrs-span",
      label: "QRS",
      start: xForMs(qrsOn),
      end: xForMs(qrsOff),
      top: 30,
      tone: "landmark",
    },
    {
      id: "rr",
      label: "RR interval",
      start: qrsCenter,
      end: clamp(qrsCenter + beatWidth, qrsCenter + 12, 92),
      top: 82,
      tone: "interval",
    },
  ];

  if (!options?.hideP && pPeak !== undefined) {
    markers.push({
      id: "p-wave",
      label: "P wave",
      left: xForMs(pPeak),
      top: 44,
      tone: "landmark",
    });

    if (pOn !== undefined) {
      intervals.push({
        id: "pr",
        label: options?.prolongedPr ? "Prolonged PR" : "PR interval",
        start: xForMs(pOn),
        end: xForMs(qrsOn),
        top: 70,
        tone: options?.prolongedPr ? "warning" : "interval",
      });
    }
  }

  if (!options?.hideT && tPeak !== undefined) {
    markers.push({
      id: "t-wave",
      label: "T wave",
      left: xForMs(tPeak),
      top: 44,
      tone: "landmark",
    });
  }

  return { markers, intervals };
}

function buildAnnotations({
  template,
  caseId,
  bpm,
  rhythm,
  secondsVisible,
}: Required<Pick<EcgAnnotationOverlayProps, "template" | "bpm" | "rhythm" | "secondsVisible">> &
  Pick<EcgAnnotationOverlayProps, "caseId">) {
  const normalizedCaseId = caseId?.toLowerCase() ?? "";
  const templateId = template.id.toLowerCase();
  const caseKey = normalizeCaseKey(caseId, template.id);
  const isAfCase = normalizedCaseId === "af" || templateId.includes("afib");
  const isAflCase = normalizedCaseId === "afl" || templateId.includes("afl");
  const isSvtCase = normalizedCaseId === "svt" || templateId.includes("svt");
  const isVtCase = normalizedCaseId === "vt" || templateId.startsWith("vt-");

  if (includesAny(caseKey, ["vf"])) {
    return {
      markers: [
        {
          id: "vf-chaos",
          label: "No organized QRS",
          left: 50,
          top: 28,
          tone: "warning" as const,
        },
      ],
      intervals: [],
    };
  }

  if (isAfCase) {
    return {
      markers: [
        {
          id: "no-clear-p",
          label: "No clear P wave",
          left: 29,
          top: 42,
          tone: "muted" as const,
        },
        {
          id: "qrs",
          label: "QRS",
          left: 46,
          top: 20,
          tone: "landmark" as const,
        },
      ],
      intervals: [
        {
          id: "irregular-rr",
          label: "Irregular RR",
          start: 43,
          end: 72,
          top: 80,
          tone: "warning" as const,
        },
      ],
    };
  }

  if (isAflCase) {
    return {
      markers: [
        {
          id: "flutter",
          label: "Flutter waves / F waves",
          left: 31,
          top: 44,
          tone: "warning" as const,
        },
        {
          id: "qrs",
          label: "QRS",
          left: 48,
          top: 19,
          tone: "landmark" as const,
        },
      ],
      intervals: [
        {
          id: "rr",
          label: "RR interval",
          start: 48,
          end: 74,
          top: 80,
          tone: "interval" as const,
        },
      ],
    };
  }

  if (includesAny(caseKey, ["mobitz2", "wenckebach"])) {
    const annotations = buildBasicAnnotations(template, bpm, secondsVisible, {
      prolongedPr: includesAny(caseKey, ["wenckebach"]),
      hideT: true,
    });

    annotations.markers.push({
      id: "dropped-qrs",
      label: "Dropped QRS",
      left: 73,
      top: 42,
      tone: "warning",
    });
    annotations.intervals.push({
      id: "dropped-qrs-span",
      label: "P without QRS",
      start: 67,
      end: 79,
      top: 58,
      tone: "warning",
    });

    return annotations;
  }

  if (includesAny(caseKey, ["avblock1"])) {
    return buildBasicAnnotations(template, bpm, secondsVisible, {
      prolongedPr: true,
    });
  }

  if (includesAny(caseKey, ["pvc", "tdp"]) || isVtCase) {
    const { beatWidth, qrsCenter } = createPositionMapper(
      template,
      bpm,
      secondsVisible
    );

    return {
      markers: [
        {
          id: "wide-qrs",
          label: "Wide QRS",
          left: qrsCenter,
          top: 22,
          tone: "warning" as const,
        },
      ],
      intervals: [
        {
          id: "wide-qrs-span",
          label: "wide complex",
          start: clamp(qrsCenter - beatWidth * 0.28, 10, 88),
          end: clamp(qrsCenter + beatWidth * 0.42, 12, 92),
          top: 38,
          tone: "warning" as const,
        },
        {
          id: "rr",
          label: "RR interval",
          start: qrsCenter,
          end: clamp(qrsCenter + beatWidth, qrsCenter + 12, 92),
          top: 82,
          tone: "interval" as const,
        },
      ],
    };
  }

  if (includesAny(caseKey, ["junctional"])) {
    return {
      markers: [
        {
          id: "hidden-p",
          label: "P wave not clearly visible",
          left: 33,
          top: 43,
          tone: "muted" as const,
        },
        {
          id: "qrs",
          label: "QRS",
          left: 46,
          top: 20,
          tone: "landmark" as const,
        },
      ],
      intervals: [
        {
          id: "rr",
          label: "RR interval",
          start: 46,
          end: 70,
          top: 82,
          tone: "interval" as const,
        },
      ],
    };
  }

  if (isSvtCase) {
    const annotations = buildBasicAnnotations(template, bpm, secondsVisible, {
      hideP: true,
    });
    annotations.markers.push({
      id: "buried-p",
      label: "P wave hard to see",
      left: 35,
      top: 44,
      tone: "muted",
    });
    return annotations;
  }

  return buildBasicAnnotations(template, bpm, secondsVisible, {
    prolongedPr: rhythm === "regular" && includesAny(caseKey, ["avblock"]),
  });
}

function markerStyle(marker: AnnotationMarker): CSSProperties {
  return {
    left: `${marker.left}%`,
    top: `${marker.top}%`,
  };
}

function intervalStyle(interval: AnnotationInterval): CSSProperties {
  const start = Math.min(interval.start, interval.end);
  const end = Math.max(interval.start, interval.end);

  return {
    left: `${start}%`,
    top: `${interval.top}%`,
    width: `${Math.max(5, end - start)}%`,
  };
}

function AnnotationLabel({ marker }: { marker: AnnotationMarker }) {
  const tone = marker.tone ?? "landmark";

  return (
    <div
      className={cn(
        "absolute max-w-28 -translate-x-1/2 rounded-md border px-2 py-1 text-center text-[10px] font-semibold leading-tight shadow-sm backdrop-blur-sm sm:text-[11px]",
        LABEL_CLASS[tone]
      )}
      style={markerStyle(marker)}
    >
      {marker.label}
    </div>
  );
}

function AnnotationIntervalLine({ interval }: { interval: AnnotationInterval }) {
  const tone = interval.tone ?? "interval";

  return (
    <div
      className={cn("absolute h-4 border-t", LINE_CLASS[tone])}
      style={intervalStyle(interval)}
    >
      <span className="absolute -top-1 left-0 h-2 border-l border-current" />
      <span className="absolute -top-1 right-0 h-2 border-l border-current" />
      <span
        className={cn(
          "absolute left-1/2 top-1.5 max-w-32 -translate-x-1/2 rounded-md border bg-white/75 px-1.5 py-0.5 text-center text-[9px] font-semibold leading-tight shadow-sm backdrop-blur-sm sm:text-[10px]",
          LINE_CLASS[tone]
        )}
      >
        {interval.label}
      </span>
    </div>
  );
}

export function EcgAnnotationOverlay({
  template,
  caseId,
  bpm = 60,
  rhythm = "regular",
  secondsVisible = 6,
  className,
}: EcgAnnotationOverlayProps) {
  const { markers, intervals } = buildAnnotations({
    template,
    caseId,
    bpm,
    rhythm,
    secondsVisible,
  });

  if (markers.length === 0 && intervals.length === 0) return null;

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-10 select-none overflow-hidden",
        className
      )}
    >
      <div className="absolute left-2 top-2 rounded-md border border-emerald-500/25 bg-white/75 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-950 shadow-sm backdrop-blur-sm sm:left-3 sm:top-3 sm:text-[11px]">
        Annotations / 波形ラベル
      </div>

      {intervals.map((interval) => (
        <AnnotationIntervalLine key={interval.id} interval={interval} />
      ))}
      {markers.map((marker) => (
        <AnnotationLabel key={marker.id} marker={marker} />
      ))}

      <div className="absolute bottom-2 right-2 max-w-[13rem] rounded-md border border-slate-500/20 bg-white/75 px-2 py-1 text-[9px] leading-snug text-slate-700 shadow-sm backdrop-blur-sm sm:text-[10px]">
        Educational guide only
      </div>
    </div>
  );
}
