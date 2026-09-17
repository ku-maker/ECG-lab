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
    id: "nsr-vs-sinus-arrhythmia", label: "正常洞調律 ↔ 洞性不整脈", leftCaseId: "nsr", rightCaseId: "sinus-arrhythmia",
    focus: "P-QRS-Tの形を保ったまま、RR間隔が周期的に変わるかを比べます。",
    keyDifferences: ["どちらも各QRS波の前にP波があります。", "洞性不整脈ではRR間隔が徐々に短くなり、その後長くなります。", "心房細動のような不規則な変化とは異なります。"],
  },
  {
    id: "nsr-vs-sinus-brady",
    label: "正常洞調律 ↔ 洞性徐脈",
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
    label: "洞性頻脈 ↔ 発作性上室頻拍",
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
    id: "sinus-tachy-vs-atrial-tachy", label: "洞性頻脈 ↔ 心房頻拍", leftCaseId: "sinus-tachy", rightCaseId: "atrial-tachy",
    focus: "QRS波の前にあるP波の形を比べます。",
    keyDifferences: ["どちらも規則的な狭QRS頻拍です。", "洞性頻脈では洞性P波の形が保たれます。", "心房頻拍では洞性P波と異なる形のP波を認めます。"],
  },
  {
    id: "avblock1-vs-wenckebach",
    label: "1度房室ブロック ↔ Wenckebach型",
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
    label: "Wenckebach型 ↔ Mobitz II型",
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
    label: "洞性徐脈 ↔ 接合部調律",
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
    label: "心房細動 ↔ 心房粗動",
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
    label: "発作性上室頻拍 ↔ 心室頻拍",
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
  {
    id: "aivr-vs-vt", label: "促進性心室固有調律 ↔ 心室頻拍", leftCaseId: "aivr", rightCaseId: "vt",
    focus: "幅広いQRS波が続く速度を比べます。",
    keyDifferences: ["どちらも幅広い心室波形が連続します。", "AIVRの例は80回/分で比較的遅く進みます。", "VTの例は160回/分で速く進みます。"],
  },
  {
    id: "pvc-vs-pac",
    label: "心室性期外収縮 ↔ 心房性期外収縮",
    leftCaseId: "pvc",
    rightCaseId: "pac",
    focus: "予定より早く出る1拍の、形と幅を比べます。",
    keyDifferences: [
      "どちらの例も、いつもの拍より早く1拍が割り込みます。",
      "PVCの例はQRS波が幅広く変形し、PACの例は普段の拍に近い狭い形です。",
      "早い拍の前にP波があるかも見ます。PACのP波は前のT波に重なることがあります。",
    ],
  },
  {
    id: "pvc-vs-bigeminy", label: "単発PVC ↔ 心室性二段脈", leftCaseId: "pvc", rightCaseId: "pvc-bigeminy",
    focus: "PVCの形ではなく、現れる順序を比べます。",
    keyDifferences: ["どちらも早い幅広いQRS波が現れます。", "単発PVCでは通常拍が数拍続きます。", "二段脈では通常拍とPVCが1拍ずつ交互に続きます。"],
  },
  {
    id: "pac-vs-atrial-bigeminy", label: "単発PAC ↔ 心房性二段脈", leftCaseId: "pac", rightCaseId: "pac-bigeminy",
    focus: "早い狭QRS拍が現れる順序を比べます。",
    keyDifferences: ["どちらも早い拍のQRS波は通常拍に近い形です。", "単発PACでは通常拍が数拍続きます。", "心房性二段脈では通常拍とPACが交互に続きます。"],
  },
  {
    id: "af-vs-mat", label: "心房細動 ↔ 多源性心房頻拍", leftCaseId: "af", rightCaseId: "mat",
    focus: "不規則な頻拍で、識別できるP波があるかを比べます。",
    keyDifferences: ["どちらもRR間隔が不規則です。", "AFでは一定して識別できるP波がありません。", "MATでは形の異なるP波を3種類以上確認します。"],
  },
  {
    id: "escape-vs-aivr", label: "心室補充調律 ↔ AIVR", leftCaseId: "ventricular-escape", rightCaseId: "aivr",
    focus: "幅広い心室性リズムの速さを比べます。",
    keyDifferences: ["どちらも幅広いQRS波が規則的に続きます。", "心室補充調律の例は35回/分です。", "AIVRの例は80回/分です。"],
  },
  {
    id: "paced-vs-vt", label: "心室ペーシング ↔ 心室頻拍", leftCaseId: "ventricular-paced", rightCaseId: "vt",
    focus: "QRS波の直前の刺激スパイクと心拍数を比べます。",
    keyDifferences: ["どちらも幅広いQRS波として見えます。", "心室ペーシング例では各QRS波の直前に細いスパイクがあります。", "VT例は160回/分で速く、一定したスパイクがありません。"],
  },
  {
    id: "nsr-vs-stemi",
    label: "正常洞調律 ↔ ST上昇の例",
    leftCaseId: "nsr",
    rightCaseId: "stemi",
    focus: "QRS波のあとにあるST部分の高さを比べます。",
    keyDifferences: [
      "正常洞調律の例では、ST部分が基準の高さ付近にあります。",
      "ST上昇の例では、QRS波が終わったあとも基準より高い位置にあります。",
      "R波の山の高さと、ST部分の持ち上がりを分けて見ます。",
    ],
  },
  {
    id: "vt-vs-tdp",
    label: "心室頻拍 ↔ トルサード・ド・ポアンツ",
    leftCaseId: "vt",
    rightCaseId: "tdp",
    focus: "幅広い拍の形がそろっているか、変わり続けるかを比べます。",
    keyDifferences: [
      "VTの例では、似た形の幅広い拍が規則的に続きます。",
      "TdPの例では、波の高さと向きが変わり、ねじれるように見えます。",
      "実際のTdPの判断には、発作前のQT時間なども必要です。",
    ],
  },
  {
    id: "vt-vs-vf",
    label: "心室頻拍 ↔ 心室細動",
    leftCaseId: "vt",
    rightCaseId: "vf",
    focus: "繰り返すQRS波を見つけられるかを比べます。",
    keyDifferences: [
      "VTの例では、幅が広くても拍の形を1つずつ追えます。",
      "VFの例では、整ったQRS波がなく、大きさも間隔もそろいません。",
      "VTは脈の有無によって対応が異なり、VFは心停止のリズムです。",
    ],
  },
  {
    id: "mobitz2-vs-avblock3",
    label: "Mobitz II型 ↔ 3度房室ブロック",
    leftCaseId: "mobitz2",
    rightCaseId: "avblock3",
    focus: "P波とQRS波のつながりが、一部に残るかどうかを比べます。",
    keyDifferences: [
      "Mobitz II型では、一部のQRS波が抜けても、伝わった拍のPR間隔はほぼ一定です。",
      "3度ではP波とQRS波が別々の間隔で出て、一定の組み合わせがありません。",
      "P波のすぐあとにQRS波が来ても、偶然かもしれません。数拍続けて関係を見ます。",
    ],
  },
  {
    id: "nsr-vs-sinus-tachy",
    label: "正常洞調律 ↔ 洞性頻脈",
    leftCaseId: "nsr",
    rightCaseId: "sinus-tachy",
    focus: "P波とQRS波の並びを保ったまま、拍の間隔が短くなる様子を比べます。",
    keyDifferences: [
      "どちらもP波のあとにQRS波が続きます。",
      "洞性頻脈の例では、R波どうしの間隔が短くなっています。",
      "形だけでなく、拍の速さも合わせて見ます。",
    ],
  },
];

export function findComparisonPairById(
  id: string
): ComparisonPair | undefined {
  return COMPARISON_PAIRS.find((pair) => pair.id === id);
}

/** Only offer pairs that contain the currently studied case. */
export function findComparisonPairsForCase(caseId: string): ComparisonPair[] {
  return COMPARISON_PAIRS.filter((pair) => pair.leftCaseId === caseId || pair.rightCaseId === caseId);
}
