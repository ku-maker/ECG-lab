// 波形が枠内に収まることの検証（依存追加なし・node で直接実行）。
//
// graphScale.ts の式（実装と共有）を使い、全12誘導・全位相の y が viewBox の安全域に
// 収まる（＝どの誘導・どの位相でも切れない、クランプ未発動）ことを検証する。
// 閾値を1つでも外したら exit(1)。
//
//   node scripts/verify-graph-fit.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  GRAPH_BASELINE_Y,
  GRAPH_HEIGHT,
  GRAPH_SAMPLE_COUNT,
  GRAPH_VERTICAL_MARGIN,
  computeGraphMvScale,
} from "../src/data/ecg/leads/graphScale.ts";
import { sampleLeadCycle } from "../src/data/ecg/leads/projectLead.ts";
import { LEADS } from "../src/data/ecg/leads/leadAxes.ts";
import { buildNsrTimeline } from "../src/data/ecg/activation/buildTimeline.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const nsr = JSON.parse(
  readFileSync(resolve(__dirname, "../src/data/ecg/templates/nsr-lead2.json"), "utf8")
);
const timeline = buildNsrTimeline(nsr.id, nsr.fiducialsMs, nsr.durationMs);
const scale = computeGraphMvScale(timeline, LEADS);

const checks = [];
const check = (name, pass, detail = "") => checks.push({ name, pass, detail });

// 1. 全誘導・全位相で y が安全域 [margin, HEIGHT-margin] に収まる（切れない・クランプ不要）
let worstTop = Infinity;
let worstBottom = -Infinity;
let offender = "";
for (const lead of LEADS) {
  for (const s of sampleLeadCycle(timeline, lead, GRAPH_SAMPLE_COUNT)) {
    const y = GRAPH_BASELINE_Y - s.mv * scale;
    if (y < worstTop) worstTop = y;
    if (y > worstBottom) worstBottom = y;
    if (y < GRAPH_VERTICAL_MARGIN - 1e-6 || y > GRAPH_HEIGHT - GRAPH_VERTICAL_MARGIN + 1e-6) {
      offender = `${lead}@${s.tMs.toFixed(0)} y=${y.toFixed(1)}`;
    }
  }
}
check(
  "all leads/phases within [margin, H-margin] (never clipped)",
  offender === "",
  offender || `y∈[${worstTop.toFixed(1)}, ${worstBottom.toFixed(1)}] safe=[${GRAPH_VERTICAL_MARGIN}, ${GRAPH_HEIGHT - GRAPH_VERTICAL_MARGIN}]`
);

// 2. すべて viewBox [0, HEIGHT] 内（クランプが不要＝設計上枠内）
check(
  "all y strictly within [0, GRAPH_HEIGHT] (no clamp)",
  worstTop >= 0 && worstBottom <= GRAPH_HEIGHT,
  `y∈[${worstTop.toFixed(1)}, ${worstBottom.toFixed(1)}] box=[0, ${GRAPH_HEIGHT}]`
);

// 3. 共通スケール（誘導ごと正規化していない）：II の R 偏位 > aVR の |R 偏位|
const rOf = (lead) => {
  const F = nsr.fiducialsMs;
  const arr = sampleLeadCycle(timeline, lead, GRAPH_SAMPLE_COUNT);
  // r 時刻に最も近いサンプルの mv
  let best = arr[0], bd = Infinity;
  for (const s of arr) { const d = Math.abs(s.tMs - F.r); if (d < bd) { bd = d; best = s; } }
  return best.mv;
};
check(
  "common scale preserved (|II R| > |aVR R|)",
  Math.abs(rOf("II")) > Math.abs(rOf("aVR")),
  `II=${rOf("II").toFixed(3)} aVR=${rOf("aVR").toFixed(3)}`
);

// 4. 上下マージンをきちんと使えている（波形が過度に潰れていない＝最大偏位が安全域近くまで届く）
const maxDeflection = Math.max(
  GRAPH_BASELINE_Y - worstTop,
  worstBottom - GRAPH_BASELINE_Y
);
const usableHalf = GRAPH_HEIGHT / 2 - GRAPH_VERTICAL_MARGIN;
check(
  "waveform fills the frame (max deflection ~ usable half-height)",
  maxDeflection >= usableHalf - 1e-6 && maxDeflection <= usableHalf + 1e-6,
  `maxDeflection=${maxDeflection.toFixed(1)} usableHalf=${usableHalf.toFixed(1)}`
);

let ok = true;
for (const c of checks) {
  if (!c.pass) ok = false;
  console.log(`  [${c.pass ? "PASS" : "FAIL"}] ${c.name.padEnd(52)} ${c.detail}`);
}
console.log(ok ? "RESULT: PASS" : "RESULT: FAIL");
process.exit(ok ? 0 : 1);
