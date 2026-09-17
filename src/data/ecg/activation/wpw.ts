import type { NsrFiducials } from "./buildTimeline";
import type { VectorPoint } from "./segmentPoints";
import type { ActivationTimeline } from "./types";
import type { LeadId } from "../leads/leadAxes";

export type AccessoryPathwayLocation =
  | "left-free-wall"
  | "right-free-wall"
  | "posteroseptal"
  | "midseptal"
  | "anteroseptal";

export type WpwVariantDefinition = {
  id: string;
  label: string;
  location: AccessoryPathwayLocation;
  atrialChamber: "left" | "right";
  ventricularChamber: "left" | "right" | "septal";
  anatomy: string;
  localizationHint: string;
  atrialInsertionLabel: string;
  ventricularInsertionLabel: string;
  atrialInsertion: VectorPoint;
  ventricularInsertion: VectorPoint;
  paths: {
    atrialApproach: VectorPoint[];
    avBridge: VectorPoint[];
    ventricularSpread: VectorPoint[];
  };
  labelOffsets: {
    atrialInsertion: VectorPoint;
    ventricularInsertion: VectorPoint;
  };
  fiducials: NsrFiducials;
  timeline: ActivationTimeline;
};

/** 症状や頻拍を伴わない心室早期興奮の教材例（WPWパターン）。 */
export const wpwFiducials: NsrFiducials = {
  pOn: 70,
  pPeak: 105,
  pOff: 140,
  qrsOn: 170,
  q: 190,
  r: 300,
  s: 340,
  qrsOff: 360,
  tPeak: 580,
  tEnd: 760,
};

function buildWpwTimeline(
  templateId: string,
  deltaDirection: [number, number, number],
  deltaLeadProjection: Partial<Record<LeadId, number>>
): ActivationTimeline {
  return {
    templateId,
    cycleMs: 1000,
    events: [
    { id: "atrial", segment: "saAtrial", centerMs: 105, sigmaMs: 29, dipoleDir: [0.7071, -0.7071, 0], dipolePeakMag: 0.13, contributesToWave: true },
    // 洞結節から心房筋を広がった刺激が、副伝導路の心房側入口へ近づく。
    { id: "accessoryAtrialApproach", segment: "accessoryAtrialApproach", centerMs: 150, sigmaMs: 18, dipoleDir: [0.5, -0.866, 0], dipolePeakMag: 0, contributesToWave: false },
    // 心房筋と心室筋を房室輪越しに結ぶ副伝導路を通過する。
    { id: "accessoryBridge", segment: "accessoryPathway", centerMs: 174, sigmaMs: 15, dipoleDir: [0.5, -0.866, 0], dipolePeakMag: 0, contributesToWave: false },
    // 房室結節を通る通常経路も保つ。こちらの心室興奮は副伝導路より後に到達する。
    { id: "normalAvConduction", segment: "avDelay", centerMs: 220, sigmaMs: 44, dipoleDir: [0.5, -0.866, 0], dipolePeakMag: 0, contributesToWave: false },
    // 心室側出口から周囲の心室筋へ広がる早期興奮がデルタ波を作る。
    { id: "deltaOnset", segment: "accessoryVentricularSpread", centerMs: 210, sigmaMs: 27, dipoleDir: deltaDirection, dipolePeakMag: 0.27, contributesToWave: true, leadProjection: deltaLeadProjection },
    { id: "deltaTail", segment: "accessoryVentricularSpread", centerMs: 248, sigmaMs: 27, dipoleDir: deltaDirection, dipolePeakMag: 0.31, contributesToWave: true, leadProjection: deltaLeadProjection },
    // 通常のHis・脚から届いた刺激が副伝導路由来の興奮と合流する。
    { id: "fusedVentricularActivation", segment: "septalPurkinje", centerMs: 300, sigmaMs: 26, dipoleDir: [0.5, -0.866, 0], dipolePeakMag: 0.85, contributesToWave: true },
    { id: "terminalS", segment: "septalPurkinje", centerMs: 340, sigmaMs: 16, dipoleDir: [0.5, -0.866, 0], dipolePeakMag: -0.22, contributesToWave: true },
    { id: "repol", segment: "ventRepol", centerMs: 580, sigmaMs: 76, dipoleDir: [0.6428, -0.766, 0], dipolePeakMag: 0.25, contributesToWave: true },
    ],
  };
}

