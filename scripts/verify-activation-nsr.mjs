// T3 賦活タイムライン検証（依存追加なし・node で直接実行）
//
// nsr-lead2.json を fs で読み、純ビルダー buildNsrTimeline（型ストリップで相対 import）
// で組んだ NSR タイムラインを検証する。閾値を1つでも外したら exit(1)。
//
//   node scripts/verify-activation-nsr.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { buildNsrTimeline } from "../src/data/ecg/activation/buildTimeline.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const nsr = JSON.parse(
  readFileSync(
    resolve(__dirname, "../src/data/ecg/templates/nsr-lead2.json"),
    "utf8"
  )
);

const F = nsr.fiducialsMs;
const timeline = buildNsrTimeline(nsr.id, F, nsr.durationMs);

const checks = [];
function check(name, pass, detail = "") {
  checks.push({ name, pass, detail });
}
function approx(a, b, tol = 1e-9) {
  return Math.abs(a - b) <= tol;
}

const byId = Object.fromEntries(timeline.events.map((e) => [e.id, e]));

// 1. cycleMs === durationMs
check(
  "cycleMs === durationMs",
  timeline.cycleMs === nsr.durationMs,
  `cycle=${timeline.cycleMs} duration=${nsr.durationMs}`
);

// 2. イベント6件、avDelay のみ contributesToWave===false
const waveFalse = timeline.events.filter((e) => e.contributesToWave === false);
check("events count === 6", timeline.events.length === 6, `n=${timeline.events.length}`);
check(
  "only avDelay has contributesToWave=false",
  waveFalse.length === 1 && waveFalse[0].id === "avDelay",
  `false=[${waveFalse.map((e) => e.id).join(",")}]`
);

// 3. biphasic：septalQ<0, terminalS<0, mainR>0, |mainR| が支配的
const { septalQ, mainR, terminalS } = byId;
check("septalQ.peakMag < 0", septalQ.dipolePeakMag < 0, `${septalQ.dipolePeakMag}`);
check("terminalS.peakMag < 0", terminalS.dipolePeakMag < 0, `${terminalS.dipolePeakMag}`);
check("mainR.peakMag > 0", mainR.dipolePeakMag > 0, `${mainR.dipolePeakMag}`);
check(
  "|mainR| dominant over Q/S",
  Math.abs(mainR.dipolePeakMag) > Math.abs(septalQ.dipolePeakMag) &&
    Math.abs(mainR.dipolePeakMag) > Math.abs(terminalS.dipolePeakMag),
  `R=${mainR.dipolePeakMag} Q=${septalQ.dipolePeakMag} S=${terminalS.dipolePeakMag}`
);

// 4. centerMs が fiducial と一致
check("atrial.center === pPeak", byId.atrial.centerMs === F.pPeak, `${byId.atrial.centerMs}/${F.pPeak}`);
check("septalQ.center === q", septalQ.centerMs === F.q, `${septalQ.centerMs}/${F.q}`);
check("mainR.center === r", mainR.centerMs === F.r, `${mainR.centerMs}/${F.r}`);
check("terminalS.center === s", terminalS.centerMs === F.s, `${terminalS.centerMs}/${F.s}`);
check("repol.center === tPeak", byId.repol.centerMs === F.tPeak, `${byId.repol.centerMs}/${F.tPeak}`);

// 5. dipoleDir のノルム ≈ 1
let normOk = true;
let normDetail = "";
for (const e of timeline.events) {
  const [x, y, z] = e.dipoleDir;
  const n = Math.hypot(x, y, z);
  if (!approx(n, 1)) {
    normOk = false;
    normDetail = `${e.id} norm=${n}`;
    break;
  }
}
check("all dipoleDir norm ≈ 1", normOk, normDetail);

// 6. centerMs 昇順、[0, cycleMs] に収まる
let ordered = true;
let orderDetail = "";
for (let i = 0; i < timeline.events.length; i++) {
  const c = timeline.events[i].centerMs;
  if (c < 0 || c > timeline.cycleMs) {
    ordered = false;
    orderDetail = `${timeline.events[i].id} center=${c} out of [0,${timeline.cycleMs}]`;
    break;
  }
  if (i > 0 && c < timeline.events[i - 1].centerMs) {
    ordered = false;
    orderDetail = `${timeline.events[i].id} not ascending`;
    break;
  }
}
check("events ascending within [0, cycleMs]", ordered, orderDetail);

let ok = true;
for (const c of checks) {
  if (!c.pass) ok = false;
  console.log(`  [${c.pass ? "PASS" : "FAIL"}] ${c.name.padEnd(34)} ${c.detail}`);
}
console.log(ok ? "RESULT: PASS" : "RESULT: FAIL");
process.exit(ok ? 0 : 1);
