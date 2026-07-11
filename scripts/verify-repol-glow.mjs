// 再分極（T波）発光の検証（依存追加なし・node で直接実行）。
//
// resolveVentricularGlow（純関数）を、evaluateSegments で作った位相ごとの segments に
// 適用し、「再分極は逆走せず均一グロー」「色分け維持」「穏やかな単一山（反復点滅でない）」を
// 検証する。閾値を1つでも外したら exit(1)。
//
//   node scripts/verify-repol-glow.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { resolveVentricularGlow } from "../src/data/ecg/activation/ventricularGlow.ts";
import { evaluateSegments } from "../src/data/ecg/activation/evaluate.ts";
import { buildNsrTimeline } from "../src/data/ecg/activation/buildTimeline.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const nsr = JSON.parse(
  readFileSync(resolve(__dirname, "../src/data/ecg/templates/nsr-lead2.json"), "utf8")
);
const F = nsr.fiducialsMs;
const timeline = buildNsrTimeline(nsr.id, F, nsr.durationMs);
const glowAt = (ms) => resolveVentricularGlow(evaluateSegments(timeline, ms));

const checks = [];
const check = (name, pass, detail = "") => checks.push({ name, pass, detail });

// 1. 逆走排除：全位相で mode は "pulse"|"uniform" のみ。再分極窓では "uniform"。
let modeOk = true;
let modeDetail = "";
for (let ms = 0; ms <= timeline.cycleMs; ms += 5) {
  const m = glowAt(ms).mode;
  if (m !== "pulse" && m !== "uniform") {
    modeOk = false;
    modeDetail = `ms=${ms} mode=${m}`;
    break;
  }
}
check("mode is only pulse|uniform (never reverse)", modeOk, modeDetail);

let repolUniform = true;
let repolDetail = "";
for (let ms = 500; ms <= 780; ms += 5) {
  const g = glowAt(ms);
  if (g.phase === "repol" && g.mode !== "uniform") {
    repolUniform = false;
    repolDetail = `ms=${ms} mode=${g.mode}`;
    break;
  }
}
check("repol phase uses uniform glow (no sweep/reverse)", repolUniform, repolDetail);

// 2. 色分け維持：T波はシアン(recovery)、QRS はピンク/紫(ventricular/septal)＋前進pulse
const atT = glowAt(F.tPeak);
check(
  "repol color is recovery (cyan) on both vent & septal",
  atT.phase === "repol" && atT.ventColorKey === "recovery" && atT.septalColorKey === "recovery",
  `phase=${atT.phase} vent=${atT.ventColorKey} septal=${atT.septalColorKey}`
);
const atR = glowAt(F.r);
check(
  "depol keeps ventricular/septal + forward pulse",
  atR.phase === "depol" && atR.mode === "pulse" && atR.ventColorKey === "ventricular" && atR.septalColorKey === "septal",
  `phase=${atR.phase} mode=${atR.mode} vent=${atR.ventColorKey} septal=${atR.septalColorKey}`
);

// 3. 穏やかな単一山：repol 窓の intensity 系列が unimodal（ピークまで単調増加→単調減少）で
//    ピークが tPeak 近傍。複数ピーク/振動なら fail（オシレータ混入の番人）。
const xs = [];
for (let ms = 496; ms <= 784; ms += 4) xs.push({ ms, v: glowAt(ms).intensity });
let peakIdx = 0;
for (let i = 1; i < xs.length; i++) if (xs[i].v > xs[peakIdx].v) peakIdx = i;
let unimodal = true;
for (let i = 1; i <= peakIdx; i++) if (xs[i].v < xs[i - 1].v - 1e-9) unimodal = false;
for (let i = peakIdx + 1; i < xs.length; i++) if (xs[i].v > xs[i - 1].v + 1e-9) unimodal = false;
const peakMs = xs[peakIdx].ms;
check(
  "repol intensity is a single smooth hump (unimodal, no flicker)",
  unimodal && Math.abs(peakMs - F.tPeak) <= 20,
  `peakMs=${peakMs} tPeak=${F.tPeak} unimodal=${unimodal}`
);

// 4. 端で NaN/過発光しない
const edge = [glowAt(496).intensity, glowAt(784).intensity, glowAt(F.tPeak).intensity];
check(
  "intensities finite and within [0,1]",
  edge.every((v) => Number.isFinite(v) && v >= 0 && v <= 1),
  `edges=${edge.map((v) => v.toFixed(3)).join(",")}`
);

let ok = true;
for (const c of checks) {
  if (!c.pass) ok = false;
  console.log(`  [${c.pass ? "PASS" : "FAIL"}] ${c.name.padEnd(52)} ${c.detail}`);
}
console.log(ok ? "RESULT: PASS" : "RESULT: FAIL");
process.exit(ok ? 0 : 1);
