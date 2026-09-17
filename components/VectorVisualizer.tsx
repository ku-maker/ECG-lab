"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { Pause, Play, RotateCcw, Eye, EyeOff, Layers3, MousePointer2, ChevronRight } from "lucide-react";
import { AnatomicalHeart, AnatomyLabel } from "@/components/conduction/AnatomicalHeart";
import { buildConductionStages, conductionStageAt } from "@/lib/ecg/conductionStages";
import {
  AV_BLOCK_ESCAPE_BPM,
  AV_BLOCK_ESCAPE_PHASE_OFFSET_MS,
  AV_BLOCK_P_BPM,
  AV_BLOCK_P_PEAK_OFFSET_MS,
  AV_BLOCK_QRS_PEAK_OFFSET_MS,
} from "@/lib/ecg/teachingTiming";
import { waveformSeekRatio } from "@/lib/ecg/waveformSeek";
import { clamp } from "@/lib/ecg/easing";
import { useCardiacClock } from "@/lib/ecg/useCardiacClock";
import { evaluateSegments } from "@/src/data/ecg/activation/evaluate";
import { buildNsrTimeline, type NsrFiducials } from "@/src/data/ecg/activation/buildTimeline";
import { nsrTimeline } from "@/src/data/ecg/activation/nsr";
import { lbbbFiducials, lbbbTimeline } from "@/src/data/ecg/activation/lbbb";
import {
  DEFAULT_WPW_VARIANT_ID,
  WPW_VARIANTS,
  defaultWpwVariant,
  wpwFiducials,
  wpwLeftPosteroseptalTimeline,
  wpwRightAnteroseptalTimeline,
  wpwRightFreeWallTimeline,
  wpwRightPosteroseptalTimeline,
  wpwTimeline,
  type WpwVariantDefinition,
  type WpwVariantId,
} from "@/src/data/ecg/activation/wpw";
import {
  CONDUCTION_POINTS,
  SEGMENT_POINTS,
} from "@/src/data/ecg/activation/segmentPoints";
import type { ActivationTimeline, ConductionSegmentId } from "@/src/data/ecg/activation/types";
import { resolveVentricularGlow } from "@/src/data/ecg/activation/ventricularGlow";
import {
  GRAPH_BASELINE_Y,
  GRAPH_HEIGHT,
  GRAPH_SAMPLE_COUNT,
  computeGraphMvScale,
} from "@/src/data/ecg/leads/graphScale";
import { LEADS, type LeadId } from "@/src/data/ecg/leads/leadAxes";
import { leadCameraPosition } from "@/src/data/ecg/leads/leadCamera";
import {
  projectLeadValue,
  sampleLeadCycle,
} from "@/src/data/ecg/leads/projectLead";
import nsrTemplate from "@/src/data/ecg/templates/nsr-lead2.json";
import avBlock1Template from "@/src/data/ecg/templates/avblock1-lead2.json";
import wenckebachTemplate from "@/src/data/ecg/templates/wenckebach-lead2.json";
import mobitz2Template from "@/src/data/ecg/templates/mobitz2-lead2.json";
import avBlock3Template from "@/src/data/ecg/templates/avblock3-lead2.json";

const GRAPH_WIDTH = 900;
const GRAPH_PADDING_X = 36;
const PLOT_WIDTH = GRAPH_WIDTH - GRAPH_PADDING_X * 2;
const avBlock1Timeline = buildNsrTimeline(
  avBlock1Template.id,
  avBlock1Template.fiducialsMs as NsrFiducials,
  avBlock1Template.durationMs
);

type PrWindow = {
  startMs: number;
  endMs: number | null;
  label: string;
  dropped?: boolean;
};

type QrsWindow = {
  startMs: number;
  endMs: number;
  label: string;
};

type ScenarioCheckpoint = {
  label: string;
  color: string;
  focusMs: number;
  startMs: number;
  endMs: number;
};

function buildWenckebachScenario() {
  const beatMs = 1000;
  const prIntervals = [220, 310, 400] as const;
  const events: ActivationTimeline["events"] = [];
  const stages: ReturnType<typeof buildConductionStages> = [];
  const prWindows: PrWindow[] = [];
  const checkpoints: ScenarioCheckpoint[] = [];

  for (let beatIndex = 0; beatIndex < 4; beatIndex++) {
    const beatStart = beatIndex * beatMs;
    const pOn = 100;
    const pPeak = 140;
    const pOff = 180;

    if (beatIndex === 3) {
      const droppedFiducials: NsrFiducials = {
        pOn, pPeak, pOff, qrsOn: 650, q: 670, r: 700, s: 730,
        qrsOff: 760, tPeak: 860, tEnd: 960,
      };
      const droppedTimeline = buildNsrTimeline("wenckebach-drop", droppedFiducials, beatMs);
      events.push(...droppedTimeline.events
        .filter((event) => event.id === "atrial" || event.id === "avDelay")
        .map((event) => ({ ...event, centerMs: event.centerMs + beatStart })));
      stages.push(
        { id: "rest", label: "基線", title: "次の心房興奮を待つ", description: "次のP波を待つ時期です。", color: "#94a3b8", startMs: beatStart, endMs: beatStart + pOn, focusMs: beatStart },
        { id: "atrial", label: "P波", title: "4拍目のP波は出現する", description: "心房は予定どおり興奮し、P波が現れます。", color: "#fbbf24", startMs: beatStart + pOn, endMs: beatStart + pOff, focusMs: beatStart + pPeak },
        { id: "av", label: "QRS脱落", title: "P波が心室へ伝わらない", description: "この拍ではP波のあとにQRS波が続きません。次の周期ではPR間隔が短く戻ります。", color: "#fb7185", startMs: beatStart + pOff, endMs: beatStart + beatMs, focusMs: beatStart + 560 },
      );
      prWindows.push({ startMs: beatStart + pOn, endMs: null, label: "QRS脱落", dropped: true });
      checkpoints.push({ label: "4拍目 · QRS脱落", color: "#fb7185", focusMs: beatStart + 560, startMs: beatStart, endMs: beatStart + beatMs });
      continue;
    }

    const qrsOn = pOn + prIntervals[beatIndex];
    const r = qrsOn + 50;
    const fiducials: NsrFiducials = {
      pOn, pPeak, pOff,
      qrsOn, q: r - 30, r, s: r + 30, qrsOff: r + 60,
      tPeak: r + 230, tEnd: Math.min(950, r + 410),
    };
    const beatTimeline = buildNsrTimeline(`wenckebach-${beatIndex + 1}`, fiducials, beatMs);
    events.push(...beatTimeline.events.map((event) => ({ ...event, centerMs: event.centerMs + beatStart })));
    stages.push(...buildConductionStages(fiducials, beatTimeline).map((stage) => ({
      ...stage,
      startMs: stage.startMs + beatStart,
      endMs: stage.endMs + beatStart,
      focusMs: stage.focusMs + beatStart,
    })));
    prWindows.push({ startMs: beatStart + pOn, endMs: beatStart + qrsOn, label: `PR ${prIntervals[beatIndex]} ms` });
    checkpoints.push({ label: `${beatIndex + 1}拍目 · PR ${prIntervals[beatIndex]} ms`, color: "#fbbf24", focusMs: beatStart + (pOff + qrsOn) / 2, startMs: beatStart, endMs: beatStart + beatMs });
  }

  return {
    timeline: { templateId: wenckebachTemplate.id, cycleMs: beatMs * 4, events } satisfies ActivationTimeline,
    stages,
    prWindows,
    checkpoints,
  };
}

const wenckebachScenario = buildWenckebachScenario();

function buildMobitz2Scenario() {
  const beatMs = 1000;
  const prInterval = 180;
  const events: ActivationTimeline["events"] = [];
  const stages: ReturnType<typeof buildConductionStages> = [];
  const prWindows: PrWindow[] = [];
  const checkpoints: ScenarioCheckpoint[] = [];

  for (let beatIndex = 0; beatIndex < 4; beatIndex++) {
    const beatStart = beatIndex * beatMs;
    const pOn = 100;
    const pPeak = 140;
    const pOff = 180;

    if (beatIndex === 3) {
      const droppedFiducials: NsrFiducials = {
        pOn, pPeak, pOff, qrsOn: 420, q: 440, r: 470, s: 500,
        qrsOff: 530, tPeak: 720, tEnd: 900,
      };
      const droppedTimeline = buildNsrTimeline("mobitz2-drop", droppedFiducials, beatMs);
      events.push(...droppedTimeline.events
        .filter((event) => event.id === "atrial" || event.id === "avDelay")
        .map((event) => ({ ...event, centerMs: event.centerMs + beatStart })));
      stages.push(
        { id: "rest", label: "基線", title: "次の心房興奮を待つ", description: "次のP波を待つ時期です。", color: "#94a3b8", startMs: beatStart, endMs: beatStart + pOn, focusMs: beatStart },
        { id: "atrial", label: "P波", title: "4拍目のP波は出現する", description: "心房は予定どおり興奮し、P波が現れます。", color: "#fbbf24", startMs: beatStart + pOn, endMs: beatStart + pOff, focusMs: beatStart + pPeak },
        { id: "av", label: "QRS脱落", title: "伝導が突然途切れる", description: "直前の拍までPR間隔は一定でしたが、このP波のあとにはQRS波が続きません。", color: "#fb7185", startMs: beatStart + pOff, endMs: beatStart + beatMs, focusMs: beatStart + 500 },
      );
      prWindows.push({ startMs: beatStart + pOn, endMs: null, label: "QRS脱落", dropped: true });
      checkpoints.push({ label: "4拍目 · 突然QRS脱落", color: "#fb7185", focusMs: beatStart + 500, startMs: beatStart, endMs: beatStart + beatMs });
      continue;
    }

    const qrsOn = pOn + prInterval;
    const r = qrsOn + 50;
    const fiducials: NsrFiducials = {
      pOn, pPeak, pOff,
      qrsOn, q: r - 30, r, s: r + 30, qrsOff: r + 60,
      tPeak: r + 230, tEnd: r + 410,
    };
    const beatTimeline = buildNsrTimeline(`mobitz2-${beatIndex + 1}`, fiducials, beatMs);
    events.push(...beatTimeline.events.map((event) => ({ ...event, centerMs: event.centerMs + beatStart })));
    stages.push(...buildConductionStages(fiducials, beatTimeline).map((stage) => ({
      ...stage,
      startMs: stage.startMs + beatStart,
      endMs: stage.endMs + beatStart,
      focusMs: stage.focusMs + beatStart,
    })));
    prWindows.push({ startMs: beatStart + pOn, endMs: beatStart + qrsOn, label: `PR ${prInterval} ms` });
    checkpoints.push({ label: `${beatIndex + 1}拍目 · PR ${prInterval} ms`, color: "#a7f3d0", focusMs: beatStart + (pOff + qrsOn) / 2, startMs: beatStart, endMs: beatStart + beatMs });
  }

  return {
    timeline: { templateId: mobitz2Template.id, cycleMs: beatMs * 4, events } satisfies ActivationTimeline,
    stages,
    prWindows,
    checkpoints,
  };
}