const LEFT_FREE_WALL_DELTA = { I: 0.8, II: 1, III: 0.65, aVR: -0.9, aVL: 0.35, aVF: 0.85, V1: 0.8, V2: 0.9, V3: 1, V4: 1, V5: 0.9, V6: 0.8 } satisfies Record<LeadId, number>;
const RIGHT_FREE_WALL_DELTA = { I: 1, II: 0.45, III: -0.45, aVR: -0.8, aVL: 0.8, aVF: -0.1, V1: -0.8, V2: -0.5, V3: -0.15, V4: 0.4, V5: 0.8, V6: 1 } satisfies Record<LeadId, number>;
const RIGHT_POSTEROSEPTAL_DELTA = { I: 0.7, II: -0.7, III: -1, aVR: -0.2, aVL: 0.5, aVF: -0.9, V1: -0.7, V2: 0.15, V3: 0.45, V4: 0.7, V5: 0.8, V6: 0.7 } satisfies Record<LeadId, number>;
const LEFT_POSTEROSEPTAL_DELTA = { I: 0.7, II: -0.35, III: -0.9, aVR: -0.1, aVL: -0.5, aVF: -0.75, V1: 0.55, V2: 0.75, V3: 0.85, V4: 0.9, V5: 0.8, V6: 0.7 } satisfies Record<LeadId, number>;
const RIGHT_ANTEROSEPTAL_DELTA = { I: 0.3, II: 0.9, III: 0.8, aVR: -0.7, aVL: -0.2, aVF: 1, V1: -0.65, V2: -0.1, V3: 0.5, V4: 0.8, V5: 0.7, V6: 0.5 } satisfies Record<LeadId, number>;

export const wpwTimeline = buildWpwTimeline("wpw-left-free-wall-v3", [0.5, -0.866, 0], LEFT_FREE_WALL_DELTA);
export const wpwRightFreeWallTimeline = buildWpwTimeline("wpw-right-free-wall-v2", [0.958, 0.287, 0], RIGHT_FREE_WALL_DELTA);
export const wpwRightPosteroseptalTimeline = buildWpwTimeline("wpw-right-posteroseptal-v2", [0.5, 0.866, 0], RIGHT_POSTEROSEPTAL_DELTA);
export const wpwLeftPosteroseptalTimeline = buildWpwTimeline("wpw-left-posteroseptal-v1", [-0.2, 0.98, 0], LEFT_POSTEROSEPTAL_DELTA);
export const wpwRightAnteroseptalTimeline = buildWpwTimeline("wpw-right-anteroseptal-v1", [0.5, -0.866, 0], RIGHT_ANTEROSEPTAL_DELTA);

/**
 * 現在の教材バリアント。位置・3D経路・波形を一単位にし、将来は同じ構造で
 * 右側自由壁型や中隔側を追加する。古いA/B分類ではなく解剖学的位置で区別する。
 */
