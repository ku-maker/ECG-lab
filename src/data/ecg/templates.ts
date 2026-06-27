import nsrTemplateJson from "@/src/data/ecg/templates/nsr-lead2.json";
import vtTemplateJson from "@/src/data/ecg/templates/vt-lead2.json";
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

export type EcgTemplateId = "nsr" | "vt" | "af" | "vf";
export type EcgTemplateJsonId =
  | "nsr-lead2-v0"
  | "vt-lead2-v0"
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