const mobitz2Scenario = buildMobitz2Scenario();

function buildCompleteAvBlockScenario() {
  const cycleMs = 6000;
  const atrialBeatMs = 60_000 / AV_BLOCK_P_BPM;
  const escapeBeatMs = 60_000 / AV_BLOCK_ESCAPE_BPM;
  const events: ActivationTimeline["events"] = [];
  const stages: ReturnType<typeof buildConductionStages> = [
    { id: "rest", label: "基線", title: "P波とQRSを別々に追う", description: "完全房室ブロックでは、心房と心室が別々の周期で動きます。", color: "#94a3b8", startMs: 0, endMs: 80, focusMs: 0 },
  ];

  for (let beatIndex = 0; ; beatIndex++) {
    const pPeak = AV_BLOCK_P_PEAK_OFFSET_MS + beatIndex * atrialBeatMs;
    if (pPeak >= cycleMs) break;
    const pOn = pPeak - 45;
    const pOff = pPeak + 45;
    const blockedEnd = pOff + 150;
    const fiducials: NsrFiducials = {
      pOn, pPeak, pOff,
      qrsOn: blockedEnd, q: blockedEnd + 20, r: blockedEnd + 50, s: blockedEnd + 80,
      qrsOff: blockedEnd + 110, tPeak: blockedEnd + 280, tEnd: blockedEnd + 430,
    };
    const atrialTimeline = buildNsrTimeline(`avblock3-p-${beatIndex + 1}`, fiducials, cycleMs);
    events.push(...atrialTimeline.events
      .filter((event) => event.id === "atrial" || event.id === "avDelay")
      .map((event) => ({ ...event, id: `${event.id}-p${beatIndex + 1}` })));
    stages.push(
      { id: "atrial", label: "P波", title: "心房は規則正しく興奮する", description: "P波は約82/分で規則正しく現れます。まずP波だけを追って間隔が一定か確認します。", color: "#fbbf24", startMs: pOn, endMs: pOff, focusMs: pPeak },
      { id: "av", label: "伝導途絶", title: "心房刺激は心室へ伝わらない", description: "P波の刺激は心室へ到達しません。P波の後に一定のPR間隔でQRSが続く関係はありません。", color: "#6ee7b7", startMs: pOff, endMs: blockedEnd, focusMs: (pOff + blockedEnd) / 2 },
    );
  }

  for (let beatIndex = 0; ; beatIndex++) {
    const r = AV_BLOCK_ESCAPE_PHASE_OFFSET_MS + AV_BLOCK_QRS_PEAK_OFFSET_MS + beatIndex * escapeBeatMs;
    if (r >= cycleMs) break;
    const qrsOn = r - 95;
    const qrsOff = r + 135;
    const tPeak = r + 335;
    const tEnd = r + 540;
    const fiducials: NsrFiducials = {
      pOn: Math.max(0, qrsOn - 260), pPeak: Math.max(20, qrsOn - 220), pOff: Math.max(40, qrsOn - 180),
      qrsOn, q: r - 60, r, s: r + 75, qrsOff, tPeak, tEnd,
    };
    const escapeTimeline = buildNsrTimeline(`avblock3-qrs-${beatIndex + 1}`, fiducials, cycleMs);
    events.push(...escapeTimeline.events
      .filter((event) => event.segment === "septalPurkinje" || event.segment === "ventRepol")
      .map((event) => ({
        ...event,
        id: `${event.id}-escape${beatIndex + 1}`,
        sigmaMs: event.segment === "septalPurkinje" ? event.sigmaMs * 1.25 : event.sigmaMs,
      })));
    const tOn = qrsOff + 70;
    stages.push(
      { id: "qrs", label: "QRS波", title: "心室の補充調律が独立して発生", description: "心室は約35/分の遅い補充調律で興奮します。QRS波だけを追うと、P波とは別の規則性が見えます。", color: "#f472b6", startMs: qrsOn, endMs: qrsOff, focusMs: r },
      { id: "st", label: "ST部分", title: "心室の興奮後", description: "補充調律による心室興奮の後です。", color: "#c4b5fd", startMs: qrsOff, endMs: tOn, focusMs: (qrsOff + tOn) / 2 },
      { id: "repol", label: "T波", title: "心室筋が回復する", description: "補充調律で興奮した心室筋が再分極します。", color: "#67e8f9", startMs: tOn, endMs: Math.min(cycleMs, tEnd), focusMs: tPeak },
    );
  }

  stages.sort((a, b) => a.startMs - b.startMs);
  return {
    timeline: { templateId: avBlock3Template.id, cycleMs, events } satisfies ActivationTimeline,
    stages,
    checkpoints: [
      { label: "P波だけを追う", color: "#fbbf24", focusMs: 130, startMs: 0, endMs: 300 },
      { label: "QRSだけを追う", color: "#f472b6", focusMs: 540, startMs: 300, endMs: 900 },
      { label: "P–QRS関係を見る", color: "#67e8f9", focusMs: 3968, startMs: 900, endMs: 6000 },
    ] satisfies ScenarioCheckpoint[],
  };
}

const completeAvBlockScenario = buildCompleteAvBlockScenario();

const rbbbFiducials: NsrFiducials = {
  pOn: 60,
  pPeak: 100,
  pOff: 140,
  qrsOn: 280,
  q: 300,
  r: 335,
  s: 380,
  qrsOff: 460,
  tPeak: 650,
  tEnd: 840,
};

function buildRbbbScenario() {
  const timeline: ActivationTimeline = {
    templateId: "rbbb-conduction-v1",
    cycleMs: 1000,
    events: [
      { id: "atrial", segment: "saAtrial", centerMs: 100, sigmaMs: 33, dipoleDir: [0.7071, -0.7071, 0], dipolePeakMag: 0.13, contributesToWave: true },
      { id: "avDelay", segment: "avDelay", centerMs: 210, sigmaMs: 70, dipoleDir: [0.5, -0.866, 0], dipolePeakMag: 0, contributesToWave: false },
      { id: "septalQ", segment: "septalPurkinje", centerMs: 300, sigmaMs: 10, dipoleDir: [0.5, -0.866, 0], dipolePeakMag: -0.12, contributesToWave: true },
      { id: "leftAnteriorActivation", segment: "leftAnterior", centerMs: 335, sigmaMs: 30, dipoleDir: [0.5, -0.866, 0], dipolePeakMag: 0, contributesToWave: false },
      { id: "leftPosteriorActivation", segment: "leftPosterior", centerMs: 345, sigmaMs: 32, dipoleDir: [0.5, -0.866, 0], dipolePeakMag: 0, contributesToWave: false },
      { id: "mainR", segment: "septalPurkinje", centerMs: 335, sigmaMs: 19, dipoleDir: [0.5, -0.866, 0], dipolePeakMag: 0.82, contributesToWave: true },
      { id: "midS", segment: "septalPurkinje", centerMs: 380, sigmaMs: 15, dipoleDir: [0.5, -0.866, 0], dipolePeakMag: -0.42, contributesToWave: true },
      { id: "delayedRightVentricle", segment: "rightBundle", centerMs: 430, sigmaMs: 24, dipoleDir: [-0.766, -0.6428, 0], dipolePeakMag: 0.78, contributesToWave: true },
      { id: "repol", segment: "ventRepol", centerMs: 650, sigmaMs: 76, dipoleDir: [0.6428, -0.766, 0], dipolePeakMag: 0.28, contributesToWave: true },
    ],
  };
  const stages = buildConductionStages(rbbbFiducials, timeline).map((stage) => {
    if (stage.id !== "qrs") return stage;
    return {
      ...stage,
      title: "左室側が先に、右室側が遅れて興奮する",
      description: "左脚系を通った興奮が左室側へ先に広がり、その後に右室側が遅れて興奮します。この終末部の遅れが幅広いQRSを作ります。",
    };
  });
  return {
    timeline,
    stages,
    checkpoints: [
      { label: "QRSの始まり", color: "#c4b5fd", focusMs: 295, startMs: 0, endMs: 320 },
      { label: "左室側が先行", color: "#a7f3d0", focusMs: 345, startMs: 320, endMs: 400 },
      { label: "右室側が遅れる", color: "#fb7185", focusMs: 430, startMs: 400, endMs: 1000 },
    ] satisfies ScenarioCheckpoint[],
  };
}

const rbbbScenario = buildRbbbScenario();

function buildLbbbScenario() {
  const stages = buildConductionStages(lbbbFiducials, lbbbTimeline).map((stage) => {
    if (stage.id === "qrs") return {
      ...stage,
      title: "右室側が先に、左室側が遅れて興奮する",
      description: "右脚を通った刺激で右室側が先に興奮します。左室側は遅れて興奮し、幅広いQRSになります。V1は主に下向き、V6は幅広いR波を示します。",
    };
    if (stage.id === "repol") return {
      ...stage,
      description: "左脚ブロックではQRSと反対向きのST・T変化が出ることがあります。この波形は模式図で、虚血の判定には使えません。",
    };
    return stage;
  });
  return {
    stages,
    checkpoints: [
      { label: "QRSの始まり", color: "#c4b5fd", focusMs: 290, startMs: 0, endMs: 300 },
      { label: "右室側が先行", color: "#a7f3d0", focusMs: 310, startMs: 300, endMs: 345 },
      { label: "左室側が遅れる", color: "#fb7185", focusMs: 430, startMs: 345, endMs: 1000 },
    ] satisfies ScenarioCheckpoint[],
  };
}

const lbbbScenario = buildLbbbScenario();

function wpwVentricularRegionLabel(variant: WpwVariantDefinition) {
  if (variant.ventricularChamber === "left") return "左室";
  if (variant.ventricularChamber === "right") return "右室";
  return "心室中隔";
}

function buildWpwScenario(variant: WpwVariantDefinition) {
  const chamber = wpwVentricularRegionLabel(variant);
  const atrium = variant.atrialChamber === "left" ? "左房" : "右房";
  const stages = buildConductionStages(variant.fiducials, variant.timeline).map((stage) => {
    if (stage.id === "av") return {
      ...stage,
      title: "心房筋から副伝導路へ入る",
      description: `${atrium}を広がった刺激が心房側入口へ入り、房室輪をまたいで${chamber}側出口へ進みます。房室結節の待ち時間を通りません。`,
    };
    if (stage.id === "qrs") return {
      ...stage,
      title: "副伝導路と通常経路の興奮が合流する",
      description: "副伝導路が先に心室を興奮させ、緩やかなQRS立ち上がり（デルタ波）を作ります。その後、His・脚を通った通常の興奮が合流します。",
    };
    return stage;
  });
  return {
    stages,
    checkpoints: [
      { label: "心房内を進む", color: "#fbbf24", focusMs: 105, startMs: 0, endMs: 140 },
      { label: "心房側入口へ", color: "#a7f3d0", focusMs: 150, startMs: 140, endMs: 165 },
      { label: "房室輪を越える", color: "#67e8f9", focusMs: 174, startMs: 165, endMs: 190 },
      { label: `${chamber}へ広がる・δ波`, color: "#67e8f9", focusMs: 210, startMs: 190, endMs: 265 },
      { label: "通常経路が合流", color: "#f472b6", focusMs: 300, startMs: 265, endMs: 1000 },
    ] satisfies ScenarioCheckpoint[],
  };
}

