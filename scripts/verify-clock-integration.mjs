// T9 クロック統合検証（依存追加なし・node で直接実行）。
//
// フック自体は node で回せないため、cardiacClock.ts（純ロジック）の遷移列と、
// 「3D発光（evaluateSegments）と波形投影（projectLead）が同一 phaseMs を共有する」
// 配線の整合を検証する。閾値を1つでも外したら exit(1)。
//
//   node scripts/verify-clock-integration.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  advance,
  enterPlaying,
  enterScrubbing,
  phaseOf,
  scrubToRatio,
} from "../lib/ecg/cardiacClock.ts";
import { evaluateSegments } from "../src/data/ecg/activation/evaluate.ts";
import { projectLeadValue } from "../src/data/ecg/leads/projectLead.ts";
import { buildNsrTimeline } from "../src/data/ecg/activation/buildTimeline.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const nsr = JSON.parse(
  readFileSync(resolve(__dirname, "../src/data/ecg/templates/nsr-lead2.json"), "utf8")
);
const F = nsr.fiducialsMs;
const timeline = buildNsrTimeline(nsr.id, F, nsr.durationMs);

const checks = [];
const check = (name, pass, detail = "") => checks.push({ name, pass, detail });
const approx = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;
const base = (p) => ({ mode: "playing", elapsedMs: 0, cycleMs: 1000, bpm: 60, ...p });

// 1. playing で advance を回し phaseOf が [0,cycleMs) を単調巡回
let s = base({ elapsedMs: 0 });
let inRange = true;
for (let i = 0; i < 400; i++) {
  s = advance(s, 16);
  const p = phaseOf(s);
  if (p < 0 || p >= s.cycleMs) inRange = false;
}
check("playing advance keeps phase in [0,cycleMs)", inRange, `elapsed=${s.elapsedMs}`);

// 2. enterScrubbing → scrubToRatio → enterPlaying で位相が飛ばない
const play0 = base({ elapsedMs: 1234, cycleMs: 1000, mode: "playing" });
const grabbed = enterScrubbing(play0);
const grabOk = phaseOf(grabbed) === phaseOf(play0); // 掴んだ瞬間ジャンプなし
const scrubbed = scrubToRatio(grabbed, 0.4);
const scrubOk = approx(phaseOf(scrubbed) / scrubbed.cycleMs, 0.4);
const released = enterPlaying(scrubbed);
const relOk = phaseOf(released) === phaseOf(scrubbed); // 離した瞬間ジャンプなし
const stepped = advance(released, 16);
const stepOk = approx(phaseOf(stepped), (phaseOf(scrubbed) + 16) % released.cycleMs);
check(
  "scrub<->play transitions never jump phase",
  grabOk && scrubOk && relOk && stepOk,
  `grab=${grabOk} scrub=${scrubOk} rel=${relOk} step=${stepOk}`
);

// 3. 3D発光と波形投影が同一 phaseMs を共有する（片方だけ別位相を使っていない）
//    QRS 位相では septalPurkinje 発光と Lead II R が両方立ち、静止位相では両方沈む。
const segAtR = evaluateSegments(timeline, F.r);
const projAtR = projectLeadValue(timeline, "II", F.r);
const segAtRest = evaluateSegments(timeline, 0);
const projAtRest = projectLeadValue(timeline, "II", 0);
check(
  "same phaseMs drives glow & waveform together (QRS active)",
  segAtR.septalPurkinje > 0.5 && Math.abs(projAtR) > 0.5,
  `glow=${segAtR.septalPurkinje.toFixed(2)} proj=${projAtR.toFixed(2)}`
);
check(
  "same phaseMs drives glow & waveform together (rest quiet)",
  segAtRest.septalPurkinje < 0.1 && Math.abs(projAtRest) < 0.1,
  `glow=${segAtRest.septalPurkinje.toFixed(2)} proj=${projAtRest.toFixed(2)}`
);

let ok = true;
for (const c of checks) {
  if (!c.pass) ok = false;
  console.log(`  [${c.pass ? "PASS" : "FAIL"}] ${c.name.padEnd(52)} ${c.detail}`);
}
console.log(ok ? "RESULT: PASS" : "RESULT: FAIL");
process.exit(ok ? 0 : 1);
