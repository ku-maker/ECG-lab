import nsrTemplateJson from "@/src/data/ecg/templates/nsr-lead2.json";
import vtTemplateJson from "@/src/data/ecg/templates/vt-lead2.json";
import pvcTemplateJson from "@/src/data/ecg/templates/pvc-lead2.json";
import pacTemplateJson from "@/src/data/ecg/templates/pac-lead2.json";
import mobitz2TemplateJson from "@/src/data/ecg/templates/mobitz2-lead2.json";
import svtTemplateJson from "@/src/data/ecg/templates/svt-lead2.json";
import stemiTemplateJson from "@/src/data/ecg/templates/stemi-lead2.json";
import tdpTemplateJson from "@/src/data/ecg/templates/tdp-lead2.json";
import aflTemplateJson from "@/src/data/ecg/templates/afl-lead2.json";
import avblock3TemplateJson from "@/src/data/ecg/templates/avblock3-lead2.json";
import afTemplateJson from "@/src/data/ecg/templates/afib-lead2.json";
import vfTemplateJson from "@/src/data/ecg/templates/vf-lead2.json";

export type FiducialsMs = {
  pOn?: number;
  pPeak?: number;
  pOff?: number;
  qrsOn?: number;
  q?: number;
  r?: number;
  s?: number;
  qrsOff?: number;
  jPoint?: number;
  tPeak?: number;
  tEnd?: number;
};

export type BeatTemplate = {
  id: string;
  label: string;
  lead: string;
  sampleRateHz: number;
  durationMs: number;
  unit: "mV";
  fiducialsMs: FiducialsMs;
  samplesMv: number[];
};

export type EcgTemplateId =
  | "nsr"
  | "vt"
  | "pvc"
  | "pac"
  | "mobitz2"
  | "svt"
  | "stemi"
  | "tdp"
  | "afl"
  | "avblock3"
  | "af"
  | "vf";
export type EcgTemplateJsonId =
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

export type EcgTemplateOption = {
  id: EcgTemplateId;
  label: string;
  abbr: string;
  severity: "normal" | "warning" | "critical";
  description: string;
  defaultBpm: number;
  template: BeatTemplate;
};

export const ECG_TEMPLATE_OPTIONS: EcgTemplateOption[] = [
  {
    id: "nsr",
    label: "正常洞調律",
    abbr: "NSR",
    severity: "normal",
    description:
      "規則正しいP波に続いて幅の狭いQRS波が出現する、基準となる正常波形です。",
    defaultBpm: 72,
    template: nsrTemplateJson as BeatTemplate,
  },
  {
    id: "af",
    label: "心房細動",
    abbr: "AF",
    severity: "warning",
    description:
      "P波が消失し、基線に細かなf波が出現します。QRS幅は保たれますが、RR間隔が不規則に変動します。",
    defaultBpm: 110,
    template: afTemplateJson as BeatTemplate,
  },
  {
    id: "pvc",
    label: "心室性期外収縮",
    abbr: "PVC",
    severity: "warning",
    description:
      "正常洞調律の途中に、予定より早い幅広い心室性期外収縮と代償性間欠期が割り込みます。",
    defaultBpm: 70,
    template: pvcTemplateJson as BeatTemplate,
  },
  {
    id: "pac",
    label: "心房性期外収縮",
    abbr: "PAC",
    severity: "warning",
    description:
      "正常洞調律の途中に、予定より早い狭いQRS波と短い非代償性間欠期が割り込みます。",
    defaultBpm: 75,
    template: pacTemplateJson as BeatTemplate,
  },
  {
    id: "mobitz2",
    label: "2度房室ブロック",
    abbr: "Mobitz II",
    severity: "warning",
    description:
      "規則正しいP波のあと、一定周期でQRS波が完全に脱落します。",
    defaultBpm: 60,
    template: mobitz2TemplateJson as BeatTemplate,
  },
  {
    id: "svt",
    label: "発作性上室頻拍",
    abbr: "SVT",
    severity: "warning",
    description:
      "狭いQRS波が180bpmで高速に連続し、P波はT波に埋もれて識別困難になります。",
    defaultBpm: 180,
    template: svtTemplateJson as BeatTemplate,
  },
  {
    id: "stemi",
    label: "ST上昇型心筋梗塞",
    abbr: "STEMI",
    severity: "critical",
    description:
      "QRS直後のST部分がドーム状に上昇し、T波へ連続する急性冠閉塞の典型波形です。",
    defaultBpm: 65,
    template: stemiTemplateJson as BeatTemplate,
  },
  {
    id: "tdp",
    label: "トルサード・ド・ポアンツ",
    abbr: "TdP",
    severity: "critical",
    description:
      "幅広い心室波形の振幅が周期的に増減し、基線を軸にねじれる多形性心室頻拍です。",
    defaultBpm: 200,
    template: tdpTemplateJson as BeatTemplate,
  },
  {
    id: "afl",
    label: "心房粗動",
    abbr: "AFL",
    severity: "warning",
    description:
      "連続したノコギリ状F波の上に、4:1伝導で狭いQRS波が重なります。",
    defaultBpm: 75,
    template: aflTemplateJson as BeatTemplate,
  },
  {
    id: "avblock3",
    label: "3度房室ブロック",
    abbr: "CAVB",
    severity: "critical",
    description:
      "P波と補充調律QRS波が完全に独立して出現する完全房室ブロックです。",
    defaultBpm: 35,
    template: avblock3TemplateJson as BeatTemplate,
  },
  {
    id: "vt",
    label: "心室頻拍",
    abbr: "VT",
    severity: "critical",
    description:
      "P波が目立たず、幅広いQRS様波形が速く連続する致死性不整脈です。深い陰性波を伴う非対称な波形として表示します。",
    defaultBpm: 160,
    template: vtTemplateJson as BeatTemplate,
  },
  {
    id: "vf",
    label: "心室細動",
    abbr: "VF",
    severity: "critical",
    description:
      "心室が完全に痙攣し、P波・QRS波・T波の構造が消失します。規則性のない大小の波形が連続する致死性不整脈です。",
    defaultBpm: 0,
    template: vfTemplateJson as BeatTemplate,
  },
];

export function findTemplateOption(id: EcgTemplateId): EcgTemplateOption {
  return ECG_TEMPLATE_OPTIONS.find((option) => option.id === id) ?? ECG_TEMPLATE_OPTIONS[0];
}

export function findTemplateOptionByTemplateId(
  templateId: EcgTemplateJsonId
): EcgTemplateOption {
  return (
    ECG_TEMPLATE_OPTIONS.find((option) => option.template.id === templateId) ??
    ECG_TEMPLATE_OPTIONS[0]
  );
}