const wpwScenario = buildWpwScenario(defaultWpwVariant);

type ConductionScenarioId = "normal" | "avBlock1" | "wenckebach" | "mobitz2" | "avBlock3" | "rbbb" | "lbbb" | "wpw";

type ConductionScenario = {
  id: ConductionScenarioId;
  label: string;
  shortLabel: string;
  accent: string;
  timeline: ActivationTimeline;
  fiducials: NsrFiducials;
  finding: string;
  mechanism: string;
  observation: string;
  prWindows: PrWindow[];
  qrsWindow?: QrsWindow;
  deltaWindow?: QrsWindow;
  checkpoints: ScenarioCheckpoint[];
  cycleLabel: string;
  rateLabel: string;
};

const CONDUCTION_SCENARIOS: Record<ConductionScenarioId, ConductionScenario> = {
  normal: {
    id: "normal",
    label: "正常洞調律",
    shortLabel: "基準",
    accent: "#34d399",
    timeline: nsrTimeline,
    fiducials: nsrTemplate.fiducialsMs,
    finding: "PR間隔 160 ms",
    mechanism: "心房の興奮後、短い待ち時間を経て心室へ伝わります。",
    observation: "P波の始まりからQRSの始まりまでを測ります。",
    prWindows: [{ startMs: nsrTemplate.fiducialsMs.pOn, endMs: nsrTemplate.fiducialsMs.qrsOn, label: "PR 160 ms" }],
    checkpoints: [],
    cycleLabel: "1拍 · 1,000 ms",
    rateLabel: "心房 60 bpm",
  },
  avBlock1: {
    id: "avBlock1",
    label: "1度房室ブロック",
    shortLabel: "伝導が遅い",
    accent: "#fbbf24",
    timeline: avBlock1Timeline,
    fiducials: avBlock1Template.fiducialsMs,
    finding: "PR間隔 460 ms",
    mechanism: "心房から心室へ伝わるまでの待ち時間が延長しています。",
    observation: "PR間隔は200 msを超えますが、すべてのP波にQRSが続きます。",
    prWindows: [{ startMs: avBlock1Template.fiducialsMs.pOn, endMs: avBlock1Template.fiducialsMs.qrsOn, label: "PR 460 ms" }],
    checkpoints: [],
    cycleLabel: "1拍 · 1,000 ms",
    rateLabel: "心房 60 bpm",
  },
  wenckebach: {
    id: "wenckebach",
    label: "Wenckebach型2度房室ブロック",
    shortLabel: "徐々に延長 → 脱落",
    accent: "#fbbf24",
    timeline: wenckebachScenario.timeline,
    fiducials: wenckebachTemplate.fiducialsMs as NsrFiducials,
    finding: "PR 220 → 310 → 400 ms → QRS脱落",
    mechanism: "房室伝導が拍ごとに遅くなり、4拍目は心室へ伝わりません。",
    observation: "P波を順に追い、PR間隔の延長とQRS脱落を一続きで確認します。",
    prWindows: wenckebachScenario.prWindows,
    checkpoints: wenckebachScenario.checkpoints,
    cycleLabel: "4拍 · 4,000 ms",
    rateLabel: "心房 60 bpm",
  },
  mobitz2: {
    id: "mobitz2",
    label: "Mobitz II型2度房室ブロック",
    shortLabel: "一定 → 突然脱落",
    accent: "#a7f3d0",
    timeline: mobitz2Scenario.timeline,
    fiducials: mobitz2Template.fiducialsMs as NsrFiducials,
    finding: "PR 180 → 180 → 180 ms → QRS脱落",
    mechanism: "伝導した拍のPR間隔は一定で、4拍目だけ伝導が突然途切れます。",
    observation: "伝導した3拍のPR間隔が変わらないことを確認してから、脱落を見ます。",
    prWindows: mobitz2Scenario.prWindows,
    checkpoints: mobitz2Scenario.checkpoints,
    cycleLabel: "4拍 · 4,000 ms",
    rateLabel: "心房 60 bpm",
  },
  avBlock3: {
    id: "avBlock3",
    label: "3度（完全）房室ブロック",
    shortLabel: "P波とQRSが独立",
    accent: "#fb7185",
    timeline: completeAvBlockScenario.timeline,
    fiducials: {
      ...avBlock3Template.fiducialsMs,
      q: avBlock3Template.fiducialsMs.r - 60,
      s: avBlock3Template.fiducialsMs.r + 75,
    },
    finding: "心房 82 ／ 心室 35 bpm",
    mechanism: "心房刺激は心室へ伝わらず、心室は遅い補充調律で動きます。",
    observation: "P波とQRSを別々に追い、両者の間隔が毎回変わることを確認します。",
    prWindows: [],
    checkpoints: completeAvBlockScenario.checkpoints,
    cycleLabel: "6秒のリズムストリップ",
    rateLabel: "心房 82 / 心室 35 bpm",
  },
  rbbb: {
    id: "rbbb",
    label: "完全右脚ブロック",
    shortLabel: "右室側が遅れる",
    accent: "#fb7185",
    timeline: rbbbScenario.timeline,
    fiducials: rbbbFiducials,
    finding: "QRS幅 180 ms",
    mechanism: "左脚系から左室側が先に興奮し、右室側の終末興奮が遅れます。",
    observation: "QRS幅を測り、V1の終末R′とI・V6の遅いS波を確認します。",
    prWindows: [],
    qrsWindow: { startMs: rbbbFiducials.qrsOn, endMs: rbbbFiducials.qrsOff, label: "QRS 180 ms" },
    checkpoints: rbbbScenario.checkpoints,
    cycleLabel: "1拍 · 1,000 ms",
    rateLabel: "心房 60 bpm",
  },
  lbbb: {
    id: "lbbb",
    label: "完全左脚ブロック",
    shortLabel: "左室側が遅れる",
    accent: "#c4b5fd",
    timeline: lbbbTimeline,
    fiducials: lbbbFiducials,
    finding: "QRS幅 200 ms",
    mechanism: "右脚から右室側が先に興奮し、左室側の興奮が遅れます。",
    observation: "QRS幅を測り、V1の主に陰性の波形とI・V6の幅広いR波を確認します。",
    prWindows: [],
    qrsWindow: { startMs: lbbbFiducials.qrsOn, endMs: lbbbFiducials.qrsOff, label: "QRS 200 ms" },
    checkpoints: lbbbScenario.checkpoints,
    cycleLabel: "1拍 · 1,000 ms",
    rateLabel: "心房 60 bpm",
  },
  wpw: {
    id: "wpw",
    label: "WPWパターン（心室早期興奮）",
    shortLabel: "位置別・δ波",
    accent: "#67e8f9",
    timeline: wpwTimeline,
    fiducials: wpwFiducials,
    finding: "PR 100 ms · QRS 190 ms",
    mechanism: "左房筋から僧帽弁輪の副伝導路へ入り、左室自由壁へ出たあと、通常経路の興奮と合流します。",
    observation: "短いPR間隔と、QRSの緩やかな立ち上がり（デルタ波）を確認します。",
    prWindows: [{ startMs: wpwFiducials.pOn, endMs: wpwFiducials.qrsOn, label: "PR 100 ms" }],
    qrsWindow: { startMs: wpwFiducials.qrsOn, endMs: wpwFiducials.qrsOff, label: "QRS 190 ms" },
    deltaWindow: { startMs: wpwFiducials.qrsOn, endMs: 260, label: "δ波" },
    checkpoints: wpwScenario.checkpoints,
    cycleLabel: "1拍 · 1,000 ms",
    rateLabel: "心房 60 bpm",
  },
};

// 比較時も縦の尺度を変えない。両シナリオ・全12誘導が収まる小さい方のスケールを共有する。
const GRAPH_MV_SCALE = Math.min(
  computeGraphMvScale(nsrTimeline, LEADS),
  computeGraphMvScale(avBlock1Timeline, LEADS),
  computeGraphMvScale(completeAvBlockScenario.timeline, LEADS),
  computeGraphMvScale(rbbbScenario.timeline, LEADS),
  computeGraphMvScale(lbbbTimeline, LEADS),
  computeGraphMvScale(wpwTimeline, LEADS),
  computeGraphMvScale(wpwRightAnteroseptalTimeline, LEADS),
  computeGraphMvScale(wpwRightFreeWallTimeline, LEADS),
  computeGraphMvScale(wpwRightPosteroseptalTimeline, LEADS),
  computeGraphMvScale(wpwLeftPosteroseptalTimeline, LEADS)
);

type VectorPoint = [number, number, number];

const SCENE_TARGET: VectorPoint = [-0.08, -0.28, 0.02];

// カメラ位置は leadCameraPosition（T2 の leadAxis 由来）で算出する。
// 伝導路の3D点列は SEGMENT_POINTS / CONDUCTION_POINTS（segmentPoints.ts）から import。

const SCENARIO_STAGES: Record<ConductionScenarioId, ReturnType<typeof buildConductionStages>> = {
  normal: buildConductionStages(nsrTemplate.fiducialsMs, nsrTimeline),
  avBlock1: buildConductionStages(avBlock1Template.fiducialsMs, avBlock1Timeline),
  wenckebach: wenckebachScenario.stages,
  mobitz2: mobitz2Scenario.stages,
  avBlock3: completeAvBlockScenario.stages,
  rbbb: rbbbScenario.stages,
  lbbb: lbbbScenario.stages,
  wpw: wpwScenario.stages,
};

