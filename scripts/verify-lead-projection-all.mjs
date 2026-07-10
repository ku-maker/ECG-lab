// T8 全誘導投影検証（依存追加なし・node で直接実行）。
//
// projectLead.ts（T8）＋ buildNsrTimeline（T3）で12誘導の投影波形を検証する。
// 特に Lead II が T5 と数値一致し続けること、極性の医学的整合を番人にする。
// 閾値を1つでも外したら exit(1)。
//
//   node scripts/verify-lead-projection-all.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  projectLeadValue,
  sampleLeadCycle,
} from "../src/data/ecg/leads/projectLead.ts";
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
const LEADS = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"];

const checks = [];
function check(name, pass, detail = "") {
  checks.push({ name, pass, detail });
}
function zscore(arr) {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const std = Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length);
  if (std === 0) return null;
  return arr.map((x) => (x - mean) / std);
}
function pearson(a, b) {
  const ma = a.reduce((x, y) => x + y, 0) / a.length;
  const mb = b.reduce((x, y) => x + y, 0) / b.length;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return num / (Math.sqrt(da * db) || 1);
}
function refAtMs(ms) {
  const s = nsr.samplesMv;
  const pos = (Math.max(0, Math.min(ms, nsr.durationMs - 1)) / nsr.durationMs) * (s.length - 1);
  const i = Math.floor(pos);
  const t = pos - i;
  return (s[i] ?? 0) + ((s[Math.min(i + 1, s.length - 1)] ?? 0) - (s[i] ?? 0)) * t;
}

// 1. Lead II が T5 と一致（r ≥ 0.90）
const iiSamples = sampleLeadCycle(timeline, "II", 200);
const proj = iiSamples.map((p) => p.mv);
const ref = iiSamples.map((p) => refAtMs(p.tMs));
const zp = zscore(proj);
const zr = zscore(ref);
const rII = zp && zr ? pearson(zr, zp) : 0;
check("Lead II projection matches T5 (r >= 0.90)", rII >= 0.9, `r=${rII.toFixed(4)}`);

// 2. 誘導ごとに波形が反映される。
//    ※ 本 MVP は全イベントが +60° 方向のため、各誘導は同一 S(t) のスカラー倍になり、
//      同じ軸定数を持つ誘導（例 I≡III≡V6, II≡V4, aVF≡V2≡V5）は同一波形になる。
//      これは単一方向双極子の既知の限界（真の3D双極子回転が要る＝v2）。よって
//      「任意ペアが相違」ではなく「I と aVR が反転」「R 偏位が誘導間で分布」で検証する。
const zI = zscore(sampleLeadCycle(timeline, "I", 200).map((p) => p.mv));
const zAVR = zscore(sampleLeadCycle(timeline, "aVR", 200).map((p) => p.mv));
const rIvsAVR = zI && zAVR ? pearson(zI, zAVR) : 0;
check("I vs aVR are inverted (z-corr < -0.99)", rIvsAVR < -0.99, `r=${rIvsAVR.toFixed(4)}`);
const dip = { x: 0, y: 0, z: 0 };
const rPeaks = LEADS.map((id) => projectLeadValue(timeline, id, F.r, dip));
const spread = Math.max(...rPeaks) - Math.min(...rPeaks);
check("R-peak differs across leads (spread > 0.5)", spread > 0.5, `spread=${spread.toFixed(3)}`);

// 3. 極性の医学的整合
const rOf = (id) => projectLeadValue(timeline, id, F.r, dip);
check("aVR R deflection negative", rOf("aVR") < 0, `aVR=${rOf("aVR").toFixed(3)}`);
check("II/I/aVF R deflection positive", rOf("II") > 0 && rOf("I") > 0 && rOf("aVF") > 0, `II=${rOf("II").toFixed(2)} I=${rOf("I").toFixed(2)} aVF=${rOf("aVF").toFixed(2)}`);
check("II P wave positive", projectLeadValue(timeline, "II", F.pPeak, dip) > 0, `IIp=${projectLeadValue(timeline, "II", F.pPeak, dip).toFixed(3)}`);
// aVL は符号断定せず near-isoelectric（小ささ）で検証（+60° 軸と 90° 直交・意図的）。
check(
  "aVL R near-isoelectric (|aVL| <= 0.5*|II|)",
  Math.abs(rOf("aVL")) <= 0.5 * Math.abs(rOf("II")),
  `|aVL|=${Math.abs(rOf("aVL")).toFixed(3)} 0.5|II|=${(0.5 * Math.abs(rOf("II"))).toFixed(3)}`
);

// 4. 振幅の相対関係
check("|aVR R| < |II R|", Math.abs(rOf("aVR")) < Math.abs(rOf("II")), `aVR=${Math.abs(rOf("aVR")).toFixed(3)} II=${Math.abs(rOf("II")).toFixed(3)}`);

// 5. 全誘導・全サンプル有限
let finite = true;
let finiteDetail = "";
for (const id of LEADS) {
  for (const p of sampleLeadCycle(timeline, id, 200)) {
    if (!Number.isFinite(p.mv)) {
      finite = false;
      finiteDetail = `${id} @ ${p.tMs}`;
      break;
    }
  }
  if (!finite) break;
}
check("all leads/samples finite", finite, finiteDetail);

let ok = true;
for (const c of checks) {
  if (!c.pass) ok = false;
  console.log(`  [${c.pass ? "PASS" : "FAIL"}] ${c.name.padEnd(46)} ${c.detail}`);
}
console.log(ok ? "RESULT: PASS" : "RESULT: FAIL");
process.exit(ok ? 0 : 1);
