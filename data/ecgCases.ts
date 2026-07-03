export type ECGCaseTemplateId =
  | "nsr-lead2-v0"
  | "vt-lead2-v0"
  | "pvc-lead2-v0"
  | "pac-lead2-v0"
  | "mobitz2-lead2-v0"
  | "svt-lead2-v0"
  | "stemi-lead2-v0"
  | "tdp-lead2-v0"
  | "afl-lead2-v0"
  | "avblock3-lead2-v0"
  | "afib-lead2-v0"
  | "vf-lead2-v0";

export type ECGCaseRhythm = "regular" | "irregular" | "chaotic";

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
      "すべての基準が正常なお手本となる波形です。規則正しいP波に続いて狭いQRS波が認められ、STは等電位線上にあります。洞結節からの正常な興奮伝導を示しています。",
    templateId: "nsr-lead2-v0",
    initialBpm: 60,
    rhythm: "regular",
  },
  {
    id: "af",
    label: "心房細動",
    abbr: "AF",
    severity: "warning",
    description:
      "P波が消失し、基線に細かな震え（f波）が認められます。QRS波は比較的狭い一方で、RR間隔が不規則に変動する絶対性不整脈を示します。",
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
      "基本は正常洞調律（NSR）ですが、心室由来の異常な電気信号により、予定より早いタイミングで幅の広い歪んだQRS波（PVC）が突発的に出現します。出現直後の代償性間欠期（長めのポーズ）も再現しています。",
    templateId: "pvc-lead2-v0",
    initialBpm: 70,
    rhythm: "regular",
  },
  {
    id: "pac",
    label: "心房性期外収縮",
    abbr: "PAC",
    severity: "warning",
    description:
      "基本は正常洞調律（NSR）ですが、心房由来の異常信号により、予定より早いタイミングでQRS波が出現します。PVCとは異なり、QRS波の幅は狭く（正常と同じ形状）、直後のポーズ（非代償性間欠期）はPVCよりわずかに短くなります。",
    templateId: "pac-lead2-v0",
    initialBpm: 75,
    rhythm: "regular",
  },
  {
    id: "mobitz2",
    label: "2度房室ブロック",
    abbr: "Mobitz II",
    severity: "warning",
    description:
      "房室結導系の障害により、規則正しいP波の後に、QRS波が突如として完全に脱落（スキップ）する不整脈です。3拍または4拍に1回の頻度で、心拍が1回分完全に飛びます（フラットライン）。",
    templateId: "mobitz2-lead2-v0",
    initialBpm: 60,
    rhythm: "regular",
  },
  {
    id: "svt",
    label: "発作性上室頻拍",
    abbr: "SVT",
    severity: "warning",
    description:
      "心房または房室結節の異常な回路により、突発的に頻脈（BPM 150〜220）が発生します。VTと異なりQRS波の幅は狭く（正常）、P波はT波に重なって識別困難になります。",
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
      "冠動脈の完全閉塞により心筋が壊死し始めている状態です。QRS波の直後のST部分がドーム状に高く持ち上がる『ST上昇』が特徴的で、一刻も早い再灌流療法が必要です。",
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
      "波形の振幅が周期的に増減し、基線を軸にねじれるように変化する多形性心室頻拍です。連続する幅広いQRS波が大きくなったり小さくなったりしながら極性を変えます。",
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
      "基線が平坦ではなく、規則正しい連続したノコギリ状のF波（Flutter wave）で満たされます。4:1伝導として、F波4回ごとに狭いQRS波が出現します。",
    templateId: "afl-lead2-v0",
    initialBpm: 75,
    rhythm: "regular",
  },
  {
    id: "avblock3",
    label: "3度房室ブロック",
    abbr: "CAVB",
    severity: "critical",
    description:
      "心房（P波）と心室（QRS波）の電気的連携が完全に断絶し、それぞれが全く別の独立したリズムで打つ状態です。P波と補充調律のQRS波が無関係に出現します。",
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
      "心室由来の幅の広いQRS波が連続する致死性不整脈。直ちに血行動態の評価と除細動の準備が必要です。P波は確認できず、QRS幅は著明に延長しています。",
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
      "心室の電気活動が完全に破綻し、心室が痙攣している状態です。QRS波は消失し、規則性のない大小の波形が連続します。直ちに除細動が必要な致死性不整脈です。",
    templateId: "vf-lead2-v0",
    initialBpm: 0,
    rhythm: "chaotic",
  },
];

/** IDから症例を検索するヘルパー */
export function findCaseById(id: string): ECGCase | undefined {
  return ECG_CASES.find((c) => c.id === id);
}