export const wpwLeftFreeWallVariant = {
  id: "manifest-left-free-wall",
  label: "左側自由壁型（模式例）",
  location: "left-free-wall",
  atrialChamber: "left",
  ventricularChamber: "left",
  anatomy: "左房筋 → 僧帽弁輪の副伝導路 → 左室自由壁",
  localizationHint: "位置推定の手掛かり：最大早期興奮ではV1の初期QRSが陽性方向",
  atrialInsertionLabel: "心房側入口（左房）",
  ventricularInsertionLabel: "心室側出口（左室）",
  atrialInsertion: [0.67, 0.28, -0.12],
  ventricularInsertion: [0.8, -0.05, 0.08],
  paths: {
    atrialApproach: [[0.18, 0.72, -0.18], [0.44, 0.56, -0.21], [0.67, 0.28, -0.12]],
    avBridge: [[0.67, 0.28, -0.12], [0.74, 0.12, -0.02], [0.8, -0.05, 0.08]],
    ventricularSpread: [[0.8, -0.05, 0.08], [0.81, -0.36, 0.22], [0.7, -0.62, 0.25], [0.55, -0.82, 0.2]],
  },
  labelOffsets: {
    atrialInsertion: [0.84, 0.18, 0.34],
    ventricularInsertion: [0.94, -0.32, 0.38],
  },
  fiducials: wpwFiducials,
  timeline: wpwTimeline,
} satisfies WpwVariantDefinition;

export const wpwRightFreeWallVariant = {
  id: "manifest-right-free-wall",
  label: "右側自由壁型（模式例）",
  location: "right-free-wall",
  atrialChamber: "right",
  ventricularChamber: "right",
  anatomy: "右房筋 → 三尖弁輪の副伝導路 → 右室自由壁",
  localizationHint: "位置推定の手掛かり：最大早期興奮ではV1の初期QRSが陰性方向",
  atrialInsertionLabel: "心房側入口（右房）",
  ventricularInsertionLabel: "心室側出口（右室）",
  atrialInsertion: [-0.68, 0.28, -0.12],
  ventricularInsertion: [-0.8, -0.05, 0.08],
  paths: {
    atrialApproach: [[-0.42, 0.67, -0.2], [-0.58, 0.5, -0.18], [-0.68, 0.28, -0.12]],
    avBridge: [[-0.68, 0.28, -0.12], [-0.74, 0.12, -0.02], [-0.8, -0.05, 0.08]],
    ventricularSpread: [[-0.8, -0.05, 0.08], [-0.81, -0.36, 0.22], [-0.7, -0.62, 0.25], [-0.55, -0.82, 0.2]],
  },
  labelOffsets: {
    atrialInsertion: [-0.84, 0.18, 0.34],
    ventricularInsertion: [-0.94, -0.32, 0.38],
  },
  fiducials: wpwFiducials,
  timeline: wpwRightFreeWallTimeline,
} satisfies WpwVariantDefinition;

export const wpwRightPosteroseptalVariant = {
  id: "manifest-right-posteroseptal",
  label: "右後中隔型（模式例）",
  location: "posteroseptal",
  atrialChamber: "right",
  ventricularChamber: "septal",
  anatomy: "右房後中隔 → 三尖弁輪後中隔の副伝導路 → 心室中隔基部",
  localizationHint: "位置推定の手掛かり：II・III・aVFの初期QRSが陰性方向",
  atrialInsertionLabel: "心房側入口（後中隔）",
  ventricularInsertionLabel: "心室側出口（後中隔）",
  atrialInsertion: [-0.2, 0.08, -0.34],
  ventricularInsertion: [-0.14, -0.18, -0.26],
  paths: {
    atrialApproach: [[-0.42, 0.58, -0.24], [-0.31, 0.32, -0.31], [-0.2, 0.08, -0.34]],
    avBridge: [[-0.2, 0.08, -0.34], [-0.17, -0.05, -0.31], [-0.14, -0.18, -0.26]],
    ventricularSpread: [[-0.14, -0.18, -0.26], [-0.08, -0.4, -0.2], [0.0, -0.64, -0.12], [0.08, -0.88, -0.02]],
  },
  labelOffsets: {
    atrialInsertion: [-0.88, 0.16, 0.46],
    ventricularInsertion: [0.9, -0.26, 0.45],
  },
  fiducials: wpwFiducials,
  timeline: wpwRightPosteroseptalTimeline,
} satisfies WpwVariantDefinition;

