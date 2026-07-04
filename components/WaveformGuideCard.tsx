import { Activity, BookOpen, ShieldCheck } from "lucide-react";

import type { ECGCase } from "@/data/ecgCases";
import { cn } from "@/lib/utils";

type WaveformGuideCardProps = {
  ecgCase: ECGCase;
};

type GuideKind =
  | "sinus"
  | "avblock1"
  | "wenckebach"
  | "mobitz2"
  | "af"
  | "afl"
  | "svt"
  | "vt"
  | "unsupported";

type GuideContent = {
  kind: GuideKind;
  title: string;
  description: string;
};

const SAFETY_NOTE =
  "この図は心電図学習用の模式図です。実際の波形、正確な計測、診断、治療判断、患者モニタリング、医療機器出力の代替ではありません。";

function getGuideContent(ecgCase: ECGCase): GuideContent {
  switch (ecgCase.id) {
    case "nsr":
    case "sinus-brady":
    case "sinus-tachy":
      return {
        kind: "sinus",
        title: "Normal Sinus Rhythm Guide",
        description:
          "洞調律では、P波、QRS、T波が順番に現れます。PR intervalはP波開始からQRS開始まで、RR intervalはR波から次のR波までの間隔です。",
      };
    case "avblock1":
      return {
        kind: "avblock1",
        title: "First-degree AV Block Guide",
        description:
          "1度房室ブロックでは、P波は毎回QRSにつながりますが、PR intervalが延長します。",
      };
    case "wenckebach":
      return {
        kind: "wenckebach",
        title: "Mobitz I / Wenckebach Guide",
        description:
          "PR intervalが徐々に延長し、最後にQRSが脱落する流れを模式的に示しています。",
      };
    case "mobitz2":
      return {
        kind: "mobitz2",
        title: "Mobitz II Guide",
        description:
          "PR intervalは一定のまま、突然QRSが脱落する流れを模式的に示しています。",
      };
    case "af":
      return {
        kind: "af",
        title: "Atrial Fibrillation Guide",
        description:
          "明瞭なP波がなく、RR intervalが不規則になりやすい点を模式的に示しています。",
      };
    case "afl":
      return {
        kind: "afl",
        title: "Atrial Flutter Guide",
        description:
          "鋸歯状のF波が見られ、伝導比によってQRSが出現する考え方を模式的に示しています。",
      };
    case "svt":
      return {
        kind: "svt",
        title: "SVT Guide",
        description:
          "SVTは、狭いQRSの頻拍として見えることが多いリズムとして学習できます。",
      };
    case "vt":
      return {
        kind: "vt",
        title: "VT Guide",
        description:
          "VTは、幅広いQRSの頻拍として見えることが多いリズムとして学習できます。",
      };
    default:
      return {
        kind: "unsupported",
        title: "Waveform Guide",
        description:
          "この症例の模式図は準備中です。現在は症例解説と実波形を見ながら学習してください。",
      };
  }
}

function DiagramLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "absolute rounded-md border border-border bg-background/90 px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-foreground shadow-sm",
        className
      )}
    >
      {children}
    </span>
  );
}

