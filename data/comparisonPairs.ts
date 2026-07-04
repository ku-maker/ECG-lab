export type ComparisonPair = {
  id: string;
  label: string;
  leftCaseId: string;
  rightCaseId: string;
  focus: string;
  keyDifferences: string[];
  caution?: string;
};

export const COMPARISON_PAIRS: ComparisonPair[] = [
  {
    id: "nsr-vs-sinus-brady",
    label: "NSR vs Sinus Bradycardia",
    leftCaseId: "nsr",
    rightCaseId: "sinus-brady",
    focus:
      "同じ洞調律構造を保ったまま、RR間隔と心拍数がどう変わるかを比較します。",
    keyDifferences: [
      "どちらも各QRS波の前にP波があり、P-QRS-Tの順序は保たれます。",
      "洞性徐脈ではRR間隔が長く、心拍数が低く表示されます。",
      "形だけでなく、規則性と心拍数を合わせて観察します。",
    ],
    caution:
      "この比較は学習用であり、実際の徐脈評価の代替ではありません。",
  },
  {
    id: "sinus-tachy-vs-svt",
    label: "Sinus Tachycardia vs SVT",
    leftCaseId: "sinus-tachy",
    rightCaseId: "svt",
    focus:
      "速い狭QRSリズムで、P波の見え方やリズムの印象を比較します。",
    keyDifferences: [
      "洞性頻脈ではP波が各QRSの前に見えることがあります。",
      "SVTではP波がQRSやT波に重なる、または見えにくいことがあります。",
      "Lead IIだけで断定せず、実臨床では発症様式、症状、12誘導心電図と合わせて評価します。",
    ],
    caution:
      "この比較は学習用であり、実際の鑑別診断の代替ではありません。",
  },
  {
    id: "avblock1-vs-wenckebach",
    label: "First-degree AV Block vs Mobitz I",
    leftCaseId: "avblock1",
    rightCaseId: "wenckebach",
    focus:
      "PR間隔が延長するだけなのか、徐々に延長してQRSが脱落するのかを比較します。",
    keyDifferences: [
      "1度房室ブロックではPR間隔が延長しますが、すべてのP波にQRS波が続きます。",
      "Mobitz IではPR間隔が拍ごとに徐々に延長し、周期の最後にQRSが脱落します。",
      "P波を追いながら、P波とQRS波の関係を拍ごとに比べます。",
    ],
    caution:
      "PR間隔や脱落の評価は教育用に単純化されています。",
  },
  {
    id: "wenckebach-vs-mobitz2",
    label: "Mobitz I vs Mobitz II",
    leftCaseId: "wenckebach",
    rightCaseId: "mobitz2",
    focus:
      "2度房室ブロック同士で、PR間隔が徐々に変化するかどうかを比較します。",
    keyDifferences: [
      "Mobitz IではPR間隔が徐々に延長してからQRSが脱落します。",
      "Mobitz IIでは伝導された拍のPR間隔が大きく変わらず、QRSが突然脱落するように見えます。",
      "どちらも実臨床では症状、血行動態、12誘導心電図と合わせて扱います。",
    ],
    caution:
      "この比較は心電図学習用であり、実際の重症度判断や治療判断の代替ではありません。",
  },
  {
    id: "sinus-brady-vs-junctional",
    label: "Sinus Bradycardia vs Junctional Rhythm",
    leftCaseId: "sinus-brady",
    rightCaseId: "junctional",
    focus:
      "どちらも遅めの規則的リズムとして見えるため、P波とQRS波の関係を比較します。",
    keyDifferences: [
      "洞性徐脈ではP波が各QRS波の前に比較的はっきり見えます。",
      "接合部調律ではP波が見えにくい、QRS近傍に重なる、または逆行性に見えることがあります。",
      "徐脈の原因や臨床的意味はLead IIだけで断定しません。",
    ],
    caution:
      "この比較は学習用であり、実際のリズム診断の代替ではありません。",
  },
  {
    id: "af-vs-afl",
    label: "AF vs AFL",
    leftCaseId: "af",
    rightCaseId: "afl",
    focus:
      "基線の細かな揺れと鋸歯状F波、RR間隔の不規則性を比較します。",
    keyDifferences: [
      "AFでは明瞭なP波が見えにくく、RR間隔が不規則に変動します。",
      "AFLでは規則的な鋸歯状F波が連続し、一定の伝導比でQRSが出現します。",
      "可変伝導のAFLはAFに似ることがあり、実臨床では12誘導心電図や患者情報と合わせて評価します。",
    ],
    caution:
      "この比較は教育用であり、実際の診断や治療判断の代替ではありません。",
  },
  {
    id: "svt-vs-vt",
    label: "SVT vs VT",
    leftCaseId: "svt",
    rightCaseId: "vt",
    focus:
      "速い頻拍同士で、QRS幅と波形の変形の違いを比較します。",
    keyDifferences: [
      "SVTは狭いQRSが高速に連続し、P波は見えにくいことがあります。",
      "VTはwide QRS tachycardiaとして表示され、波形全体が大きく変形します。",
      "wide QRS tachycardiaの鑑別をLead IIだけで断定しないでください。",
    ],
    caution:
      "この比較は学習用であり、実際の救急対応や治療判断の代替ではありません。",
  },
];

export function findComparisonPairById(
  id: string
): ComparisonPair | undefined {
  return COMPARISON_PAIRS.find((pair) => pair.id === id);
}
