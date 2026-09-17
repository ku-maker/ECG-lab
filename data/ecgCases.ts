export type ECGCaseTemplateId =
  | "nsr-lead2-v0"
  | "sinus-brady-lead2-v0"
  | "sinus-tachy-lead2-v0"
  | "sinus-arrhythmia-lead2-v0"
  | "atrial-tachy-lead2-v0"
  | "vt-lead2-v0"
  | "pvc-lead2-v0"
  | "pvc-bigeminy-lead2-v0"
  | "aivr-lead2-v0"
  | "ventricular-escape-lead2-v0"
  | "ventricular-paced-lead2-v0"
  | "pac-lead2-v0"
  | "pac-bigeminy-lead2-v0"
  | "mat-lead2-v0"
  | "avblock1-lead2-v0"
  | "mobitz2-lead2-v0"
  | "wenckebach-lead2-v0"
  | "svt-lead2-v0"
  | "stemi-lead2-v0"
  | "tdp-lead2-v0"
  | "afl-lead2-v0"
  | "junctional-lead2-v0"
  | "avblock3-lead2-v0"
  | "afib-lead2-v0"
  | "vf-lead2-v0";

export type ECGCaseRhythm = "regular" | "irregular" | "bigeminy" | "chaotic";

export interface ECGCase {
  /** 症例ID */
  id: string;
  /** 疾患名（日本語） */
  label: string;
  /** 英語略称 */
  abbr: string;
  /** 重症度カラー */
  severity: "normal" | "warning" | "critical";
  /** 解説文 */
  description: string;
  /** 波形を順に観察する3ステップ */
  learningPoints: string[];
  /** 似た波形との比較ポイント */
  recognitionTips: string[];
  /** 混同しやすいポイント */
  commonPitfalls: string[];
  /** 教育用の臨床的注意 */
  clinicalNote: string;
  /** 新しいテンプレートエンジンに渡す波形テンプレートID */
  templateId: ECGCaseTemplateId;
  /** 症例選択時の初期心拍数 */
  initialBpm: number;
  /** RR間隔の扱い */
  rhythm?: ECGCaseRhythm;
}