function RhythmStripFrame({
  children,
  labels,
}: {
  children: React.ReactNode;
  labels?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-[#fff8f8] shadow-inner">
      <svg
        viewBox="0 0 360 136"
        role="img"
        aria-label="Simplified ECG waveform guide"
        className="h-36 w-full"
      >
        <defs>
          <pattern id="guide-small-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f1c9c9" strokeWidth="0.5" />
          </pattern>
          <pattern id="guide-large-grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <rect width="50" height="50" fill="url(#guide-small-grid)" />
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#df9b9b" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="360" height="136" fill="url(#guide-large-grid)" />
        {children}
      </svg>
      {labels}
    </div>
  );
}

function AxisLine() {
  return (
    <path
      d="M 10 72 H 350"
      fill="none"
      stroke="#111827"
      strokeDasharray="3 5"
      strokeOpacity="0.25"
      strokeWidth="1"
    />
  );
}

function SinusDiagram({ prolongedPr = false }: { prolongedPr?: boolean }) {
  const qrsX = prolongedPr ? 178 : 126;
  const tStart = qrsX + 42;
  const secondQrsX = qrsX + 142;

  return (
    <RhythmStripFrame
      labels={
        <>
          <DiagramLabel className="left-[10%] top-[50%]">P wave</DiagramLabel>
          <DiagramLabel className="left-[35%] top-[12%]">QRS</DiagramLabel>
          <DiagramLabel className="left-[56%] top-[36%]">T wave</DiagramLabel>
          <DiagramLabel className="left-[17%] top-[78%]">
            {prolongedPr ? "prolonged PR interval" : "PR interval"}
          </DiagramLabel>
          <DiagramLabel className="left-[38%] top-[78%]">RR interval</DiagramLabel>
        </>
      }
    >
      <AxisLine />
      <path
        d={`M 10 72 H 32 C 42 72 44 60 54 60 C 64 60 66 72 78 72 H ${
          qrsX - 20
        } L ${qrsX - 10} 90 L ${qrsX} 28 L ${qrsX + 10} 88 L ${
          qrsX + 22
        } 72 H ${tStart} C ${tStart + 18} 72 ${tStart + 22} 48 ${
          tStart + 46
        } 48 C ${tStart + 70} 48 ${tStart + 74} 72 ${
          tStart + 96
        } 72 H ${secondQrsX - 20} L ${secondQrsX - 10} 90 L ${secondQrsX} 28 L ${
          secondQrsX + 10
        } 88 L ${secondQrsX + 22} 72 H 350`}
        fill="none"
        stroke="#111827"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <path
        d={`M 36 116 H ${qrsX - 14}`}
        fill="none"
        stroke={prolongedPr ? "#d97706" : "#0284c7"}
        strokeWidth="2"
      />
      <path
        d={`M ${qrsX} 122 H ${secondQrsX}`}
        fill="none"
        stroke="#0284c7"
        strokeWidth="2"
      />
    </RhythmStripFrame>
  );
}

function BlockDiagram({ kind }: { kind: "wenckebach" | "mobitz2" }) {
  const qrsXs = kind === "wenckebach" ? [82, 172, null] : [78, 168, null];
  const pXs = [36, 118, 204];

  return (
    <RhythmStripFrame
      labels={
        <>
          <DiagramLabel className="left-[7%] top-[48%]">P wave</DiagramLabel>
          <DiagramLabel className="left-[41%] top-[14%]">QRS</DiagramLabel>
          <DiagramLabel className="left-[62%] top-[46%]">Dropped QRS</DiagramLabel>
          <DiagramLabel className="left-[12%] top-[78%]">
            {kind === "wenckebach" ? "PR lengthens" : "PR stays similar"}
          </DiagramLabel>
        </>
      }
    >
      <AxisLine />
      <path
        d="M 10 72 H 24 C 30 72 32 62 38 62 C 44 62 46 72 52 72 H 350"
        fill="none"
        stroke="#111827"
        strokeLinecap="round"
        strokeWidth="2.5"
      />
      {pXs.slice(1).map((x) => (
        <path
          key={x}
          d={`M ${x - 12} 72 C ${x - 6} 72 ${x - 4} 62 ${x + 2} 62 C ${
            x + 8
          } 62 ${x + 10} 72 ${x + 16} 72`}
          fill="none"
          stroke="#111827"
          strokeLinecap="round"
          strokeWidth="2.5"
        />
      ))}
      {qrsXs.map((x, index) =>
        x === null ? (
          <g key={`drop-${index}`}>
            <rect
              x="220"
              y="42"
              width="44"
              height="42"
              rx="6"
              fill="#f59e0b"
              fillOpacity="0.12"
              stroke="#d97706"
              strokeDasharray="4 4"
            />
            <path d="M 226 63 H 258" stroke="#d97706" strokeWidth="2" />
          </g>
        ) : (
          <path
            key={x}
            d={`M ${x - 10} 90 L ${x} 30 L ${x + 10} 88 L ${x + 22} 72`}
            fill="none"
            stroke="#111827"
            strokeLinejoin="round"
            strokeWidth="3"
          />
        )
      )}
      <path
        d={kind === "wenckebach" ? "M 38 116 H 72 M 122 122 H 160" : "M 38 116 H 70 M 122 116 H 156"}
        fill="none"
        stroke="#0284c7"
        strokeWidth="2"
      />
    </RhythmStripFrame>
  );
}

function AtrialDiagram({ kind }: { kind: "af" | "afl" }) {
  const waveform =
    kind === "af"
      ? "M 10 72 C 24 60 38 85 52 68 C 66 52 80 86 96 70 C 118 50 138 88 156 72 C 172 62 190 80 208 70 C 230 50 252 88 274 70 C 294 58 318 82 350 70"
      : "M 10 72 L 28 52 L 46 84 L 64 52 L 82 84 L 100 52 L 118 84 L 136 52 L 154 84 L 172 52 L 190 84 L 208 52 L 226 84 L 244 52 L 262 84 L 280 52 L 298 84 L 316 52 L 334 84 L 350 70";

  return (
    <RhythmStripFrame
      labels={
        kind === "af" ? (
          <>
            <DiagramLabel className="left-[8%] top-[28%]">No clear P wave</DiagramLabel>
            <DiagramLabel className="left-[36%] top-[78%]">Irregular RR</DiagramLabel>
          </>
        ) : (
          <>
            <DiagramLabel className="left-[11%] top-[18%]">F waves</DiagramLabel>
            <DiagramLabel className="left-[54%] top-[14%]">QRS by conduction ratio</DiagramLabel>
          </>
        )
      }
    >
      <AxisLine />
      <path
        d={waveform}
        fill="none"
        stroke="#111827"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={kind === "af" ? "2.5" : "2"}
      />
      {[86, 178, 302].map((x) => (
        <path
          key={x}
          d={`M ${x - 8} 90 L ${x} 30 L ${x + 8} 88 L ${x + 18} 72`}
          fill="none"
          stroke="#111827"
          strokeLinejoin="round"
          strokeWidth="3"
          opacity={kind === "af" ? 0.8 : 1}
        />
      ))}
      {kind === "af" ? (
        <path d="M 86 118 H 178 M 178 124 H 302" fill="none" stroke="#d97706" strokeWidth="2" />
      ) : null}
    </RhythmStripFrame>
  );
}

function TachyDiagram({ kind }: { kind: "svt" | "vt" }) {
  const complexes =
    kind === "svt"
      ? [54, 114, 174, 234, 294]
      : [54, 132, 210, 288];

  return (
    <RhythmStripFrame
      labels={
        <>
          <DiagramLabel className="left-[8%] top-[14%]">
            {kind === "svt" ? "Narrow QRS tachycardia" : "Wide QRS tachycardia"}
          </DiagramLabel>
          <DiagramLabel className="left-[42%] top-[78%]">rapid rhythm</DiagramLabel>
        </>
      }
    >
      <AxisLine />
      <path d="M 10 72 H 350" fill="none" stroke="#111827" strokeWidth="2" />
      {complexes.map((x) =>
        kind === "svt" ? (
          <path
            key={x}
            d={`M ${x - 7} 90 L ${x} 28 L ${x + 7} 88 L ${x + 16} 72`}
            fill="none"
            stroke="#111827"
            strokeLinejoin="round"
            strokeWidth="3"
          />
        ) : (
          <path
            key={x}
            d={`M ${x - 26} 78 C ${x - 12} 40 ${x + 4} 34 ${
              x + 20
            } 72 C ${x + 36} 108 ${x + 52} 102 ${x + 62} 72`}
            fill="none"
            stroke="#111827"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
        )
      )}
    </RhythmStripFrame>
  );
}

function UnsupportedGuide() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/25 p-4 text-sm leading-relaxed text-muted-foreground">
      この症例の模式図は準備中です。現在は症例解説と実波形を見ながら学習してください。
    </div>
  );
}