function resolveScenarioStage(
  scenarioId: ConductionScenarioId,
  stages: ReturnType<typeof buildConductionStages>,
  timeline: ActivationTimeline,
  phaseMs: number,
  wpwVariant: WpwVariantDefinition = defaultWpwVariant
) {
  if (scenarioId === "wpw") {
    const atrium = wpwVariant.atrialChamber === "left" ? "左房" : "右房";
    const ventricle = wpwVentricularRegionLabel(wpwVariant);
    const annulus = wpwVariant.location === "left-free-wall" ? "僧帽弁輪" : "三尖弁輪";
    const stage = conductionStageAt(stages, phaseMs);
    if (stage.id === "av") return phaseMs < 165
      ? {
          ...stage,
          title: "心房筋から副伝導路の入口へ進む",
          description: `${atrium}筋を広がった刺激が、${annulus}にある副伝導路の心房側入口へ到達します。`,
        }
      : {
          ...stage,
          title: `副伝導路を通って${ventricle}側へ出る`,
          description: `刺激は房室輪をまたぐ筋線維を通り、${ventricle}側出口へ到達します。房室結節の待ち時間を迂回します。`,
        };
    if (stage.id !== "qrs") return stage;
    if (phaseMs < 190) return {
      ...stage,
      title: "副伝導路が房室輪をまたぐ",
      description: `心房側入口から入った刺激が、副伝導路を通って${ventricle}側出口へ抜けます。ここが通常の房室結節経路との分岐です。`,
    };
    return phaseMs < 265
      ? {
          ...stage,
          title: `${ventricle}側出口から心室筋へ広がる`,
          description: `出口近くの${ventricle}筋から、興奮が心筋を細胞間伝導で広がります。この比較的ゆっくりした初期興奮がデルタ波です。`,
        }
      : {
          ...stage,
          title: "通常経路からの興奮が合流する",
          description: "His束・脚を通った刺激が心室へ届き、副伝導路から先に始まった興奮と合流します。QRS全体が広く見えます。",
        };
  }
  if (scenarioId !== "avBlock3") return conductionStageAt(stages, phaseMs);
  const segments = evaluateSegments(timeline, phaseMs);
  const stageId = segments.septalPurkinje > 0.04
    ? "qrs"
    : segments.ventRepol > 0.04
      ? "repol"
      : segments.saAtrial > 0.04
        ? "atrial"
        : segments.avDelay > 0.04
          ? "av"
          : "rest";
  return stages.find((stage) => stage.id === stageId) ?? stages[0];
}

const ATRIAL_BRIDGE: VectorPoint[] = [CONDUCTION_POINTS.sa, [-0.25, 0.86, -0.14], [0.2, 0.77, -0.1], [0.58, 0.52, -0.1]];
const PURKINJE_BRANCHES: VectorPoint[][] = [
  [CONDUCTION_POINTS.rbbEnd, [-0.78, -1.22, 0.25], [-1.0, -0.93, 0.2], [-1.04, -0.48, 0.12]],
  [CONDUCTION_POINTS.rbbEnd, [-0.63, -1.4, 0.12], [-0.85, -1.0, -0.18]],
  [CONDUCTION_POINTS.lafEnd, [0.78, -1.3, 0.15], [0.94, -0.87, 0.15], [0.94, -0.42, 0.06]],
  [CONDUCTION_POINTS.lpfEnd, [0.41, -1.68, -0.1], [0.72, -1.24, -0.32], [0.83, -0.65, -0.3]],
];

const CONDUCTION_COLORS = {
  atrial: "#fef08a",
  avDelay: "#a7f3d0",
  ventricular: "#f472b6",
  septal: "#c4b5fd",
  recovery: "#67e8f9",
} as const;

// 各セグメントの発光ウィンドウ [center-2σ, center+2σ]（伝導パルスの走行位置算出用）。
// nsrTimeline のイベントから一度だけ構築する。
type SegmentWindow = { start: number; end: number };
type SegmentWindows = Partial<Record<ConductionSegmentId, SegmentWindow[]>>;
function buildSegmentWindows(timeline: ActivationTimeline): SegmentWindows {
  const raw: SegmentWindows = {};
  for (const event of timeline.events) {
    const start = event.centerMs - 2 * event.sigmaMs;
    const end = event.centerMs + 2 * event.sigmaMs;
    (raw[event.segment] ??= []).push({ start, end });
  }
  const merged: SegmentWindows = {};
  for (const [segment, segmentWindows] of Object.entries(raw) as [ConductionSegmentId, SegmentWindow[]][]) {
    const sorted = [...segmentWindows].sort((a, b) => a.start - b.start);
    const groups: SegmentWindow[] = [];
    for (const window of sorted) {
      const previous = groups.at(-1);
      if (previous && window.start <= previous.end + 40) previous.end = Math.max(previous.end, window.end);
      else groups.push({ ...window });
    }
    merged[segment] = groups;
  }
  return merged;
}

// phaseMs におけるセグメント内ローカル進行度 0..1（パルスの走行位置）。
function segmentLocalProgress(
  segment: ConductionSegmentId,
  phaseMs: number,
  windows: SegmentWindows
): number {
  const window = windows[segment]?.find((candidate) => phaseMs >= candidate.start && phaseMs <= candidate.end);
  if (!window || window.end <= window.start) return 0;
  return clamp((phaseMs - window.start) / (window.end - window.start), 0, 1);
}

// SVG viewBox 内に y をクランプ（保険。データ駆動スケールでは正常時に発動しない）。
function clampGraphY(y: number): number {
  return clamp(y, 0, GRAPH_HEIGHT);
}

// 選択誘導の投影波形（leadValue = evaluateDipole · leadAxis）を SVG パスにする。
// 全誘導共通の固定 mV スケール（GRAPH_MV_SCALE）を用い、誘導ごと正規化はしない
// （誘導間の相対的な大小・極性を保つため）。
function buildLeadPath(timeline: ActivationTimeline, id: LeadId): string {
  const sampleCount = Math.max(GRAPH_SAMPLE_COUNT, Math.ceil(timeline.cycleMs / 5));
  const samples = sampleLeadCycle(timeline, id, sampleCount);

  return samples
    .map((sample, index) => {
      const ratio = sample.tMs / timeline.cycleMs;
      const x = GRAPH_PADDING_X + ratio * PLOT_WIDTH;
      const y = clampGraphY(GRAPH_BASELINE_Y - sample.mv * GRAPH_MV_SCALE);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function toVector3(point: VectorPoint): THREE.Vector3 {
  return new THREE.Vector3(...point);
}


const conductionVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const conductionFragmentShader = `
  uniform float uProgress;
  uniform float uActive;
  uniform float uUniform; // 1 = 方向なし均一グロー（再分極）、0 = 前進パルス（脱分極）
  uniform float uGlow;    // 均一グロー時の明るさ 0..1（ventRepol 包絡）
  uniform vec3 uColor;
  varying vec2 vUv;

  void main() {
    vec3 baseColor = vec3(0.33, 0.47, 0.52);
    float baseAlpha = 0.65;
    // 脱分極：位置 uProgress を先頭に前進する光（後方テール）。
    float distanceToPulse = abs(vUv.x - uProgress);
    float pulse = (1.0 - smoothstep(0.0, 0.075, distanceToPulse));
    float tailDiff = uProgress - vUv.x; // 常に後方（前進）テール。逆走は廃止。
    float tailMask = step(0.0, tailDiff);
    float tail = (1.0 - smoothstep(0.0, 0.34, tailDiff)) * tailMask;
    float pulseIntensity = (pulse + tail * 0.55) * uActive;
    // 再分極：チューブ全体が方向を持たず均一に光る（uGlow で明滅）。
    float intensity = mix(pulseIntensity, uGlow, uUniform);
    vec3 finalColor = mix(baseColor, uColor, intensity);
    float finalAlpha = max(baseAlpha, intensity);

    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`;

function ConductionPathway({
  points,
  color,
  pulseProgress,
  active,
  glowMode = "pulse",
  glow = 0,
  radius = 0.018,
}: {
  points: VectorPoint[];
  color: string;
  pulseProgress: number;
  active: boolean;
  glowMode?: "pulse" | "uniform";
  glow?: number;
  radius?: number;
}) {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      points.map(toVector3),
      false,
      "catmullrom",
      0.5
    );

    return new THREE.TubeGeometry(curve, 144, radius, 10, false);
  }, [points, radius]);
  const uniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uActive: { value: 0 },
      uUniform: { value: 0 },
      uGlow: { value: 0 },
      uColor: { value: new THREE.Color(color) },
    }),
    [color]
  );

  useFrame(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uProgress.value = clamp(pulseProgress, 0, 1);
    materialRef.current.uniforms.uActive.value = active ? 1 : 0;
    materialRef.current.uniforms.uUniform.value = glowMode === "uniform" ? 1 : 0;
    materialRef.current.uniforms.uGlow.value = active ? clamp(glow, 0, 1) : 0;
    materialRef.current.uniforms.uColor.value.set(color);
  });

  return (
    <mesh geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={conductionVertexShader}
        fragmentShader={conductionFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function NodeMarker({
  position,
  label,
  color,
  showLabel = true,
  labelOffset = [0.18, 0.12, 0.02],
  intensity = 0,
}: {
  position: VectorPoint;
  label: string;
  color: string;
  showLabel?: boolean;
  labelOffset?: VectorPoint;
  intensity?: number;
}) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.06, 24, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4 + intensity * 2.2} />
      </mesh>
      <mesh scale={[2.6, 2.6, 2.6]}>
        <sphereGeometry args={[0.06, 24, 24]} />
        <meshBasicMaterial color={color} opacity={0.08 + intensity * 0.26} transparent depthWrite={false} />
      </mesh>
      {showLabel ? <AnatomyLabel position={labelOffset} color={color}>{label}</AnatomyLabel> : null}
    </group>
  );
}