export const wpwLeftPosteroseptalVariant = {
  id: "manifest-left-posteroseptal",
  label: "左後中隔型（模式例）",
  location: "posteroseptal",
  atrialChamber: "left",
  ventricularChamber: "septal",
  anatomy: "左房後中隔 → 僧帽弁輪後中隔の副伝導路 → 心室中隔基部（左側）",
  localizationHint: "位置推定の手掛かり：III・aVFは陰性方向、V1・V2は陽性方向",
  atrialInsertionLabel: "心房側入口（左後中隔）",
  ventricularInsertionLabel: "心室側出口（左後中隔）",
  atrialInsertion: [0.2, 0.08, -0.34],
  ventricularInsertion: [0.14, -0.18, -0.26],
  paths: {
    atrialApproach: [[0.36, 0.58, -0.24], [0.29, 0.32, -0.31], [0.2, 0.08, -0.34]],
    avBridge: [[0.2, 0.08, -0.34], [0.17, -0.05, -0.31], [0.14, -0.18, -0.26]],
    ventricularSpread: [[0.14, -0.18, -0.26], [0.08, -0.4, -0.2], [0.0, -0.64, -0.12], [-0.08, -0.88, -0.02]],
  },
  labelOffsets: {
    atrialInsertion: [0.92, 0.16, 0.46],
    ventricularInsertion: [-0.94, -0.26, 0.45],
  },
  fiducials: wpwFiducials,
  timeline: wpwLeftPosteroseptalTimeline,
} satisfies WpwVariantDefinition;

export const wpwRightAnteroseptalVariant = {
  id: "manifest-right-anteroseptal",
  label: "右前中隔型（模式例）",
  location: "anteroseptal",
  atrialChamber: "right",
  ventricularChamber: "septal",
  anatomy: "右房前中隔 → 三尖弁輪前中隔（His束近傍） → 心室中隔上部",
  localizationHint: "位置推定の手掛かり：V1は陰性方向、II・III・aVFは陽性方向",
  atrialInsertionLabel: "心房側入口（前中隔）",
  ventricularInsertionLabel: "心室側出口（His束近傍）",
  atrialInsertion: [-0.3, 0.22, 0.03],
  ventricularInsertion: [-0.18, -0.12, 0.02],
  paths: {
    atrialApproach: [[-0.54, 0.65, -0.14], [-0.42, 0.43, -0.05], [-0.3, 0.22, 0.03]],
    avBridge: [[-0.3, 0.22, 0.03], [-0.24, 0.05, 0.03], [-0.18, -0.12, 0.02]],
    ventricularSpread: [[-0.18, -0.12, 0.02], [-0.1, -0.34, 0.06], [0.0, -0.55, 0.1], [0.1, -0.76, 0.14]],
  },
  labelOffsets: {
    atrialInsertion: [-1.0, 0.2, 0.42],
    ventricularInsertion: [1.06, -0.22, 0.42],
  },
  fiducials: wpwFiducials,
  timeline: wpwRightAnteroseptalTimeline,
} satisfies WpwVariantDefinition;

/** 位置別WPW教材の登録表。ここへ追加すると選択UI・3D・波形を同じIDで結べる。 */
export const WPW_VARIANTS = {
  [wpwLeftFreeWallVariant.id]: wpwLeftFreeWallVariant,
  [wpwRightFreeWallVariant.id]: wpwRightFreeWallVariant,
  [wpwRightPosteroseptalVariant.id]: wpwRightPosteroseptalVariant,
  [wpwLeftPosteroseptalVariant.id]: wpwLeftPosteroseptalVariant,
  [wpwRightAnteroseptalVariant.id]: wpwRightAnteroseptalVariant,
} as const satisfies Record<string, WpwVariantDefinition>;

export type WpwVariantId = keyof typeof WPW_VARIANTS;
export const DEFAULT_WPW_VARIANT_ID: WpwVariantId = "manifest-left-free-wall";
export const defaultWpwVariant = WPW_VARIANTS[DEFAULT_WPW_VARIANT_ID];