function GuideDiagram({ kind }: { kind: GuideKind }) {
  if (kind === "sinus") return <SinusDiagram />;
  if (kind === "avblock1") return <SinusDiagram prolongedPr />;
  if (kind === "wenckebach" || kind === "mobitz2") {
    return <BlockDiagram kind={kind} />;
  }
  if (kind === "af" || kind === "afl") return <AtrialDiagram kind={kind} />;
  if (kind === "svt" || kind === "vt") return <TachyDiagram kind={kind} />;

  return <UnsupportedGuide />;
}

export function WaveformGuideCard({ ecgCase }: WaveformGuideCardProps) {
  const guide = getGuideContent(ecgCase);

  return (
    <section className="space-y-3 rounded-xl border border-border bg-background/70 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
            <Activity className="size-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground/80">
              <BookOpen className="size-3.5 text-muted-foreground" aria-hidden />
              Waveform Guide / 波形ガイド
            </div>
            <h4 className="mt-1 text-sm font-semibold text-foreground">
              {guide.title}
            </h4>
          </div>
        </div>
      </div>

      <GuideDiagram kind={guide.kind} />

      <p className="text-sm leading-relaxed text-muted-foreground">
        {guide.description}
      </p>

      <div className="flex gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <p>{SAFETY_NOTE}</p>
      </div>
    </section>
  );
}