function TerminalGlow({
  active,
  color,
  intensity,
}: {
  active: boolean;
  color: string;
  intensity: number;
}) {
  if (!active) return null;
  const terminalPoints = [
    CONDUCTION_POINTS.rbbEnd,
    CONDUCTION_POINTS.lafEnd,
    CONDUCTION_POINTS.lpfEnd,
    CONDUCTION_POINTS.purkinjeApex,
  ];
  const opacity = active ? 0.34 * intensity : 0;
  const haloOpacity = active ? 0.12 * intensity : 0;

  return (
    <>
      {terminalPoints.map((point, index) => (
        <group key={`${point.join(",")}-${index}`} position={point}>
          <mesh>
            <sphereGeometry args={[0.052, 18, 18]} />
            <meshBasicMaterial color={color} opacity={opacity} transparent depthWrite={false} />
          </mesh>
          <mesh scale={[3.8, 3.8, 3.8]}>
            <sphereGeometry args={[0.052, 18, 18]} />
            <meshBasicMaterial
              color={color}
              opacity={haloOpacity}
              depthWrite={false}
              transparent
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

function LeadCameraController({ selectedLead, frontView, resetId }: { selectedLead: LeadId; frontView: boolean; resetId: number }) {
  const { camera, invalidate } = useThree();
  const viewLead = frontView ? "II" : selectedLead;
  // Reposition only on an explicit view change. Continuous lerping fights OrbitControls.
  useEffect(() => {
    camera.position.set(...(frontView ? [0, -0.15, 5.6] as VectorPoint : leadCameraPosition(viewLead, SCENE_TARGET)));
    camera.lookAt(new THREE.Vector3(...SCENE_TARGET));
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate, viewLead, frontView, resetId]);
  return null;
}

function HeartVectorScene({
  phaseMs,
  timeline,
  scenarioId,
  selectedLead,
  showLabels,
  showAnatomy,
  frontView,
  resetId,
  wpwVariant,
}: {
  phaseMs: number;
  timeline: ActivationTimeline;
  scenarioId: ConductionScenarioId;
  selectedLead: LeadId;
  showLabels: boolean;
  showAnatomy: boolean;
  frontView: boolean;
  resetId: number;
  wpwVariant: WpwVariantDefinition;
}) {
  const segments = evaluateSegments(timeline, phaseMs);
  const independentVentricularEscape = scenarioId === "avBlock3";
  const rightBundleBlock = scenarioId === "rbbb";
  const leftBundleBlock = scenarioId === "lbbb";
  const preexcitation = scenarioId === "wpw";
  const segmentWindows = useMemo(() => buildSegmentWindows(timeline), [timeline]);

  const accessoryApproachGlow = segments.accessoryAtrialApproach;
  const accessoryBridgeGlow = segments.accessoryPathway;
  const accessoryVentricularGlow = segments.accessoryVentricularSpread;
  const normalVentricularGlow = segments.septalPurkinje;
  const leftVentricularGlow = rightBundleBlock
    ? Math.max(segments.septalPurkinje, segments.leftAnterior, segments.leftPosterior)
    : preexcitation
      ? Math.max(wpwVariant.ventricularChamber !== "right" ? accessoryVentricularGlow : 0, normalVentricularGlow)
      : normalVentricularGlow;
  const rightVentricularGlow = rightBundleBlock || leftBundleBlock
    ? segments.rightBundle
    : preexcitation
      ? Math.max(wpwVariant.ventricularChamber !== "left" ? accessoryVentricularGlow : 0, normalVentricularGlow)
      : normalVentricularGlow;
  const qrsGlow = Math.max(leftVentricularGlow, rightVentricularGlow);
  const repolGlow = segments.ventRepol;
  // 心室系の発光スタイル（純関数）。再分極は方向なし均一グロー（逆走なし）。
  const vent = resolveVentricularGlow({ ...segments, septalPurkinje: qrsGlow });
  const isRepol = vent.phase === "repol";

  // 心室系パスウェイ（RBB/LAF/LPF/septalPurkinje）。脱分極時のみ前進パルスを掃引し、
  // 再分極時は経路を消灯し、心室筋の表面だけを発光。His/脚はQRS窓に同期。
  const ventProgress = isRepol
    ? 0
    : segmentLocalProgress("septalPurkinje", phaseMs, segmentWindows);
  const rightProgress = segmentLocalProgress("rightBundle", phaseMs, segmentWindows);
  const leftAnteriorProgress = segmentLocalProgress("leftAnterior", phaseMs, segmentWindows);
  const leftPosteriorProgress = segmentLocalProgress("leftPosterior", phaseMs, segmentWindows);
  const ventActive = vent.active;
  const normalPathActive = preexcitation ? normalVentricularGlow > 0.02 : ventActive;
  const ventGlowMode = vent.mode;
  const ventGlow = vent.intensity; // 再分極: ventRepol 包絡（1心拍1回の穏やかな明滅）
  const ventColor = CONDUCTION_COLORS[vent.ventColorKey];
  const septalColor = CONDUCTION_COLORS[vent.septalColorKey];

  const glowActive = qrsGlow > 0.02 || repolGlow > 0.02;
  const glowColor = isRepol
    ? CONDUCTION_COLORS.recovery
    : CONDUCTION_COLORS.ventricular;
  const glowIntensity = Math.max(qrsGlow, repolGlow);

  return (
    <Canvas
      camera={{ position: [0, -0.18, 4.85], fov: 45 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true }}
      fallback={<p className="p-8 text-sm text-slate-300">心房から心室への興奮を示す立体模式図。3Dを利用できない環境でも、解説と同期波形で各段階を確認できます。</p>}
    >
      <color attach="background" args={["#071321"]} />
      <ambientLight intensity={0.9} />
      <pointLight position={[2, 2.4, 3]} intensity={5.2} color="#67e8f9" />
      <pointLight position={[-2, -1, 2.2]} intensity={2.2} color="#fb7185" />

      <LeadCameraController selectedLead={selectedLead} frontView={frontView} resetId={resetId} />
      {showAnatomy ? <AnatomicalHeart
        atrialGlow={segments.saAtrial}
        ventricularGlow={glowIntensity}
        rightVentricularGlow={isRepol ? repolGlow : rightVentricularGlow}
        leftVentricularGlow={isRepol ? repolGlow : leftVentricularGlow}
        recovery={isRepol}
        showLabels={showLabels}
        visible={true}
      /> : null}
      <ConductionPathway points={ATRIAL_BRIDGE} color={CONDUCTION_COLORS.atrial}
        pulseProgress={segmentLocalProgress("saAtrial", phaseMs, segmentWindows)} active={segments.saAtrial > 0.02} radius={0.014} />
      {preexcitation ? <>
        <ConductionPathway
          points={wpwVariant.paths.atrialApproach}
          color="#fbbf24"
          pulseProgress={segmentLocalProgress("accessoryAtrialApproach", phaseMs, segmentWindows)}
          active={accessoryApproachGlow > 0.02}
          radius={0.018}
        />
        <ConductionPathway
          points={wpwVariant.paths.avBridge}
          color="#67e8f9"
          pulseProgress={segmentLocalProgress("accessoryPathway", phaseMs, segmentWindows)}
          active={accessoryBridgeGlow > 0.02}
          radius={0.026}
        />
        <ConductionPathway
          points={wpwVariant.paths.ventricularSpread}
          color="#67e8f9"
          pulseProgress={segmentLocalProgress("accessoryVentricularSpread", phaseMs, segmentWindows)}
          active={accessoryVentricularGlow > 0.02}
          radius={0.022}
        />
      </> : null}
      <ConductionPathway points={SEGMENT_POINTS.hisBundle} color={ventColor}
        pulseProgress={leftBundleBlock ? rightProgress : ventProgress} active={!independentVentricularEscape && !isRepol && (rightBundleBlock ? leftVentricularGlow > 0.02 : leftBundleBlock ? rightVentricularGlow > 0.02 : normalPathActive)} radius={0.023} />
      {PURKINJE_BRANCHES.map((points, index) => <ConductionPathway key={index} points={points} color={ventColor}
        pulseProgress={leftBundleBlock
          ? clamp((rightProgress - 0.2) / 0.8, 0, 1)
          : rightBundleBlock
          ? clamp(((index < 2 ? rightProgress : Math.max(leftAnteriorProgress, leftPosteriorProgress)) - 0.2) / 0.8, 0, 1)
          : clamp((ventProgress - 0.35) / 0.65, 0, 1)}
        active={!independentVentricularEscape && !isRepol && (leftBundleBlock
          ? index < 2 && rightVentricularGlow > 0.02
          : rightBundleBlock
          ? index >= 2 && leftVentricularGlow > 0.02
          : normalPathActive)} radius={0.012} />)}

      <ConductionPathway
        points={SEGMENT_POINTS.saAtrial}
        color={CONDUCTION_COLORS.atrial}
        pulseProgress={segmentLocalProgress("saAtrial", phaseMs, segmentWindows)}
        active={segments.saAtrial > 0.02}
        radius={0.016}
      />
      <ConductionPathway
        points={SEGMENT_POINTS.avDelay}
        color={CONDUCTION_COLORS.avDelay}
        pulseProgress={segmentLocalProgress("avDelay", phaseMs, segmentWindows)}
        active={segments.avDelay > 0.02}
        radius={0.018}
      />
      <ConductionPathway
        points={SEGMENT_POINTS.rightBundle}
        color={ventColor}
        pulseProgress={rightBundleBlock || leftBundleBlock ? rightProgress : ventProgress}
        active={!rightBundleBlock && !independentVentricularEscape && !isRepol && (leftBundleBlock ? segments.rightBundle > 0.02 : normalPathActive)}
        glowMode={ventGlowMode}
        glow={ventGlow}
        radius={0.018}
      />
      <ConductionPathway
        points={SEGMENT_POINTS.leftAnterior}
        color={ventColor}
        pulseProgress={rightBundleBlock ? leftAnteriorProgress : ventProgress}
        active={!leftBundleBlock && !independentVentricularEscape && !isRepol && (rightBundleBlock ? segments.leftAnterior > 0.02 : normalPathActive)}
        glowMode={ventGlowMode}
        glow={ventGlow}
        radius={0.019}
      />
      <ConductionPathway
        points={SEGMENT_POINTS.leftPosterior}
        color={ventColor}
        pulseProgress={rightBundleBlock ? leftPosteriorProgress : ventProgress}
        active={!leftBundleBlock && !independentVentricularEscape && !isRepol && (rightBundleBlock ? segments.leftPosterior > 0.02 : normalPathActive)}
        glowMode={ventGlowMode}
        glow={ventGlow}
        radius={0.019}
      />
      <ConductionPathway
        points={SEGMENT_POINTS.septalPurkinje}
        color={septalColor}
        pulseProgress={ventProgress}
        active={!leftBundleBlock && !independentVentricularEscape && !isRepol && (rightBundleBlock ? segments.septalPurkinje > 0.02 : normalPathActive)}
        glowMode={ventGlowMode}
        glow={ventGlow}
        radius={0.015}
      />
      <TerminalGlow
        active={!rightBundleBlock && !leftBundleBlock && !preexcitation && !isRepol && glowActive}
        color={glowColor}
        intensity={glowIntensity}
      />

      <NodeMarker
        position={CONDUCTION_POINTS.sa}
        label="洞結節 · SA"
        intensity={segments.saAtrial}
        color={CONDUCTION_COLORS.atrial}
        showLabel={showLabels}
        labelOffset={[0.0, 0.32, 0.25]}
      />
      <NodeMarker
        position={CONDUCTION_POINTS.av}
        label="房室結節 · AV"
        intensity={segments.avDelay}
        color="#a7f3d0"
        showLabel={showLabels}
        labelOffset={[-0.63, 0.04, 0.45]}
      />
      <NodeMarker
        position={CONDUCTION_POINTS.his}
        label="His束"
        intensity={independentVentricularEscape ? 0 : leftBundleBlock ? rightVentricularGlow : preexcitation ? normalVentricularGlow : qrsGlow}
        color="#f0abfc"
        showLabel={showLabels}
        labelOffset={[0.60, 0.09, 0.55]}
      />
      {independentVentricularEscape ? <NodeMarker
        position={CONDUCTION_POINTS.purkinjeApex}
        label="心室補充刺激"
        intensity={qrsGlow}
        color={CONDUCTION_COLORS.ventricular}
        showLabel={showLabels}
        labelOffset={[0.32, -0.08, 0.48]}
      /> : null}
      {rightBundleBlock ? <NodeMarker
        position={CONDUCTION_POINTS.rbbEnd}
        label="右室終末興奮 · 遅延"
        intensity={segments.rightBundle}
        color={CONDUCTION_COLORS.ventricular}
        showLabel={showLabels}
        labelOffset={[-0.52, -0.04, 0.48]}
      /> : null}
      {leftBundleBlock ? <NodeMarker
        position={[0.67, -1.12, 0.23]}
        label="左室終末興奮 · 遅延"
        intensity={leftVentricularGlow}
        color={CONDUCTION_COLORS.ventricular}
        showLabel={showLabels}
        labelOffset={[-0.04, -0.08, 0.45]}
      /> : null}
      {preexcitation ? <>
        <NodeMarker
          position={wpwVariant.atrialInsertion}
          label={wpwVariant.atrialInsertionLabel}
          intensity={Math.max(accessoryApproachGlow, accessoryBridgeGlow)}
          color="#fbbf24"
          showLabel={showLabels}
          labelOffset={wpwVariant.labelOffsets.atrialInsertion}
        />
        <NodeMarker
          position={wpwVariant.ventricularInsertion}
          label={wpwVariant.ventricularInsertionLabel}
          intensity={Math.max(accessoryBridgeGlow, accessoryVentricularGlow)}
          color="#67e8f9"
          showLabel={showLabels}
          labelOffset={wpwVariant.labelOffsets.ventricularInsertion}
        />
      </> : null}

      {showLabels ? <>
        <AnatomyLabel position={[-0.72, -0.68, 0.52]} color="#f9a8d4">右脚</AnatomyLabel>
        <AnatomyLabel position={[0.49, -0.55, 0.52]} color="#f9a8d4">左脚</AnatomyLabel>
        <AnatomyLabel position={[0.0, -1.83, 0.32]} color="#f9a8d4">プルキンエ線維</AnatomyLabel>
      </> : null}
      <OrbitControls
        key={`${frontView}-${frontView ? "front" : selectedLead}-${resetId}`}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={3.2}
        maxDistance={6.6}
        target={SCENE_TARGET}
      />
    </Canvas>
  );
}

function EcgRevealGraph({
  phaseMs,
  cycleMs,
  selectedLead,
  scenario,
  stages,
  onSeek,
}: {
  phaseMs: number;
  cycleMs: number;
  selectedLead: LeadId;
  scenario: ConductionScenario;
  stages: ReturnType<typeof buildConductionStages>;
  onSeek: (ratio: number) => void;
}) {
  const clipId = useId();
  // 波形パスは選択誘導が変わった時のみ再生成（毎フレームではない）。
  const wavePath = useMemo(
    () => buildLeadPath(scenario.timeline, selectedLead),
    [scenario.timeline, selectedLead]
  );
  const progressRatio = clamp(cycleMs > 0 ? phaseMs / cycleMs : 0, 0, 1);
  const clipWidth = GRAPH_PADDING_X + PLOT_WIDTH * progressRatio;
  // カーソル用の1回だけの投影（レンダ経路。毎フレームの useFrame 経路ではない）。
  const currentMv = projectLeadValue(scenario.timeline, selectedLead, phaseMs);
  const currentPoint = {
    x: GRAPH_PADDING_X + progressRatio * PLOT_WIDTH,
    y: clampGraphY(GRAPH_BASELINE_Y - currentMv * GRAPH_MV_SCALE),
  };
  const phase = resolveScenarioStage(scenario.id, stages, scenario.timeline, phaseMs);
  const adultThresholdX = GRAPH_PADDING_X + (scenario.fiducials.pOn + 200) / cycleMs * PLOT_WIDTH;
  const qrsThresholdX = GRAPH_PADDING_X + (scenario.fiducials.qrsOn + 120) / cycleMs * PLOT_WIDTH;
  const timeTicks = cycleMs > 1000
    ? Array.from({ length: Math.floor(cycleMs / 1000) + 1 }, (_, index) => index * 1000)
    : [0, 200, 400, 600, 800, 1000];
  const qrsMeasurement = scenario.qrsWindow
    ? {
        ...scenario.qrsWindow,
        startX: GRAPH_PADDING_X + scenario.qrsWindow.startMs / cycleMs * PLOT_WIDTH,
        endX: GRAPH_PADDING_X + scenario.qrsWindow.endMs / cycleMs * PLOT_WIDTH,
      }
    : null;

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-[#08111f]">
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 text-emerald-300">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400/70">
            Lead {selectedLead}
          </div>
          <h2 className="text-sm font-semibold md:text-base">
            {scenario.label}と興奮のタイミング
          </h2>
        </div>
        <div className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 font-mono text-xs">
          {phase.label}
        </div>
      </div>

      <div className="min-h-0 flex-1 px-3 pb-2 pt-3 md:px-5">
        <svg
          aria-label="波形から心周期の時刻を選択"
          aria-valuemin={0}
          aria-valuemax={cycleMs - 1}
          aria-valuenow={Math.min(cycleMs - 1, Math.round(phaseMs))}
          aria-valuetext={`${Math.round(phaseMs)}ミリ秒、${phase.label}`}
          tabIndex={0}
          className="block h-full w-full cursor-crosshair touch-pan-y focus-visible:outline-2 focus-visible:outline-cyan-300"
          viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
          preserveAspectRatio="none"
          role="slider"
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0) return;
            event.currentTarget.focus();
            event.currentTarget.setPointerCapture(event.pointerId);
            const rect = event.currentTarget.getBoundingClientRect();
            onSeek(waveformSeekRatio(event.clientX - rect.left, rect.width, GRAPH_WIDTH, GRAPH_PADDING_X, cycleMs));
          }}
          onPointerMove={(event) => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
            const rect = event.currentTarget.getBoundingClientRect();
            onSeek(waveformSeekRatio(event.clientX - rect.left, rect.width, GRAPH_WIDTH, GRAPH_PADDING_X, cycleMs));
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onKeyDown={(event) => {
            const step = event.shiftKey ? 40 : 5;
            let next: number;
            if (event.key === "ArrowRight" || event.key === "ArrowUp") next = phaseMs + step;
            else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = phaseMs - step;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = cycleMs - 1;
            else return;
            event.preventDefault();
            onSeek(Math.max(0, Math.min(cycleMs - 1, next)) / cycleMs);
          }}
        >
          <defs>
            <pattern
              id={`${clipId}-minor-grid`}
              width="30"
              height="30"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 30 0 L 0 0 0 30"
                fill="none"
                stroke="#164e63"
                strokeOpacity="0.32"
                strokeWidth="1"
              />
            </pattern>
            <pattern
              id={`${clipId}-major-grid`}
              width="150"
              height="150"
              patternUnits="userSpaceOnUse"
            >
              <rect
                width="150"
                height="150"
                fill={`url(#${clipId}-minor-grid)`}
              />
              <path
                d="M 150 0 L 0 0 0 150"
                fill="none"
                stroke="#22d3ee"
                strokeOpacity="0.18"
                strokeWidth="2"
              />
            </pattern>
            <clipPath id={`${clipId}-reveal`}>
              <rect x="0" y="0" width={clipWidth} height={GRAPH_HEIGHT} />
            </clipPath>
          </defs>

          <rect width={GRAPH_WIDTH} height={GRAPH_HEIGHT} fill="#08111f" />
          <rect
            width={GRAPH_WIDTH}
            height={GRAPH_HEIGHT}
            fill={`url(#${clipId}-major-grid)`}
          />
          {stages.filter((stage) => {
            if (stage.id === "rest") return false;
            if (scenario.id === "avBlock3") return stage.id === "atrial" || stage.id === "qrs";
            return scenario.timeline.cycleMs <= 1000 || ["atrial", "av", "qrs"].includes(stage.id);
          }).map((stage) => {
            const start = GRAPH_PADDING_X + stage.startMs / cycleMs * PLOT_WIDTH;
            const end = GRAPH_PADDING_X + stage.endMs / cycleMs * PLOT_WIDTH;
            return <g key={`${stage.id}-${stage.startMs}`}>
              <rect x={start} y="0" width={end - start} height={GRAPH_HEIGHT} fill={stage.color} opacity={phase.id === stage.id ? 0.10 : 0.025} />
              <text x={(start + end) / 2} y={scenario.id === "avBlock3" && stage.id === "qrs" ? "42" : "22"} textAnchor="middle" fill={stage.color} fontSize={scenario.id === "avBlock3" ? "14" : "17"}>{{ atrial: "P", av: "PR", qrs: "QRS", st: "ST", repol: "T", rest: "" }[stage.id]}</text>
            </g>;
          })}
          {scenario.prWindows.map((window, index) => {
            const startX = GRAPH_PADDING_X + window.startMs / cycleMs * PLOT_WIDTH;
            const endMs = window.endMs ?? Math.min(cycleMs, Math.floor(window.startMs / 1000) * 1000 + 880);
            const endX = GRAPH_PADDING_X + endMs / cycleMs * PLOT_WIDTH;
            const color = window.dropped ? "#fb7185" : scenario.accent;
            return <g key={`${window.startMs}-${window.label}`} aria-label={window.label}>
              <line x1={startX} x2={endX} y1="48" y2="48" stroke={color} strokeWidth="3" strokeDasharray={window.dropped ? "7 5" : undefined} />
              <line x1={startX} x2={startX} y1="40" y2="57" stroke={color} strokeWidth="3" />
              {window.dropped ? <g>
                <line x1={endX - 6} x2={endX + 6} y1="40" y2="56" stroke={color} strokeWidth="3" />
                <line x1={endX + 6} x2={endX - 6} y1="40" y2="56" stroke={color} strokeWidth="3" />
              </g> : <line x1={endX} x2={endX} y1="40" y2="57" stroke={color} strokeWidth="3" />}
              <rect x={(startX + endX) / 2 - 55} y={index % 2 === 0 ? 56 : 82} width="110" height="24" rx="7" fill="#08111f" opacity="0.92" />
              <text x={(startX + endX) / 2} y={index % 2 === 0 ? 73 : 99} textAnchor="middle" fill={color} fontSize={cycleMs > 1000 ? "13" : "16"} fontWeight="700">{window.label}</text>
            </g>;
          })}
          {scenario.deltaWindow ? <g aria-label={scenario.deltaWindow.label}>
            <rect
              x={GRAPH_PADDING_X + scenario.deltaWindow.startMs / cycleMs * PLOT_WIDTH}
              y="0"
              width={(scenario.deltaWindow.endMs - scenario.deltaWindow.startMs) / cycleMs * PLOT_WIDTH}
              height={GRAPH_HEIGHT}
              fill="#67e8f9"
              opacity="0.065"
            />
            <text
              x={GRAPH_PADDING_X + (scenario.deltaWindow.startMs + scenario.deltaWindow.endMs) / (2 * cycleMs) * PLOT_WIDTH}
              y="115"
              textAnchor="middle"
              fill="#67e8f9"
              fontSize="16"
              fontWeight="700"
            >δ波</text>
          </g> : null}
          {qrsMeasurement ? <g aria-label={qrsMeasurement.label}>
            <line x1={qrsMeasurement.startX} x2={qrsMeasurement.endX} y1="48" y2="48" stroke={scenario.accent} strokeWidth="3" />
            <line x1={qrsMeasurement.startX} x2={qrsMeasurement.startX} y1="40" y2="57" stroke={scenario.accent} strokeWidth="3" />
            <line x1={qrsMeasurement.endX} x2={qrsMeasurement.endX} y1="40" y2="57" stroke={scenario.accent} strokeWidth="3" />
            <rect x={(qrsMeasurement.startX + qrsMeasurement.endX) / 2 - 58} y="57" width="116" height="24" rx="7" fill="#08111f" opacity="0.92" />
            <text x={(qrsMeasurement.startX + qrsMeasurement.endX) / 2} y="74" textAnchor="middle" fill={scenario.accent} fontSize="15" fontWeight="700">{qrsMeasurement.label}</text>
          </g> : null}
          {scenario.id === "avBlock1" ? <g>
            <line x1={adultThresholdX} x2={adultThresholdX} y1="84" y2={GRAPH_HEIGHT - 32} stroke="#fbbf24" strokeDasharray="6 6" opacity="0.5" />
            <text x={adultThresholdX + 7} y="102" fill="#fde68a" fontSize="14">200 msの目安</text>
          </g> : null}
          {scenario.id === "rbbb" || scenario.id === "lbbb" ? <g>
            <line x1={qrsThresholdX} x2={qrsThresholdX} y1="84" y2={GRAPH_HEIGHT - 32} stroke="#fb7185" strokeDasharray="6 6" opacity="0.55" />
            <text x={qrsThresholdX + 7} y="102" fill="#fda4af" fontSize="14">120 ms</text>
          </g> : null}
          {timeTicks.map((ms) => <text key={ms} x={GRAPH_PADDING_X + ms / cycleMs * PLOT_WIDTH} y={GRAPH_HEIGHT - 6} textAnchor="middle" fill="#94a3b8" fontSize="15">{ms}</text>)}
          <line x1={currentPoint.x} x2={currentPoint.x} y1="28" y2={GRAPH_HEIGHT - 26} stroke={phase.color} strokeDasharray="4 5" opacity="0.6" />
          <line
            x1={GRAPH_PADDING_X}
            x2={GRAPH_WIDTH - GRAPH_PADDING_X}
            y1={GRAPH_BASELINE_Y}
            y2={GRAPH_BASELINE_Y}
            stroke="#94a3b8"
            strokeOpacity="0.3"
            strokeWidth="2"
          />
          <path
            d={wavePath}
            fill="none"
            stroke="#537d78"
            strokeOpacity="0.65"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={wavePath}
            fill="none"
            stroke="#34d399"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            clipPath={`url(#${clipId}-reveal)`}
          />
          <circle
            cx={currentPoint.x}
            cy={currentPoint.y}
            r="8"
            fill={phase.color}
            stroke={phase.color}
            strokeWidth="4"
          />
        </svg>
      </div>
      <p className="px-5 pb-3 text-[10px] text-slate-400">波形をタップ／ドラッグすると3Dも同じ時点で停止。左右キー：5 ms、Shift併用：40 ms。横軸：ms · 縦軸：相対電位</p>
    </div>
  );
}

const NSR_BPM = 60_000 / nsrTimeline.cycleMs;

export function VectorVisualizer() {
  const [speed, setSpeed] = useState(0.25);
  const { phaseMs, cycleMs, mode, play, pause, scrubTo, setBpm } = useCardiacClock({
    bpm: NSR_BPM, cycleMs: nsrTimeline.cycleMs, autoPlay: false, playbackRate: speed,
  });
  const [scenarioId, setScenarioId] = useState<ConductionScenarioId>("normal");
  const [wpwVariantId, setWpwVariantId] = useState<WpwVariantId>(DEFAULT_WPW_VARIANT_ID);
  const [selectedLead, setSelectedLead] = useState<LeadId>("II");
  const [showLabels, setShowLabels] = useState(true);
  const [showAnatomy, setShowAnatomy] = useState(true);
  const [frontView, setFrontView] = useState(true);
  const [resetId, setResetId] = useState(0);
  const wpwVariant: WpwVariantDefinition = WPW_VARIANTS[wpwVariantId];
  const activeWpwScenario = buildWpwScenario(wpwVariant);
  const baseScenario = CONDUCTION_SCENARIOS[scenarioId];
  const scenario: ConductionScenario = scenarioId === "wpw"
    ? {
        ...baseScenario,
        shortLabel: wpwVariant.label.replace("（模式例）", ""),
        timeline: wpwVariant.timeline,
        fiducials: wpwVariant.fiducials,
        mechanism: `${wpwVariant.anatomy}。その後、通常経路からの興奮と合流します。`,
        checkpoints: activeWpwScenario.checkpoints,
      }
    : baseScenario;
  const stages = scenarioId === "wpw" ? activeWpwScenario.stages : SCENARIO_STAGES[scenarioId];
  const phase = resolveScenarioStage(scenarioId, stages, scenario.timeline, phaseMs, wpwVariant);
  const isBundleBlock = scenarioId === "rbbb" || scenarioId === "lbbb";
  const isPreexcitation = scenarioId === "wpw";
  const isPlaying = mode === "playing";
  const currentMv = projectLeadValue(scenario.timeline, selectedLead, phaseMs);
  const handleLeadSelect = (lead: LeadId) => {
    setSelectedLead(lead);
    setFrontView(false);
    // Re-selecting a lead also restores its view after a free rotation.
    setResetId((id) => id + 1);
  };
  const handleScenarioSelect = (id: ConductionScenarioId) => {
    const timeline = id === "wpw" ? wpwVariant.timeline : CONDUCTION_SCENARIOS[id].timeline;
    setBpm(60_000 / timeline.cycleMs);
    setScenarioId(id);
    scrubTo(0);
    play();
  };
  const handleWpwVariantSelect = (id: WpwVariantId) => {
    const variant = WPW_VARIANTS[id];
    setWpwVariantId(id);
    setBpm(60_000 / variant.timeline.cycleMs);
    scrubTo(0);
    play();
  };
  const controlClass = "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-700 px-2.5 text-xs text-slate-200 transition hover:border-slate-400 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-cyan-300";
  const beatIndex = Math.min(3, Math.floor(phaseMs / 1000));
  let mapCallout: string | null = null;
  if (phase.id === "av") {
    if (scenario.id === "wpw") mapCallout = phaseMs < 165
      ? `${wpwVariant.atrialChamber === "left" ? "左房" : "右房"}筋から副伝導路の心房側入口へ`
      : `房室輪を越えて${wpwVentricularRegionLabel(wpwVariant)}側出口へ`;
    if (scenario.id === "avBlock1") mapCallout = "房室伝導の待ち時間が長い";
    if (scenario.id === "wenckebach") mapCallout = beatIndex === 3
      ? "P波は出るが、心室へ伝わらない"
      : `${beatIndex + 1}拍目 · 房室伝導がさらに遅れる`;
    if (scenario.id === "mobitz2") mapCallout = beatIndex === 3
      ? "同じPR間隔のあと、突然伝わらない"
      : `${beatIndex + 1}拍目 · PR間隔は一定`;
    if (scenario.id === "avBlock3") mapCallout = "P波は出るが、心室へ伝わらない";
  }
  if (scenario.id === "avBlock3" && phase.id === "qrs") mapCallout = "心室の補充刺激が独立して発生";
  if (scenario.id === "rbbb" && phase.id === "qrs") mapCallout = phaseMs < 400
    ? "左脚系から左室側が先に興奮"
    : "右室側の終末興奮が遅れる";
  if (scenario.id === "lbbb" && phase.id === "qrs") mapCallout = phaseMs < 345
    ? "右脚系から右室側が先に興奮"
    : "左室側の終末興奮が遅れる";
  if (isPreexcitation && phase.id === "qrs") mapCallout = phaseMs < 265
    ? phaseMs < 190
      ? "副伝導路が房室輪をまたぐ"
      : `${wpwVentricularRegionLabel(wpwVariant)}側出口から心室筋へ広がる · δ波`
    : "通常経路からの興奮が合流";

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-[#080f1b] text-slate-100">
      <div className="mx-auto max-w-[1600px] p-3 md:p-5">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.24em] text-cyan-400">CARDIAC CONDUCTION</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">心臓の電気を、1拍ずつ見る。</h2>
            <p className="mt-1 text-xs text-slate-400">興奮の広がりと心電図を、同じ時間軸で観察します。</p>
          </div>
          <div className="rounded-full border px-3 py-1.5 text-xs" style={{ borderColor: `${scenario.accent}44`, backgroundColor: `${scenario.accent}0d`, color: scenario.accent }}>{scenario.label} · {scenario.rateLabel} · {scenario.cycleLabel}</div>
        </header>

        <section aria-label="伝導パターンを比較" className="mb-4 rounded-2xl border border-slate-700/70 bg-slate-900/55 p-3 md:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">伝導パターンを比べる</h3>
              <p className="mt-1 text-xs text-slate-400">プリセットを切り替え、P波・QRSと3Dの興奮順序を比べます。</p>
            </div>
            <div className="text-[11px] text-slate-400">{isPreexcitation ? "見る順序：PR間隔 → QRSの始まり（δ波） → QRS全体" : isBundleBlock ? "見る順序：QRS幅 → V1の終末部 → I・V6の終末部" : "見る順序：P波の規則性 → QRSの規則性 → P波とQRSの対応"}</div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4" role="group" aria-label="伝導パターン">
            {(Object.values(CONDUCTION_SCENARIOS) as ConductionScenario[]).map((item) => {
              const selected = item.id === scenarioId;
              return <button key={item.id} type="button" aria-pressed={selected} onClick={() => handleScenarioSelect(item.id)} className="rounded-xl border p-3 text-left transition hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-cyan-300" style={{ borderColor: selected ? item.accent : "#334155", backgroundColor: selected ? `${item.accent}12` : "transparent" }}>
                <span className="flex items-center justify-between gap-2"><span className="text-sm font-semibold" style={{ color: selected ? item.accent : "#e2e8f0" }}>{item.label}</span><span className="rounded-full border border-current px-2 py-0.5 text-[10px]" style={{ color: item.accent }}>{item.shortLabel}</span></span>
                <span className="mt-2 block text-base font-semibold text-white">{item.finding}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-400">{item.observation}</span>
              </button>;
            })}
          </div>
          {isPreexcitation ? <div className="mt-3 rounded-xl border border-cyan-300/25 bg-cyan-300/[0.06] p-3 text-xs">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="副伝導路の位置">
              <span className="mr-1 font-semibold text-cyan-100">副伝導路の位置</span>
              {(Object.values(WPW_VARIANTS) as WpwVariantDefinition[]).map((variant) => <button
                key={variant.id}
                type="button"
                aria-pressed={variant.id === wpwVariantId}
                onClick={() => handleWpwVariantSelect(variant.id as WpwVariantId)}
                className="rounded-full border px-2.5 py-1 font-semibold transition hover:bg-cyan-300/10 focus-visible:outline-2 focus-visible:outline-cyan-300"
                style={{ borderColor: variant.id === wpwVariantId ? "#67e8f9" : "#475569", color: variant.id === wpwVariantId ? "#a5f3fc" : "#cbd5e1" }}
              >{variant.label}</button>)}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1"><span className="text-slate-200">{wpwVariant.anatomy}</span><span className="text-cyan-200">{wpwVariant.localizationHint}</span></div>
            <p className="mt-1.5 text-slate-400">位置推定は複数誘導と融合の程度で変わります。この波形は違いを学ぶ模式例です。</p>
          </div> : null}
        </section>

        <section aria-label="伝導マップ再生コントロール" className="mb-4 rounded-2xl border border-slate-700/70 bg-slate-900/70 p-3 md:px-4 md:py-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => isPlaying ? pause() : play()} aria-pressed={isPlaying} className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-white">{isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}{isPlaying ? "一時停止" : "再生する"}</button>
              <button type="button" className={controlClass} onClick={() => scrubTo(0)}><RotateCcw className="size-3.5" />最初へ</button>
              <div className="flex gap-1" role="group" aria-label="再生速度">
                {[0.1, 0.25, 0.5, 1].map((rate) => <button key={rate} type="button" className={controlClass} aria-pressed={speed === rate} onClick={() => setSpeed(rate)} style={speed === rate ? { borderColor: "#67e8f9", color: "#67e8f9" } : undefined}>{rate}×</button>)}
              </div>
            </div>
            <span className="font-mono text-xs text-slate-400">{Math.round(phaseMs)} / {cycleMs} ms <span className="ml-2 text-slate-500">再生速度は心拍数を変えません</span></span>
          </div>
          <input type="range" min="0" max={cycleMs - 1} step="1" value={Math.round(phaseMs)} onChange={(event) => scrubTo(Number(event.target.value) / cycleMs)} aria-label="心周期の時刻" aria-valuetext={`${Math.round(phaseMs)}ミリ秒、${phase.label}`} className="block h-5 w-full cursor-pointer accent-cyan-300" />
          <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-500"><span>0 ms</span><span>{Math.round(cycleMs * 0.25)}</span><span>{Math.round(cycleMs * 0.5)}</span><span>{Math.round(cycleMs * 0.75)}</span><span>{cycleMs.toLocaleString()} ms</span></div>
        </section>


        <section aria-label="12誘導の波形と3D視点" className="mb-4 rounded-xl border border-slate-800 px-4 py-3 text-xs text-slate-400">
          <h3 className="font-medium text-slate-200">12誘導 · 選択すると波形と3D視点が切り替わります</h3>
          <div role="group" aria-label="波形と3D視点を切り替える誘導" className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-12">{LEADS.map((lead) => <button key={lead} type="button" className={controlClass} aria-pressed={selectedLead === lead} onClick={() => handleLeadSelect(lead)} style={lead === selectedLead ? { borderColor: "#67e8f9", color: "#67e8f9" } : undefined}>{lead}</button>)}</div>
          <p className="mt-3 leading-5">波形は簡略化した双極子の投影です。胸部誘導は近似で、実際の12誘導心電図や診断基準を再現するものではありません。</p>
        </section>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.18fr)_minmax(360px,1fr)]">
          <section aria-label="刺激伝導マップ" className="overflow-hidden rounded-2xl border border-slate-700/70 bg-[#071321]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium"><Layers3 className="size-4 text-cyan-300" />刺激伝導マップ</div>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" className={controlClass} aria-pressed={showLabels} onClick={() => setShowLabels(!showLabels)}>{showLabels ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}ラベル</button>
                <button type="button" className={controlClass} aria-pressed={showAnatomy} onClick={() => setShowAnatomy(!showAnatomy)}>心臓の外形</button>
                <button type="button" className={controlClass} onClick={() => { setFrontView(true); setResetId((id) => id + 1); }}><RotateCcw className="size-3.5" />正面に戻す</button>
              </div>
            </div>
            <div className="relative h-[380px] sm:h-[440px] lg:h-[470px]">
              <HeartVectorScene phaseMs={phaseMs} timeline={scenario.timeline} scenarioId={scenario.id} selectedLead={selectedLead} showLabels={showLabels} showAnatomy={showAnatomy} frontView={frontView} resetId={resetId} wpwVariant={wpwVariant} />
              <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-slate-950/75 px-2.5 py-1 text-[11px] text-slate-300">基準視点：{frontView ? "正面" : `Lead ${selectedLead}`}</div>
              <div className="pointer-events-none absolute left-3 top-3 rounded-full border px-2.5 py-1 text-[11px]" style={{ color: phase.color, borderColor: `${phase.color}44`, backgroundColor: "#071321cc" }}>{phase.label} · {Math.round(phaseMs)} ms</div>
              {mapCallout ? <div className="pointer-events-none absolute bottom-3 right-3 max-w-[68%] rounded-lg border px-3 py-2 text-xs font-semibold shadow-lg shadow-slate-950/40 backdrop-blur-sm sm:max-w-[240px]" style={{ color: phase.color, borderColor: `${phase.color}66`, backgroundColor: "#071321e8" }}><span className="mr-2 inline-block size-2 rounded-full align-middle" style={{ backgroundColor: phase.color }} />{mapCallout}</div> : null}
              <div className={`pointer-events-none absolute bottom-3 left-3 items-center gap-1.5 text-[10px] text-slate-400 ${mapCallout ? "hidden sm:flex" : "flex"}`}><MousePointer2 className="size-3" />ドラッグで回転 · スクロール／ピンチで拡大</div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-white/10 px-4 py-3 text-[11px] text-slate-300">
              {(["atrial", "av", "qrs", "repol"] as const).map((stageId) => stages.find((item) => item.id === stageId)).filter((stage) => stage !== undefined).map((stage) => <span key={stage.id} className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: stage.color }} />{{ atrial: "心房の興奮", av: scenario.id === "avBlock3" ? "房室伝導の途絶" : "房室伝導の待ち時間", qrs: "心室の興奮", repol: "心室の回復", rest: "基線", st: "ST部分" }[stage.id]}</span>)}
              {isPreexcitation ? <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-cyan-300" />副伝導路からの早期興奮</span> : null}
            </div>
          </section>

          <div className="flex min-w-0 flex-col gap-4">
            <section aria-label="同期心電図波形" className="flex h-[260px] overflow-hidden rounded-2xl border border-slate-700/70 sm:h-[280px]">
              <EcgRevealGraph phaseMs={phaseMs} cycleMs={cycleMs} selectedLead={selectedLead} scenario={scenario} stages={stages} onSeek={scrubTo} />
            </section>
            <section aria-label="現在の電気的イベント" className="rounded-2xl border bg-slate-900/60 p-4 md:p-5" style={{ borderColor: `${phase.color}44` }}>
              <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold" style={{ color: phase.color }}>いま起きていること · {phase.label}</span><span className="font-mono text-[11px] text-slate-400">{currentMv.toFixed(3)} mV</span></div>
              <h3 className="mt-2 text-lg font-semibold">{phase.title}</h3>
              <p className="mt-2 min-h-[4.5rem] text-sm leading-6 text-slate-300">{phase.description}</p>
              {phase.id === "av" ? <div className="mt-3 rounded-lg border px-3 py-2 text-xs leading-5" style={{ borderColor: `${scenario.accent}44`, backgroundColor: `${scenario.accent}0d`, color: scenario.checkpoints.length > 0 && Math.floor(phaseMs / 1000) === 3 ? "#fb7185" : scenario.accent }}><strong>{scenario.prWindows.length > 0 ? scenario.prWindows[Math.min(scenario.prWindows.length - 1, Math.floor(phaseMs / 1000))].label : scenario.finding}</strong><span className="ml-2 text-slate-300">{scenario.mechanism}</span></div> : null}
              {phase.id === "qrs" && scenario.qrsWindow ? <div className="mt-3 rounded-lg border px-3 py-2 text-xs leading-5" style={{ borderColor: `${scenario.accent}44`, backgroundColor: `${scenario.accent}0d`, color: scenario.accent }}><strong>{scenario.qrsWindow.label}</strong><span className="ml-2 text-slate-300">{isPreexcitation ? phaseMs < 190 ? "左室側出口で早期興奮が始まる区間です。" : "最初の緩やかな部分がデルタ波です。" : "成人の完全脚ブロックでは120 ms以上が目安です。"}</span></div> : null}
            </section>
            <section aria-label="各段階を選んで観察" className="rounded-2xl border border-slate-700/70 bg-slate-900/40 p-4">
              <h3 className="mb-3 text-xs text-slate-400">各段階を選んで、停止して観察</h3>
              {scenario.checkpoints.length > 0 ? <div className="grid grid-cols-2 gap-2">
                {scenario.checkpoints.map((checkpoint, index) => {
                  const selected = phaseMs >= checkpoint.startMs && phaseMs < checkpoint.endMs;
                  return <button key={checkpoint.label} type="button" aria-pressed={selected} onClick={() => scrubTo(checkpoint.focusMs / cycleMs)} className="flex items-center gap-2 rounded-lg border px-2.5 py-2.5 text-left text-xs transition hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-cyan-300" style={{ borderColor: selected ? checkpoint.color : "#334155", background: selected ? `${checkpoint.color}15` : "transparent" }}><span className="font-mono text-[10px]" style={{ color: checkpoint.color }}>{String(index + 1).padStart(2, "0")}</span>{checkpoint.label}<ChevronRight className="ml-auto size-3 opacity-40" /></button>;
                })}
              </div> : <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-3">
                {stages.map((stage, index) => <button key={stage.id} type="button" aria-pressed={phase.id === stage.id} onClick={() => scrubTo(stage.focusMs / cycleMs)} className="flex items-center gap-2 rounded-lg border px-2.5 py-2.5 text-left text-xs transition hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-cyan-300" style={{ borderColor: phase.id === stage.id ? stage.color : "#334155", background: phase.id === stage.id ? `${stage.color}15` : "transparent" }}><span className="font-mono text-[10px]" style={{ color: stage.color }}>{String(index + 1).padStart(2, "0")}</span>{stage.label}<ChevronRight className="ml-auto size-3 opacity-40" /></button>)}
              </div>}
            </section>
          </div>
        </div>



        <p className="mt-3 px-1 text-[11px] leading-5 text-slate-500">正常洞調律、房室ブロック、脚ブロック、WPWパターンを比べる学習用模式モデルです。WPWパターンは心室早期興奮を示し、頻拍や症状を伴う「WPW症候群」の診断を表すものではありません。副伝導路の3D位置と胸部誘導の形は例示です。臨床診断や虚血の判定には使用できません。 <a className="underline underline-offset-2 hover:text-slate-300" href="https://www.nhlbi.nih.gov/health/heart/heart-beats" target="_blank" rel="noreferrer">参考：NHLBI 心臓の電気的活動</a> · <a className="underline underline-offset-2 hover:text-slate-300" href="https://www.ahajournals.org/doi/10.1161/CIR.0000000000000628" target="_blank" rel="noreferrer">参考：AHA/ACC/HRS 伝導障害ガイドライン</a> · <a className="underline underline-offset-2 hover:text-slate-300" href="https://academic.oup.com/eurheartj/article/41/5/655/5556821" target="_blank" rel="noreferrer">参考：ESC 上室頻拍ガイドライン</a></p>
      </div>
    </main>
  );
}
