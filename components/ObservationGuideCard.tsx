import { BookOpen, Eye, ShieldCheck } from "lucide-react";

import type { ECGCase } from "@/data/ecgCases";

type ObservationGuideCardProps = {
  ecgCase: ECGCase;
};

type ObservationGuideContent = {
  title: string;
  intro: string;
  points: string[];
};

const SAFETY_NOTE =
  "このガイドは心電図学習用の観察ポイントです。正確な計測、診断、治療判断、患者モニタリング、医療機器出力の代替ではありません。";

function getSinusRatePoint(caseId: string): string {
  if (caseId === "sinus-brady") {
    return "心拍数が徐脈域にあり、NSRと比べてRR間隔が長いかを見ます。";
  }

  if (caseId === "sinus-tachy") {
    return "心拍数が頻脈域にあり、NSRと同じ洞調律構造のまま速くなっているかを見ます。";
  }

  return "心拍数が正常域に近く、RR間隔がおおむね一定かを見ます。";
}

function getObservationGuide(ecgCase: ECGCase): ObservationGuideContent {
  switch (ecgCase.id) {
    case "nsr":
    case "sinus-brady":
    case "sinus-tachy":
      return {
        title: "Normal sinus rhythm pattern",
        intro:
          "洞調律では、P波、QRS、T波の順序と、RR間隔の規則性を文章で確認します。",
        points: [
          "P波がQRSの前に毎回あるかを見ます。",
          "P波、QRS、T波が順番に並んで見えるかを見ます。",
          "RR間隔がおおむね一定かを見ます。",
          "QRS幅が狭いかを見ます。",
          getSinusRatePoint(ecgCase.id),
        ],
      };
    case "avblock1":
      return {
        title: "First-degree AV block pattern",
        intro:
          "1度房室ブロックでは、すべてのP波がQRSに伝導しているかと、PR intervalが長く見えるかを観察します。",
        points: [
          "P波がQRSの前に毎回あるかを見ます。",
          "QRSの脱落がないかを見ます。",
          "PR intervalが延長しているかを見ます。",
          "RR間隔がおおむね一定かを見ます。",
        ],
      };
    case "wenckebach":
      return {
        title: "Mobitz I / Wenckebach pattern",
        intro:
          "Wenckebach型では、PR intervalが徐々に延長し、その後にQRSが脱落する流れを観察します。",
        points: [
          "P波は規則的に出ているかを見ます。",
          "PR intervalが徐々に延長する流れがあるかを見ます。",
          "最後にQRSが脱落しているかを見ます。",
          "脱落後に周期がリセットするように見えるかを見ます。",
        ],
      };
    case "mobitz2":
      return {
        title: "Mobitz II pattern",
        intro:
          "Mobitz IIでは、PR intervalが一定に近いまま、突然QRSが脱落する点を観察します。",
        points: [
          "P波は規則的に出ているかを見ます。",
          "PR intervalが一定に近いまま保たれているかを見ます。",
          "突然QRSが脱落していないかを見ます。",
          "Mobitz Iのような段階的PR延長が目立たないかを見ます。",
        ],
      };
    case "af":
      return {
        title: "Atrial fibrillation pattern",
        intro:
          "AFでは、RR間隔の不規則性と、明瞭なP波が見えにくいことを合わせて観察します。",
        points: [
          "RR間隔が不規則かを見ます。",
          "明瞭なP波が見えにくいかを見ます。",
          "基線が細かく揺れて見えるかを見ます。",
          "QRS幅は基本的に狭いかを見ます。",
        ],
      };
    case "afl":
      return {
        title: "Atrial flutter pattern",
        intro:
          "AFLでは、基線の鋸歯状の揺れと、QRSの出現リズムをAFと比較しながら観察します。",
        points: [
          "基線に鋸歯状のF波様の揺れがあるかを見ます。",
          "QRSが一定の伝導比で出ているように見えるかを見ます。",
          "AFと比べてRR間隔が規則的に見えるかを見ます。",
        ],
      };
    case "svt":
      return {
        title: "SVT-like narrow complex tachycardia pattern",
        intro:
          "SVTでは、規則的な頻拍と狭いQRSを観察します。ただしLead IIだけで洞性頻脈やVTとの区別を断定しません。",
        points: [
          "規則的な頻拍かを見ます。",
          "QRS幅が狭いかを見ます。",
          "P波が見えにくい、またはQRS/T波に隠れていないかを見ます。",
          "洞性頻脈との違いをLead IIだけで断定しないことを意識します。",
        ],
      };
    case "vt":
      return {
        title: "VT-like wide complex tachycardia pattern",
        intro:
          "VTでは、幅広く変形したQRS様波形が速く規則的に続くかを観察します。",
        points: [
          "規則的な頻拍かを見ます。",
          "QRS幅が広く見えるかを見ます。",
          "通常の狭QRS頻拍と比べて波形が大きく変形していないかを見ます。",
          "実臨床では症状、バイタル、12誘導、医療者評価と合わせて判断します。",
        ],
      };
    case "vf":
      return {
        title: "Ventricular fibrillation-like chaotic rhythm pattern",
        intro:
          "VFでは、整ったP-QRS-T構造や規則的なRR間隔が見えるかではなく、無秩序な波形かを観察します。",
        points: [
          "整ったQRSが見えないかを見ます。",
          "波形が無秩序に揺れているかを見ます。",
          "規則的なRR間隔が確認できないかを見ます。",
        ],
      };
    case "pvc":
      return {
        title: "PVC pattern",
        intro:
          "PVCでは、基本リズムの途中に予定より早く出る幅広い異常拍があるかを観察します。",
        points: [
          "予定より早く出る異常拍があるかを見ます。",
          "その拍のQRSが幅広く変形していないかを見ます。",
          "代償性休止のような間があるかを見ます。",
        ],
      };
    case "pac":
      return {
        title: "PAC pattern",
        intro:
          "PACでは、予定より早く出る拍があるかと、そのQRS幅が基本的に狭いかを観察します。",
        points: [
          "予定より早く出る拍があるかを見ます。",
          "早い拍のQRS幅は基本的に狭いかを見ます。",
          "P波の形やタイミングが通常と少し違って見えるかを見ます。",
        ],
      };
    case "junctional":
      return {
        title: "Junctional rhythm pattern",
        intro:
          "接合部調律では、徐脈傾向と、洞性P波がQRS前に明瞭に見えにくいことを観察します。",
        points: [
          "徐脈傾向かを見ます。",
          "QRS幅は狭いかを見ます。",
          "明瞭な洞性P波がQRS前に見えにくいかを見ます。",
          "P波がQRSの近く、後ろ、または隠れているように見えるかを見ます。",
        ],
      };
    case "avblock3":
      return {
        title: "Complete AV block pattern",
        intro:
          "完全房室ブロックでは、P波とQRSが互いに独立したリズムで動いているように見えるかを観察します。",
        points: [
          "P波とQRSがそれぞれ別々のリズムで動いているように見えるかを見ます。",
          "P-P間隔とR-R間隔がそれぞれ規則的かを見ます。",
          "P波とQRSの関係が一定でないかを見ます。",
          "心室レートが遅いかを見ます。",
        ],
      };
    case "stemi":
      return {
        title: "ST-elevation learning pattern",
        intro:
          "このシミュレーターでは、ST変化をLead II学習用に単純化して示しています。実臨床の判断には12誘導と臨床情報が必要です。",
        points: [
          "QRS後のST部分が基線より高く見えるかを見ます。",
          "ST部分がT波へなだらかにつながるように見えるかを見ます。",
          "Lead IIだけで心筋梗塞の診断や部位を断定しないことを意識します。",
        ],
      };
    case "tdp":
      return {
        title: "Torsades de Pointes-like pattern",
        intro:
          "TdPでは、幅広い頻拍様波形の振幅や向きが周期的に変化するかを観察します。",
        points: [
          "幅広い頻拍様の波形が続いているかを見ます。",
          "波形の振幅が大きくなったり小さくなったりして見えるかを見ます。",
          "整ったP-QRS-T構造が追いにくいかを見ます。",
          "実臨床では症状、バイタル、12誘導、医療者評価と合わせて判断します。",
        ],
      };
    default:
      return {
        title: "Observation Guide",
        intro:
          "この症例の観察ポイントガイドは準備中です。症例解説と実波形を見ながら学習してください。",
        points: [
          "リズムが規則的かを見ます。",
          "P波の見え方を見ます。",
          "QRS幅が狭いか広いかを見ます。",
          "実臨床ではLead IIだけで断定しないことを意識します。",
        ],
      };
  }
}

export function ObservationGuideCard({ ecgCase }: ObservationGuideCardProps) {
  const guide = getObservationGuide(ecgCase);

  return (
    <section className="space-y-3 rounded-xl border border-border bg-background/70 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
          <Eye className="size-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground/80">
            <BookOpen className="size-3.5 text-muted-foreground" aria-hidden />
            Observation Guide / 観察ポイント
          </div>
          <h4 className="mt-1 text-sm font-semibold text-foreground">
            {guide.title}
          </h4>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {guide.intro}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground/75">
          見るポイント
        </div>
        <ul className="space-y-1.5 text-sm leading-relaxed text-muted-foreground">
          {guide.points.map((point) => (
            <li key={point} className="flex gap-2">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-current opacity-60" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <p>{SAFETY_NOTE}</p>
      </div>
    </section>
  );
}
