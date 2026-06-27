export type ECGCaseTemplateId =
  | "nsr-lead2-v0"
  | "vt-lead2-v0"
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
