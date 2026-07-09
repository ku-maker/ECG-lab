import { BookOpen, Eye, ShieldCheck } from "lucide-react";

import type { ECGCase } from "@/data/ecgCases";
import { cn } from "@/lib/utils";

type ObservationGuideCardProps = {
  ecgCase: ECGCase;
};

type GuideItemTone = "key" | "check" | "pitfall";

type ObservationGuideItem = {
  label: string;
  text: string;
  tone: GuideItemTone;
};

type ObservationGuideContent = {
  title: string;
  items: ObservationGuideItem[];
};

const SAFETY_NOTE =
  "学習用ガイドです。診断・治療判断・正確な計測の代替ではありません。";

const itemToneClass: Record<GuideItemTone, string> = {
  key: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  check: "border-border bg-muted/25 text-muted-foreground",
  pitfall:
    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

const badgeToneClass: Record<GuideItemTone, string> = {
  key: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  check: "bg-background/70 text-foreground/80",
  pitfall: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

function item(
  label: string,
  text: string,
  tone: GuideItemTone = "check"
): ObservationGuideItem {
  return { label, text, tone };
}

function getObservationGuide(ecgCase: ECGCase): ObservationGuideContent {
  switch (ecgCase.id) {
    case "nsr":
      return {
        title: "Normal sinus rhythm",
        items: [
          item("RR", "規則的", "key"),
          item("P", "各QRSの前に毎回ある", "key"),
          item("QRS", "狭い"),
          item("Rate", "60〜100 bpm"),
          item("Pitfall", "頻拍・徐脈ではRate違いを見る", "pitfall"),
        ],
      };
    case "sinus-brady":
      return {
        title: "Sinus bradycardia",
        items: [
          item("RR", "規則的で長い", "key"),
          item("P", "各QRSの前に毎回ある", "key"),
          item("QRS", "狭い"),
          item("Rate", "60 bpm未満"),
          item("Pitfall", "接合部調律ではP波が見えにくい", "pitfall"),
        ],
      };
    case "sinus-tachy":
      return {
        title: "Sinus tachycardia",
        items: [
          item("RR", "規則的で短い", "key"),
          item("P", "見える範囲でQRS前にある", "key"),
          item("QRS", "狭い"),
          item("Rate", "100 bpm以上"),
          item("Pitfall", "SVTとの鑑別はLead IIだけで断定しない", "pitfall"),
        ],
      };
    case "avblock1":
      return {
        title: "First-degree AV block",
        items: [
          item("P-QRS", "すべてのP波がQRSにつながる", "key"),
          item("PR", "延長", "key"),
          item("Drop", "QRS脱落なし"),
          item("RR", "おおむね規則的"),
          item("Pitfall", "Mobitz Iでは周期的に脱落する", "pitfall"),
        ],
      };
    case "wenckebach":
      return {
        title: "Mobitz I / Wenckebach",
        items: [
          item("P", "規則的"),
          item("PR", "徐々に延長", "key"),
          item("Drop", "最後にQRS脱落", "key"),
          item("Reset", "脱落後に周期が戻る"),
          item("Pitfall", "Mobitz IIはPR一定のまま脱落", "pitfall"),
        ],
      };
    case "mobitz2":
      return {
        title: "Mobitz II",
        items: [
          item("P", "規則的"),
          item("PR", "一定に近い", "key"),
          item("Drop", "突然QRS脱落", "key"),
          item("QRS", "脱落前後のPR変化に注目"),
          item("Pitfall", "Mobitz Iのような徐々のPR延長は目立たない", "pitfall"),
        ],
      };
    case "af":
      return {
        title: "Atrial fibrillation",
        items: [
          item("RR", "不規則", "key"),
          item("P", "明瞭なP波なし", "key"),
          item("Baseline", "細かく揺れる"),
          item("QRS", "多くは狭い"),
          item("Pitfall", "AFLやPAC頻発と比較", "pitfall"),
        ],
      };
    case "afl":
      return {
        title: "Atrial flutter",
        items: [
          item("Baseline", "F波様の鋸歯状", "key"),
          item("RR", "伝導比で規則的", "key"),
          item("P", "明瞭な洞性P波ではない"),
          item("QRS", "多くは狭い"),
          item("Pitfall", "AFより規則性が目立つことがある", "pitfall"),
        ],
      };
    case "svt":
      return {
        title: "SVT-like narrow complex tachycardia",
        items: [
          item("RR", "規則的", "key"),
          item("Rate", "速い", "key"),
          item("QRS", "狭い", "key"),
          item("P", "見えにくいことがある"),
          item("Pitfall", "発症様式・12誘導も必要", "pitfall"),
        ],
      };
    case "vt":
      return {
        title: "VT-like wide complex tachycardia",
        items: [
          item("RR", "規則的な頻拍", "key"),
          item("QRS", "広い", "key"),
          item("Shape", "波形が大きく変形"),
          item("P", "QRSとの関係が分かりにくい"),
          item("Safety", "実臨床では緊急評価が必要", "pitfall"),
        ],
      };
    case "vf":
      return {
        title: "Ventricular fibrillation-like rhythm",
        items: [
          item("Rhythm", "無秩序", "key"),
          item("QRS", "整ったQRSなし", "key"),
          item("RR", "測定困難"),
          item("Baseline", "大きく不規則に揺れる"),
          item("Safety", "実臨床では緊急対応が必要", "pitfall"),
        ],
      };
    case "pvc":
      return {
        title: "PVC",
        items: [
          item("Timing", "予定より早い拍", "key"),
          item("QRS", "幅広く変形", "key"),
          item("P", "先行P波が目立たない"),
          item("Pause", "代償性休止に注目"),
          item("Pitfall", "PACはQRSが狭いことが多い", "pitfall"),
        ],
      };
    case "pac":
      return {
        title: "PAC",
        items: [
          item("Timing", "予定より早い拍", "key"),
          item("QRS", "多くは狭い", "key"),
          item("P", "形やタイミングが違う"),
          item("Pause", "軽い休止を伴うことがある"),
          item("Pitfall", "PVCではQRSが広く変形しやすい", "pitfall"),
        ],
      };
    case "junctional":
      return {
        title: "Junctional rhythm",
        items: [
          item("Rate", "徐脈傾向", "key"),
          item("QRS", "狭い", "key"),
          item("P", "見えにくい/逆行性/近接", "key"),
          item("RR", "規則的"),
          item("Pitfall", "洞性徐脈はQRS前にP波が見える", "pitfall"),
        ],
      };
    case "avblock3":
      return {
        title: "Complete AV block",
        items: [
          item("P", "P波は独立して規則的", "key"),
          item("QRS", "逃逸調律で遅い", "key"),
          item("AV", "PとQRSが無関係", "key"),
          item("RR", "遅く規則的なことが多い"),
          item("Pitfall", "2度AVBとの違いはAV解離", "pitfall"),
        ],
      };
    case "stemi":
      return {
        title: "STEMI-like ST elevation concept",
        items: [
          item("ST", "ST上昇の概念表示", "key"),
          item("QRS", "前後のST変化を見る"),
          item("Lead", "Lead IIだけで局在診断しない", "pitfall"),
          item("Compare", "12誘導と症状が必要", "pitfall"),
          item("Safety", "診断・治療判断の代替ではない", "pitfall"),
        ],
      };
    case "tdp":
      return {
        title: "Torsades de Pointes-like rhythm",
        items: [
          item("Rhythm", "多形性の速い波形", "key"),
          item("Shape", "振幅や軸が変化するように見える", "key"),
          item("QRS", "広く連続"),
          item("RR", "規則的に測りにくい"),
          item("Safety", "実臨床では緊急評価が必要", "pitfall"),
        ],
      };
    default:
      return {
        title: "Observation guide in progress",
        items: [
          item("Guide", "この症例の観察ポイントは準備中"),
          item("Study", "症例解説と実波形を見て学習"),
          item("Safety", "診断・治療判断の代替ではありません", "pitfall"),
        ],
      };
  }
}

export function ObservationGuideCard({ ecgCase }: ObservationGuideCardProps) {
  const guide = getObservationGuide(ecgCase);

  return (
    <section className="space-y-3 rounded-xl border border-border bg-background/70 p-2.5 shadow-sm md:p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
          <Eye className="size-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground/80">
            <BookOpen className="size-3.5 text-muted-foreground" aria-hidden />
            Observation Guide
          </div>
          <h4 className="mt-1 text-sm font-semibold text-foreground">
            {guide.title}
          </h4>
          <p className="mt-0.5 text-xs text-muted-foreground">観察ポイント</p>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {guide.items.map((guideItem) => (
          <div
            key={`${guideItem.label}-${guideItem.text}`}
            className={cn(
              "flex min-w-0 items-start gap-2 rounded-lg border px-2.5 py-2 text-sm leading-snug",
              itemToneClass[guideItem.tone]
            )}
          >
            <span
              className={cn(
                "mt-0.5 min-w-12 shrink-0 rounded-full px-2 py-0.5 text-center text-[11px] font-semibold leading-tight md:min-w-14",
                badgeToneClass[guideItem.tone]
              )}
            >
              {guideItem.label}
            </span>
            <span className="min-w-0 text-foreground/85">{guideItem.text}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 text-[11px] leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3 shrink-0" aria-hidden />
        <p>{SAFETY_NOTE}</p>
      </div>
    </section>
  );
}
