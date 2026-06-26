import type { ECGParameters } from "@/lib/ecg/types";

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
  /** この症例に対応する心電図パラメータ */
  params: ECGParameters;
}

export const ECG_CASES: ECGCase[] = [
  {
    id: "nsr",
    label: "正常洞調律",
    abbr: "NSR",
    severity: "normal",
    description:
      "すべての基準が正常なお手本となる波形です。規則正しいP波に続いて狭いQRS波が認められ、STは等電位線上にあります。洞結節からの正常な興奮伝導を示しています。",
    params: {
      global: {
        heartRate: 70,
        rhythmRegularity: 1,
      },
      pWave: {
        amplitude: 0.5,
        width: 0.4,
        morphology: 0,
      },
      qrsComplex: {
        width: 0.22, // 狭い（正常）
        morphology: 0,
      },
      stT_Segment: {
        stElevation: 0, // ST正常
        tWaveAmplitude: 0.55,
      },
    },
  },
  {
    id: "vt",
    label: "心室頻拍",
    abbr: "VT",
    severity: "critical",
    description:
      "心室由来の幅の広いQRS波が連続する致死性不整脈。直ちに血行動態の評価と除細動の準備が必要です。P波は確認できず、QRS幅は著明に延長しています。",
    params: {
      global: {
        heartRate: 160,
        rhythmRegularity: 0.92,
      },
      pWave: {
        amplitude: 0.05, // P波ほぼ消失
        width: 0.4,
        morphology: 0,
      },
      qrsComplex: {
        width: 0.85, // QRSワイド
        morphology: 1,
      },
      stT_Segment: {
        stElevation: 0, // ST正常
        tWaveAmplitude: 0.3,
      },
    },
  },
  {
    id: "stemi",
    label: "急性心筋梗塞",
    abbr: "STEMI",
    severity: "critical",
    description:
      "心筋の壊死が始まっている緊急事態。著明なST上昇が特徴です。冠動脈の完全閉塞を示しており、直ちにPCI（経皮的冠動脈インターベンション）による再灌流療法が必要です。",
    params: {
      global: {
        heartRate: 80,
        rhythmRegularity: 1,
      },
      pWave: {
        amplitude: 0.5,
        width: 0.4,
        morphology: 0,
      },
      qrsComplex: {
        width: 0.25, // QRS正常
        morphology: 0,
      },
      stT_Segment: {
        stElevation: 0.72, // ST著明上昇
        tWaveAmplitude: 0.8,
      },
    },
  },
];

/** IDから症例を検索するヘルパー */
export function findCaseById(id: string): ECGCase | undefined {
  return ECG_CASES.find((c) => c.id === id);
}