export const ECG_CASES: ECGCase[] = [
  {
    id: "nsr",
    label: "正常洞調律",
    abbr: "NSR",
    severity: "normal",
    description:
      "心臓のいつもの発信源である洞結節から、順番どおりに電気が伝わるリズムです。まずは、この波形をほかの症例と比べる基準にしましょう。",
    learningPoints: [
      "大きな山（R波）の間隔を見ます。ほぼ同じ間隔で並んでいます。",
      "各QRS波の前を見ます。小さなP波が1つずつあります。",
      "1拍を追います。P波 → 幅の狭いQRS波 → T波の順に並びます。",
    ],
    recognitionTips: [
      "洞性徐脈・洞性頻脈も、基本の並び方は同じです。主に違うのは拍の速さです。",
      "この例では、QRS波のあとからT波までのST部分が、基準の高さ付近にあります。",
    ],
    commonPitfalls: [
      "洞調律であることと、心臓に病気がないことは同じではありません。",
    ],
    clinicalNote:
      "症状がある場合は、リズムが整っていても別の評価が必要です。この表示は学習用です。",
    templateId: "nsr-lead2-v0",
    initialBpm: 60,
    rhythm: "regular",
  },
  {
    id: "sinus-brady",
    label: "洞性徐脈",
    abbr: "Sinus Brady",
    severity: "warning",
    description:
      "電気の伝わる順番は正常洞調律と同じで、拍の間隔が長くなったリズムです。成人では、洞調律で心拍数が毎分60回未満のときを指します。",
    learningPoints: [
      "R波と次のR波の間を見ます。正常洞調律の例より広く空いています。",
      "各QRS波の前に、同じ形のP波が1つずつあるか確認します。",
      "P波のあとにQRS波が毎回続き、途中で抜けていないことを確認します。",
    ],
    recognitionTips: [
      "接合部調律も遅いリズムですが、QRS波の前にいつものP波を見つけにくくなります。",
      "房室ブロックでは、拍の速さだけでなく、P波とQRS波のつながり方が変わります。",
    ],
    commonPitfalls: [
      "遅いだけで危険とは限りません。睡眠中や運動習慣のある人でも見られます。",
    ],
    clinicalNote:
      "めまい・失神などの症状や、服用している薬も判断の手がかりです。この表示は学習用です。",
    templateId: "sinus-brady-lead2-v0",
    initialBpm: 45,
    rhythm: "regular",
  },
  {
    id: "sinus-tachy",
    label: "洞性頻脈",
    abbr: "Sinus Tachy",
    severity: "warning",
    description:
      "電気の伝わる順番は正常洞調律と同じで、拍の間隔が短くなったリズムです。成人では、洞調律で心拍数が毎分100回を超えるときを指します。",
    learningPoints: [
      "R波の間隔を見ます。短い間隔で、ほぼ規則的に並んでいます。",
      "速さだけで判断せず、各QRS波の前にP波を探します。",
      "この例では、P波 → 幅の狭いQRS波という順番が保たれています。",
    ],
    recognitionTips: [
      "発作性上室頻拍（SVT）の例では、P波をQRS波やT波から分けて見つけにくくなります。",
      "実際の見分けでは、徐々に速くなったか、突然始まったかも手がかりになります。",
    ],
    commonPitfalls: [
      "心拍数の数字だけでは、洞性頻脈とほかの頻拍を区別できません。",
    ],
    clinicalNote:
      "運動・発熱・痛み・脱水など、速くなった理由を考えることが大切です。この表示は学習用です。",
    templateId: "sinus-tachy-lead2-v0",
    initialBpm: 120,
    rhythm: "regular",
  },
  {
    id: "sinus-arrhythmia",
    label: "洞性不整脈",
    abbr: "Sinus arrhythmia",
    severity: "normal",
    description: "洞結節から始まる正常な順序を保ちながら、呼吸などに伴ってRR間隔が周期的に変わるリズムです。",
    learningPoints: [
      "R波を数拍追い、RR間隔が徐々に短くなり、その後長くなる変化を見ます。",
      "間隔が変わっても、各QRS波の前に同じ形のP波があるか確認します。",
      "P波からQRS波までの関係と、幅の狭いQRS波が保たれることを確認します。",
    ],
    recognitionTips: ["心房細動ではRR間隔に繰り返しがなく、一定したP波を確認できません。", "正常洞調律との違いは、P-QRS-Tの形ではなくRR間隔の周期的な変化です。"],
    commonPitfalls: ["RR間隔が不揃いというだけで心房細動と判断せず、P波と変化の規則性を確認します。"],
    clinicalNote: "呼吸性洞性不整脈は若年者などで見られます。症状や背景を含む評価は別に必要です。",
    templateId: "sinus-arrhythmia-lead2-v0",
    initialBpm: 70,
    rhythm: "irregular",
  },
  {
    id: "atrial-tachy",
    label: "心房頻拍",
    abbr: "AT",
    severity: "warning",
    description: "洞結節以外の心房から規則的に速い刺激が出る頻拍です。この例ではQRS波の前に、洞性P波と形の違うP波があります。",
    learningPoints: ["RR間隔が短く、規則的に並ぶことを確認します。", "各QRS波の前にあるP波を探し、洞性頻脈のP波と向き・形を比べます。", "P波のあとに幅の狭いQRS波が1対1で続くことを確認します。"],
    recognitionTips: ["洞性頻脈では洞性P波の形が保たれます。", "SVTではP波をQRS波やT波から分けにくいことがあります。"],
    commonPitfalls: ["速くてQRS幅が狭いことだけでは、頻拍の起源を決められません。"],
    clinicalNote: "実際には12誘導心電図、発症様式、心房波の軸などを合わせて評価します。",
    templateId: "atrial-tachy-lead2-v0",
    initialBpm: 140,
    rhythm: "regular",
  },
  {
    id: "af",
    label: "心房細動",
    abbr: "AF",
    severity: "warning",
    description:
      "心房の電気活動が乱れ、心室へ届くタイミングもばらばらになるリズムです。「拍の間隔が不規則」「同じ形のP波がない」の2点を組み合わせて見ます。",
    learningPoints: [
      "R波を数拍続けて見ます。間隔が長くなったり短くなったりし、一定の繰り返しがありません。",
      "各QRS波の前を見ます。毎回そろった形のP波を見つけられません。",
      "QRS波の間を見ます。この例では、小さく不規則な揺れ（f波）が見えます。",
    ],
    recognitionTips: [
      "心房粗動（AFL）では、心房の波がノコギリの歯のように規則的に並びます。",
      "期外収縮では早い拍が割り込みますが、心房細動では間隔のばらつきが続きます。",
    ],
    commonPitfalls: [
      "細かな揺れは体動のノイズでも出ます。揺れだけで決めず、P波と拍の間隔も確認します。",
    ],
    clinicalNote:
      "心房細動では、脈の速さや症状に加え、脳梗塞のリスクも評価します。この表示は学習用です。",
    templateId: "afib-lead2-v0",
    initialBpm: 110,
    rhythm: "irregular",
  },
  {
    id: "pvc",
    label: "心室性期外収縮",
    abbr: "PVC",
    severity: "warning",
    description:
      "いつもの拍より先に、心室から電気が出てしまうリズムです。規則的な波形の途中に、早くて幅の広い1拍が割り込みます。",
    learningPoints: [
      "普段のR波の間隔から、次の拍が来る位置を予想します。それより早く出る拍を探します。",
      "早く出た拍の横幅と形を比べます。この例では、QRS波が幅広く変形しています。",
      "そのあとの間隔を見ます。次の通常の拍まで、少し長い間が空きます。",
    ],
    recognitionTips: [
      "心房性期外収縮（PAC）の例も早く出ますが、QRS波は普段の拍に近い狭い形です。",
      "心室頻拍（VT）との比較では、幅広い拍が単発で出るか、続けて出るかを見ます。",
    ],
    commonPitfalls: [
      "PVCのあとに必ず長い間が空くわけではありません。幅・形・タイミングを合わせて見ます。",
    ],
    clinicalNote:
      "実際には、出る頻度や症状、もともとの心臓の病気を含めて評価します。この表示は学習用です。",
    templateId: "pvc-lead2-v0",
    initialBpm: 70,
    rhythm: "regular",
  },
  {
    id: "pvc-bigeminy",
    label: "心室性二段脈",
    abbr: "Ventricular bigeminy",
    severity: "warning",
    description: "通常の洞性拍と心室性期外収縮が、1拍ずつ交互に繰り返すリズムです。",
    learningPoints: [
      "幅の狭い通常拍と、予定より早い幅広いQRS波が交互に並ぶか見ます。",
      "幅広い拍の直前に、一定したP波がないことを確認します。",
      "幅広い拍のあとに休止があり、同じ組み合わせが繰り返すか追います。",
    ],
    recognitionTips: ["単発のPVCでは通常拍が数拍続きます。二段脈では通常拍とPVCが交互です。", "上室性二段脈では早い拍のQRSが通常拍に近い形になることがあります。"],
    commonPitfalls: ["波形が二種類あるだけで決めず、出現順序・QRS幅・直前のP波を確認します。"],
    clinicalNote: "実際にはPVCの頻度、症状、基礎心疾患などを合わせて評価します。この表示は学習用です。",
    templateId: "pvc-bigeminy-lead2-v0",
    initialBpm: 70,
    rhythm: "bigeminy",
  },
  {
    id: "aivr",
    label: "促進性心室固有調律",
    abbr: "AIVR",
    severity: "warning",
    description: "心室から出る幅広い拍が、心室補充調律より速く、心室頻拍より遅い速度で続くリズムです。",
    learningPoints: ["幅の広いQRS波が3拍以上続くことを確認します。", "R波の間隔を見て、この例では毎分80回前後で規則的に続くことを確認します。", "P波がQRS波と一定の関係を持たない可能性があるため、両者を別々に追います。"],
    recognitionTips: ["VTは一般に100回/分を超える速い幅広QRS頻拍として現れます。", "心室補充調律は通常20〜40回/分程度で、より遅いリズムです。"],
    commonPitfalls: ["速度だけでVTと断定せず、QRS幅、連続性、患者の状態を確認します。"],
    clinicalNote: "再灌流時などに見られることがあります。実際の評価は臨床状況と12誘導心電図が必要です。",
    templateId: "aivr-lead2-v0",
    initialBpm: 80,
    rhythm: "regular",
  },
  {
    id: "pac",
    label: "心房性期外収縮",
    abbr: "PAC",
    severity: "warning",
    description:
      "いつもの発信源より先に、心房の別の場所から電気が出てしまうリズムです。予定より早く1拍が入り、この例ではQRS波の形は普段の拍に似ています。",
    learningPoints: [
      "普段の拍の間隔を見て、それより早く出る拍を探します。",
      "早い拍のQRS波を比べます。この例では、幅が狭く、普段の拍に近い形です。",
      "その直前にP波を探します。早く出たP波は、前のT波に重なって見えにくいことがあります。",
    ],
    recognitionTips: [
      "心室性期外収縮（PVC）の例では、早い拍のQRS波が幅広く変形しています。",
      "P波の形や位置も比べると、早い拍が心房から始まっていることを考えやすくなります。",
    ],
    commonPitfalls: [
      "PACでもQRS波が広くなる場合や、QRS波まで伝わらない場合があります。幅だけでは決められません。",
    ],
    clinicalNote:
      "実際には、動悸などの症状や頻度、患者背景を含めて評価します。この表示は学習用です。",
    templateId: "pac-lead2-v0",
    initialBpm: 75,
    rhythm: "regular",
  },
  {
    id: "pac-bigeminy", label: "心房性二段脈", abbr: "Atrial bigeminy", severity: "warning",
    description: "通常の洞性拍と心房性期外収縮が、1拍ずつ交互に現れるリズムです。",
    learningPoints: ["狭いQRS波が、長い間隔と短い間隔を交互に作るか見ます。", "早く出る拍の直前を見て、前のT波に重なる変形したP波を探します。", "早い拍のQRS波が通常拍に近い狭い形で、同じ組み合わせを繰り返すか確認します。"],
    recognitionTips: ["心室性二段脈では、交互に出る早い拍のQRS波が幅広く変形します。", "単発PACでは通常拍が数拍続き、1拍ずつの交互配列にはなりません。"],
    commonPitfalls: ["規則的に見えても、RR間隔を1つずつ測ると長短が交互です。"],
    clinicalNote: "実際には12誘導心電図でP波の形、QRS幅、期外収縮の頻度を確認します。",
    templateId: "pac-bigeminy-lead2-v0", initialBpm: 75, rhythm: "bigeminy",
  },
  {
    id: "mat", label: "多源性心房頻拍", abbr: "MAT", severity: "warning",
    description: "心房の複数の場所から刺激が出る、不規則な狭QRS頻拍です。この例では3種類以上のP波を表現しています。",
    learningPoints: ["R波を数拍追い、RR間隔が不規則で毎分100回を超えることを確認します。", "各QRS波の前を見て、P波の向きや高さが少なくとも3種類あるか比べます。", "P波からQRS波までの間隔も一定でないことを確認します。"],
    recognitionTips: ["心房細動では、一定して識別できるP波がありません。", "洞性頻脈ではP波の形とPR間隔が拍ごとにほぼ一定です。"],
    commonPitfalls: ["基線の揺れだけで判断せず、形の異なるP波を実際に数えます。"],
    clinicalNote: "慢性肺疾患などを背景に見られることがあります。実際の診断には12誘導心電図が必要です。",
    templateId: "mat-lead2-v0", initialBpm: 115, rhythm: "irregular",
  },
  {
    id: "ventricular-escape", label: "心室補充調律", abbr: "Ventricular escape", severity: "critical",
    description: "上位の刺激が心室へ届かないとき、心室から遅い補充拍が続くリズムです。",
    learningPoints: ["幅の広いQRS波が規則的に続くことを確認します。", "R波の間隔を測り、この例では毎分35回前後と遅いことを確認します。", "QRS波の前に一定して続くP波がないことを確認します。"],
    recognitionTips: ["AIVRも幅広いQRS波が続きますが、この例より速いリズムです。", "接合部補充調律は一般にQRS幅が狭く、心室補充調律より速い傾向があります。"],
    commonPitfalls: ["幅広いQRS波だけを見てVTと判断せず、心拍数も確認します。"],
    clinicalNote: "実際には原因と循環状態を速やかに評価します。この表示は学習用です。",
    templateId: "ventricular-escape-lead2-v0", initialBpm: 35, rhythm: "regular",
  },
  {
    id: "ventricular-paced", label: "心室ペーシング調律", abbr: "V-paced", severity: "warning",
    description: "ペースメーカー刺激の直後に、幅の広いQRS波が続く教育用の心室ペーシング例です。",
    learningPoints: ["各QRS波の直前にある、細く鋭いペーシングスパイクを探します。", "スパイクの直後に幅の広いQRS波が毎回続くか確認します。", "R波の間隔が設定された速度で規則的に並ぶか追います。"],
    recognitionTips: ["VTでは通常、各QRS波の直前に一定したペーシングスパイクはありません。", "心房ペーシングや両室ペーシングでは、スパイクの位置や波形が異なります。"],
    commonPitfalls: ["スパイクは細く、表示条件によって見えにくいことがあります。"],
    clinicalNote: "実際には12誘導心電図とデバイス情報で、捕捉・感知・作動様式を評価します。",
    templateId: "ventricular-paced-lead2-v0", initialBpm: 70, rhythm: "regular",
  },
  {
    id: "avblock1",
    label: "1度房室ブロック",
    abbr: "1AVB",
    severity: "warning",
    description:
      "心房から心室へ電気が伝わるまでに、いつもより時間がかかる状態です。「遅れても、すべてのP波にQRS波が続く」がポイントです。",
    learningPoints: [
      "P波の始まりと、そのあとのQRS波の始まりを探します。",
      "その間の時間（PR間隔）を見ます。成人では200 ms（0.20秒）を超えるのが目安です。",
      "数拍を追います。PR間隔は長いままですが、QRS波は毎回続きます。",
    ],
    recognitionTips: [
      "2度房室ブロックでは、一部のP波のあとにQRS波が続きません。1度ではすべて続きます。",
      "洞性徐脈との比較では、拍全体の間隔と、P波からQRS波までの時間を分けて見ます。",
    ],
    commonPitfalls: [
      "PR間隔は、P波の頂点からR波の頂点までではなく、それぞれの波の始まりから測ります。",
    ],
    clinicalNote:
      "薬や心臓の状態なども合わせて評価します。数値の目安は成人向けで、この表示は学習用です。",
    templateId: "avblock1-lead2-v0",
    initialBpm: 60,
    rhythm: "regular",
  },
  {
    id: "mobitz2",
    label: "Mobitz II型2度房室ブロック",
    abbr: "Mobitz II",
    severity: "warning",
    description:
      "心房からの電気が、ときどき心室へ届かなくなる状態です。P波は出続けますが、そのあとに来るはずのQRS波が突然抜けます。",
    learningPoints: [
      "小さなP波を追います。QRS波がないところでも、P波は一定の間隔で出ています。",
      "QRS波が続いている拍どうしで、P波の始まりからQRS波の始まりまでを比べます。ほぼ一定です。",
      "P波のあとにQRS波が来ない箇所を探します。これがQRS波の脱落です。",
    ],
    recognitionTips: [
      "Wenckebach型（Mobitz I）では、PR間隔が少しずつ延びてからQRS波が抜けます。",
      "Mobitz IIでは、伝わった拍のPR間隔がほぼ一定のまま、QRS波が抜けます。",
    ],
    commonPitfalls: [
      "QRS波が抜けても、P波は残ります。「心電図全体が平らになる」と覚えないようにしましょう。",
    ],
    clinicalNote:
      "さらに伝わりにくいブロックへ進むことがあり、実際には速やかな医療評価が必要です。この表示は学習用です。",
    templateId: "mobitz2-lead2-v0",
    initialBpm: 60,
    rhythm: "regular",
  },
  {
    id: "wenckebach",
    label: "Wenckebach型2度房室ブロック",
    abbr: "Mobitz I",
    severity: "warning",
    description:
      "心房から心室へ電気が届くまでの時間が、拍ごとに少しずつ長くなる状態です。やがて1回届かなくなり、その後は短い待ち時間に戻るパターンを繰り返します。",
    learningPoints: [
      "P波を追います。心房の電気は、ほぼ一定の間隔で出ています。",
      "P波の始まりからQRS波の始まりまで（PR間隔）を比べます。拍ごとに長くなります。",
      "QRS波が1回抜けたあとを見ます。次に伝わる拍では、PR間隔が短く戻ります。",
    ],
    recognitionTips: [
      "Mobitz IIは「PR間隔が一定のまま抜ける」、この型は「だんだん延びてから抜ける」が比較の軸です。",
      "1度房室ブロックでは、PR間隔が長くてもQRS波は毎回続きます。",
    ],
    commonPitfalls: [
      "抜けた1拍だけでは区別できません。その前後を含めて、数拍続けて観察します。",
    ],
    clinicalNote:
      "実際の重要度は、症状や心臓の状態によって変わります。この表示は典型的な繰り返しを示す学習用です。",
    templateId: "wenckebach-lead2-v0",
    initialBpm: 60,
    rhythm: "regular",
  },
  {
    id: "svt",
    label: "発作性上室頻拍",
    abbr: "SVT",
    severity: "warning",
    description:
      "心室より上の部分で始まる、速いリズムの一例です。このプリセットでは、幅の狭いQRS波が短い間隔で規則的に続き、P波は見つけにくくなっています。",
    learningPoints: [
      "R波の間隔を見ます。短い間隔で、ほぼ一定に並んでいます。",
      "QRS波の横幅を見ます。この例では、幅の狭い拍が続きます。",
      "QRS波の前後を見ます。P波をほかの波から分けて見つけにくいことを確認します。",
    ],
    recognitionTips: [
      "洞性頻脈の例では、各QRS波の前にP波を追いやすくなっています。",
      "心室頻拍（VT）の例と並べると、QRS波の幅の違いが分かります。",
    ],
    commonPitfalls: [
      "上室性の頻拍でもQRS波が広くなる場合があります。幅だけで発生場所を断定できません。",
    ],
    clinicalNote:
      "実際には、突然始まったか、症状や血圧はどうかも確認します。この表示は学習用です。",
    templateId: "svt-lead2-v0",
    initialBpm: 180,
    rhythm: "regular",
  },
  {
    id: "stemi",
    label: "ST上昇型心筋梗塞",
    abbr: "STEMI",
    severity: "critical",
    description:
      "心筋梗塞で見られることのある「ST部分の持ち上がり」を学ぶ例です。拍の速さより、QRS波のあとが基準の高さに戻っているかに注目します。",
    learningPoints: [
      "T波のあとから次のP波までの、平らな部分を基準の高さとして見ます。",
      "QRS波の終わり（J点）からT波へ続く、ST部分を探します。",
      "正常洞調律の例と比べます。この例では、ST部分が基準より上に持ち上がっています。",
    ],
    recognitionTips: [
      "R波の頂点が高いことと、ST部分が上がることは別です。QRS波が終わったあとを見ます。",
      "心筋梗塞でもST上昇を伴わない場合があり、ST部分だけですべてを判断することはできません。",
    ],
    commonPitfalls: [
      "ST上昇は心膜炎などでも見られます。この1誘導の波形だけで心筋梗塞やその場所は確定できません。",
    ],
    clinicalNote:
      "実際に急な胸痛などがある場合は、速やかな救急評価が必要です。この表示はST上昇を強調した学習用です。",
    templateId: "stemi-lead2-v0",
    initialBpm: 65,
    rhythm: "regular",
  },
  {
    id: "tdp",
    label: "トルサード・ド・ポアンツ",
    abbr: "TdP",
    severity: "critical",
    description:
      "幅の広い速い波形が、基準の線のまわりをねじれるように変わる心室頻拍です。トルサード・ド・ポアンツは、QT時間の延長に伴う多形性心室頻拍を指します。",
    learningPoints: [
      "幅の広い拍が、速く続いていることを確認します。",
      "数拍まとめて見ます。波の高さが大きくなったり、小さくなったりします。",
      "波の向きも見ます。上向き・下向きの変化が、ねじれのように見えます。",
    ],
    recognitionTips: [
      "単形性の心室頻拍（VT）の例では、似た形の拍が続きます。この例では形や高さが変わります。",
      "心室細動（VF）の例に比べると、大きさが増減する繰り返しが見えます。",
    ],
    commonPitfalls: [
      "ねじれる見た目だけでは確定できません。発作前のQT時間なども確認します。",
    ],
    clinicalNote:
      "実際には緊急評価が必要で、薬や電解質の異常も調べます。この表示はねじれる形を示す学習用です。",
    templateId: "tdp-lead2-v0",
    initialBpm: 200,
    rhythm: "regular",
  },
  {
    id: "afl",
    label: "心房粗動",
    abbr: "AFL",
    severity: "warning",
    description:
      "心房で電気が速く規則的に巡り、ノコギリの歯のような波（F波）が続くリズムです。この例では、心房の電気4回につき1回が心室へ伝わります。",
    learningPoints: [
      "QRS波とQRS波の間を見ます。ノコギリの歯のような小さな波が続いています。",
      "その小さな波（F波）の間隔を見ます。ほぼ一定に並んでいます。",
      "QRS波の間隔を見ます。この4：1伝導の例では、QRS波も規則的に出ます。",
    ],
    recognitionTips: [
      "心房細動（AF）では、小さな波も拍の間隔も不規則です。粗動では心房の波の規則性を探します。",
      "F波はQRS波やT波と重なることがあるので、見える波の数だけに頼らないようにします。",
    ],
    commonPitfalls: [
      "心房から心室へ伝わる割合が変わると、粗動でもQRS波の間隔は不規則になります。",
    ],
    clinicalNote:
      "実際には、脈の速さや症状、脳梗塞のリスクも評価します。この表示は4：1伝導の学習用です。",
    templateId: "afl-lead2-v0",
    initialBpm: 75,
    rhythm: "regular",
  },
  {
    id: "junctional",
    label: "接合部調律",
    abbr: "Junctional",
    severity: "warning",
    description:
      "心房と心室のつなぎ目付近（房室接合部）が、電気の発信源になったリズムです。この例では、ゆっくりした狭いQRS波が続き、いつものP波は目立ちません。",
    learningPoints: [
      "R波の間隔を見ます。この例では、長い間隔でほぼ規則的に並んでいます。",
      "QRS波の形を見ます。幅は狭く、普段の拍に近い形です。",
      "QRS波の直前をよく見ます。いつもの上向きのP波に代わり、ごく小さな下向きの波が見えます。",
    ],
    recognitionTips: [
      "洞性徐脈の例では、各QRS波の前に同じ形の上向きのP波があります。",
      "実際の接合部調律では、P波がQRS波に隠れたり、直後に出たりする場合もあります。",
    ],
    commonPitfalls: [
      "P波が小さいだけの洞調律もあります。P波が見えないことだけで決めないようにします。",
    ],
    clinicalNote:
      "実際には、症状や薬の影響、もとのリズムを含めて評価します。この表示は学習用です。",
    templateId: "junctional-lead2-v0",
    initialBpm: 45,
    rhythm: "regular",
  },
  {
    id: "avblock3",
    label: "3度房室ブロック",
    abbr: "CAVB",
    severity: "critical",
    description:
      "心房から心室へ電気が届かず、心房と心室が別々のリズムで動く状態です。心室は、別の場所から出る遅い電気で拍を保ちます。",
    learningPoints: [
      "P波だけを追います。ほぼ一定の間隔で出ています。",
      "次にQRS波だけを追います。P波より遅い、別の間隔で出ています。",
      "P波とQRS波を一緒に見ます。両者の距離が変わり、一定の組み合わせがありません。",
    ],
    recognitionTips: [
      "2度房室ブロックでは、心房の電気の一部は心室へ届きます。3度では、そのつながりがありません。",
      "洞性徐脈は遅くてもP波とQRS波が1対1で続きます。この例では別々に出ます。",
    ],
    commonPitfalls: [
      "たまたまP波の直後にQRS波が来ることがあります。1拍だけでなく、数拍続けて関係を見ます。",
    ],
    clinicalNote:
      "失神などにつながることがあり、実際には速やかな医療評価が必要です。この表示は学習用です。",
    templateId: "avblock3-lead2-v0",
    initialBpm: 35,
    rhythm: "regular",
  },
  {
    id: "vt",
    label: "心室頻拍",
    abbr: "VT",
    severity: "critical",
    description:
      "心室から出る電気が、速く続くリズムです。このプリセットは、幅の広い、似た形のQRS波が連続する「単形性心室頻拍」の例です。",
    learningPoints: [
      "拍の間隔を見ます。短い間隔で波形が続いています。",
      "QRS波の横幅を見ます。正常洞調律やSVTの例より幅広く見えます。",
      "数拍を比べます。この例では、似た形の幅広い波がほぼ規則的に続きます。",
    ],
    recognitionTips: [
      "発作性上室頻拍（SVT）の例も速く規則的ですが、QRS波は狭く見えます。",
      "トルサード・ド・ポアンツの例では、波の形や高さが次々に変わります。",
    ],
    commonPitfalls: [
      "幅の広い頻拍がすべてVTとは限りません。実際の区別には12誘導心電図などが必要です。",
    ],
    clinicalNote:
      "実際には緊急評価が必要です。脈があるVTと、脈のないVTでは対応が異なります。この表示は学習用です。",
    templateId: "vt-lead2-v0",
    initialBpm: 160,
    rhythm: "regular",
  },
  {
    id: "vf",
    label: "心室細動",
    abbr: "VF",
    severity: "critical",
    description:
      "心室の電気活動がばらばらになり、血液を送り出せなくなるリズムです。整ったQRS波がなく、大きさも間隔もそろわない波が続きます。",
    learningPoints: [
      "繰り返し現れるQRS波を探します。一定の形を持つ拍が見つかりません。",
      "波の大きさと間隔を見ます。どちらもばらばらで、まとまりがありません。",
      "P波 → QRS波 → T波の並びがなく、通常の心拍数として数えられないことを確認します。",
    ],
    recognitionTips: [
      "心室頻拍（VT）の例では、幅広くても繰り返す拍の形を追えます。VFではそれが崩れています。",
      "心房細動（AF）では間隔が不規則でもQRS波は見えます。VFは心室の活動自体が乱れます。",
    ],
    commonPitfalls: [
      "体動のノイズが似て見えることがあります。実際には患者の反応と機器の状態も確認します。",
    ],
    clinicalNote:
      "実際のVFは心停止のリズムで、直ちに救急対応が必要です。12誘導の記録を待つ状態ではありません。この表示は学習用です。",
    templateId: "vf-lead2-v0",
    initialBpm: 0,
    rhythm: "chaotic",
  },
];

/** IDから症例を検索するヘルパー */
export function findCaseById(id: string): ECGCase | undefined {
  return ECG_CASES.find((c) => c.id === id);
}
