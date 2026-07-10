// T4 評価ロジック検証（依存追加なし・node で直接実行）
//
// nsr-lead2.json を fs で読み、buildNsrTimeline（T3）で組んだタイムラインに対し
// evaluate.ts（T4）の evaluateDipole / evaluateSegments / envelopeAt を検証する。
// 閾値を1つでも外したら exit(1)。
//
//   node scripts/verify-evaluate.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  evaluateDipole,
  evaluateSegments,
} from "../src/data/ecg/activation/evaluate.ts";
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

// Lead II 軸（T2 の axisFromAngle(60) = [0.5, -0.8660254, 0]）へ投影する補助。
const LEAD_II = [0.5, -0.8660254037844386, 0];
const scratch = { x: 0, y: 0, z: 0 };
function leadII(tMs) {
  const v = evaluateDipole(timeline, tMs, scratch);
  return v.x * LEAD_II[0] + v.y * LEAD_II[1] + v.z * LEAD_II[2];
}
function magnitude(tMs) {
  const v = evaluateDipole(timeline, tMs, scratch);
  return Math.hypot(v.x, v.y, v.z);
}

const checks = [];
function check(name, pass, detail = "") {
  checks.push({ name, pass, detail });
}

// 1. P波窓（pPeak）で saAtrial の発光が最大
const segAtP = evaluateSegments(timeline, F.pPeak);
const atrialMax = Object.entries(segAtP).every(
  ([seg, val]) => seg === "saAtrial" || segAtP.saAtrial >= val
);
check(
  "saAtrial glow is max at pPeak",
  atrialMax && segAtP.saAtrial > 0,
  `saAtrial=${segAtP.saAtrial.toFixed(3)}`
);

// 2. QRS窓（r）で |dipole| が P/T 中心より大きい
const magR = magnitude(F.r);
const magP = magnitude(F.pPeak);
const magT = magnitude(F.tPeak);
check(
  "|dipole| at r > at pPeak and tPeak",
  magR > magP && magR > magT,
  `r=${magR.toFixed(3)} p=${magP.toFixed(3)} t=${magT.toFixed(3)}`
);

// 3. biphasic：R が支配的な陽性、かつ QRS 尾部に S 谷（0 を下回る終末陰性偏位）が存在。
//    ※ 単一の正 Gaussian では尾部が負にならないため、S 谷<0 は terminalS の存在を守る番人。
//    （合計投影は q/s の"中心時刻ちょうど"では R の裾に持ち上げられ負にならない＝実測値。
//      biphasic の本質は R 直後の谷が 0 を割ることにある。）
const projR = leadII(F.r);
let trough = Infinity;
let troughT = 0;
for (let t = F.r; t <= F.qrsOff + 40; t++) {
  const v = leadII(t);
  if (v < trough) {
    trough = v;
    troughT = t;
  }
}
check("R projection positive (dominant)", projR > 0.5, `projR=${projR.toFixed(3)}`);
check(
  "terminal S trough dips below 0 after R (biphasic)",
  trough < 0,
  `trough=${trough.toFixed(4)} at t=${troughT}`
);

// 4. avDelay：波形非寄与（投影≈0）だが発光はする
const projAv = leadII((F.pOff + F.qrsOn) / 2);
const segAv = evaluateSegments(timeline, (F.pOff + F.qrsOn) / 2);
check("avDelay dipole projection ~= 0", Math.abs(projAv) < 0.02, `|proj|=${Math.abs(projAv).toFixed(4)}`);
check("avDelay segment glows (>0)", segAv.avDelay > 0, `avDelay=${segAv.avDelay.toFixed(3)}`);

// 5. アロケーション回避：同じ out を渡すと参照同一で in-place 更新
const out = { x: 0, y: 0, z: 0 };
const r1 = evaluateDipole(timeline, F.r, out);
const r2 = evaluateDipole(timeline, F.pPeak, out);
check("evaluateDipole reuses out (same ref)", r1 === out && r2 === out, "");

// 6. evaluateSegments が8キー全て、値が [0,1]
const seg = evaluateSegments(timeline, F.r);
const keys = Object.keys(seg);
const rangeOk = Object.values(seg).every((v) => v >= 0 && v <= 1 && Number.isFinite(v));
check("evaluateSegments has 8 keys", keys.length === 8, `keys=${keys.length}`);
check("all segment glows in [0,1]", rangeOk, `vals=[${Object.values(seg).map((v) => v.toFixed(2)).join(",")}]`);

// 7. 範囲外時刻で NaN/Infinity を出さない
const oob1 = leadII(-50);
const oob2 = leadII(timeline.cycleMs + 50);
const segOob = evaluateSegments(timeline, -50);
const oobFinite =
  Number.isFinite(oob1) &&
  Number.isFinite(oob2) &&
  Object.values(segOob).every((v) => Number.isFinite(v));
check("out-of-range tMs stays finite", oobFinite, `oob1=${oob1.toFixed(4)} oob2=${oob2.toFixed(4)}`);

let ok = true;
for (const c of checks) {
  if (!c.pass) ok = false;
  console.log(`  [${c.pass ? "PASS" : "FAIL"}] ${c.name.padEnd(42)} ${c.detail}`);
}
console.log(ok ? "RESULT: PASS" : "RESULT: FAIL");
process.exit(ok ? 0 : 1);
