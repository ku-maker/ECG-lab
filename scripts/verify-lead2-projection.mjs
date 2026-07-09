// T5 投影検証ハーネス（依存追加なし・node で直接実行）
//
// 目的: 双極子モデル → 誘導軸への内積射影で生成した Lead II 波形が、
//       唯一の正解データ nsr-lead2.json の概形と一致することを自動検証する。
//       閾値を1つでも外したら exit(1)。目視確認に頼らない。
//
// 使い方:
//   node scripts/verify-lead2-projection.mjs              # 正しい実装で検証
//   INJECT_SIGN_BUG=1 node scripts/verify-lead2-projection.mjs
//        → 座標フレームのY符号を誘導軸側だけ反転（フレーム handedness バグを模擬）。
//          Lead II 投影が反転し r<0.90 で必ず失敗することを確認するための変異注入。
//
// 注意: これは T5 の「実行可能な参照ハーネス」。Codex が実装する本番の
//       src/data/ecg 側モジュール＋テストは、ここと同じメトリクス・閾値を再現すること。

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const nsr = JSON.parse(
  readFileSync(
    resolve(__dirname, "../src/data/ecg/templates/nsr-lead2.json"),
    "utf8"
  )
);

const INJECT_SIGN_BUG = process.env.INJECT_SIGN_BUG === "1";

// ---- 座標フレーム／誘導軸 -------------------------------------------------
// フレーム: +X=左, +Y=上(SUPERIOR), θ=0 が Lead I(+X), +90°=下向き(-Y)。
// axisFromAngle(θ) = (cosθ, -sinθ, 0)
function axisFromAngle(deg) {
  const r = (deg * Math.PI) / 180;
  const ySign = INJECT_SIGN_BUG ? +1 : -1; // ← ここが注入対象（誘導軸側のみ反転）
  return [Math.cos(r), ySign * Math.sin(r), 0];
}
const LEAD_ANGLES_DEG = { I: 0, II: 60, III: 120, aVR: -150, aVL: -30, aVF: 90 };
function leadAxis(id) {
  const a = axisFromAngle(LEAD_ANGLES_DEG[id]);
  const n = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / n, a[1] / n, a[2] / n];
}

// ---- 賦活タイムライン（NSR）: fiducials から導出、数値ハードコードしない ----
const F = nsr.fiducialsMs;
const CYCLE = nsr.durationMs;
// 双極子の代表方向は「平均電気軸 ≒ +60°(Lead II 方向)」。心房/心室/再分極とも concordant。
// dir は明示ベクトルとして与える（注入バグは誘導軸側のみに効かせ、射影の非対称性を検出させる）。
const DIR_60 = (() => {
  const r = (60 * Math.PI) / 180;
  return [Math.cos(r), -Math.sin(r), 0]; // 正しいフレームでの +60°
})();

// event: center(ms), sigma(ms), peakMag, dir
// QRS は単一Gaussianではなく、双極子の向きが回ることで生じる生理的 biphasic を
// 中隔Q(小・逆向き)→主R(大・+60°)→終末S(小・逆向き) の3ローブで表現する。
// （負の peak = DIR_60 の逆向き寄与。MVPの「単一方向イベント」より一段リッチだが、
//   双極子ベクトルが QRS 中に回転する設計の範囲内。）
const EVENTS = [
  { name: "atrial", center: F.pPeak, sigma: (F.pOff - F.pOn) / 2.4, peak: 0.13, dir: DIR_60 },
  { name: "septalQ", center: F.q, sigma: 10, peak: -0.18, dir: DIR_60 },
  { name: "mainR", center: F.r, sigma: (F.qrsOff - F.qrsOn) / 5.5, peak: 1.0, dir: DIR_60 },
  { name: "terminalS", center: F.s, sigma: 12, peak: -0.22, dir: DIR_60 },
  { name: "repol", center: F.tPeak, sigma: (F.tEnd - F.qrsOff) / 5.0, peak: 0.30, dir: DIR_60 },
];

function gauss(t, c, s) {
  const z = (t - c) / s;
  return Math.exp(-0.5 * z * z);
}
function evaluateDipole(tMs) {
  const v = [0, 0, 0];
  for (const e of EVENTS) {
    const m = e.peak * gauss(tMs, e.center, e.sigma);
    v[0] += e.dir[0] * m;
    v[1] += e.dir[1] * m;
    v[2] += e.dir[2] * m;
  }
  return v;
}
function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

// ---- サンプリング --------------------------------------------------------
const N = 200;
function sampleTemplateAtMs(ms) {
  // nsr の samplesMv を線形補間（本番は既存 catmullRom 補間を使う想定）
  const s = nsr.samplesMv;
  const pos = (Math.max(0, Math.min(ms, CYCLE - 1)) / CYCLE) * (s.length - 1);
  const i = Math.floor(pos);
  const t = pos - i;
  const a = s[i] ?? 0;
  const b = s[Math.min(i + 1, s.length - 1)] ?? 0;
  return a + (b - a) * t;
}
const II = leadAxis("II");
const times = [];
const ref = [];
const proj = [];
for (let k = 0; k < N; k++) {
  const ms = (k / (N - 1)) * CYCLE;
  times.push(ms);
  ref.push(sampleTemplateAtMs(ms));
  proj.push(dot(evaluateDipole(ms), II));
}

// ---- Z-score 正規化 ------------------------------------------------------
function zscore(arr) {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const varr = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length;
  const std = Math.sqrt(varr);
  if (std === 0) throw new Error("degenerate signal: std=0");
  return arr.map((x) => (x - mean) / std);
}
const zr = zscore(ref);
const zp = zscore(proj);

// ---- メトリクス ----------------------------------------------------------
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
function rmse(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s / a.length);
}
function peakTimeInWindow(arr, fromMs, toMs) {
  let best = -Infinity, bestMs = null;
  for (let i = 0; i < arr.length; i++) {
    if (times[i] < fromMs || times[i] > toMs) continue;
    if (arr[i] > best) { best = arr[i]; bestMs = times[i]; }
  }
  return { ms: bestMs, val: best };
}

const r = pearson(zr, zp);
const rms = rmse(zr, zp);
const rP = peakTimeInWindow(ref, F.pOn, F.pOff);
const pP = peakTimeInWindow(proj, F.pOn, F.pOff);
const rR = peakTimeInWindow(ref, F.qrsOn, F.qrsOff);
const pR = peakTimeInWindow(proj, F.qrsOn, F.qrsOff);
const rT = peakTimeInWindow(ref, F.qrsOff, F.tEnd);
const pT = peakTimeInWindow(proj, F.qrsOff, F.tEnd);
const dP = Math.abs(rP.ms - pP.ms);
const dR = Math.abs(rR.ms - pR.ms);
const dT = Math.abs(rT.ms - pT.ms);

// 極性: proj の各窓ピーク値が正か
const polOk = pP.val > 0 && pR.val > 0 && pT.val > 0;
// QRS 区間振幅が最大か（proj の絶対値）
const maxAbs = (from, to) => {
  let m = 0;
  for (let i = 0; i < proj.length; i++)
    if (times[i] >= from && times[i] <= to) m = Math.max(m, Math.abs(proj[i]));
  return m;
};
const qrsDominant =
  maxAbs(F.qrsOn, F.qrsOff) > maxAbs(F.pOn, F.pOff) &&
  maxAbs(F.qrsOn, F.qrsOff) > maxAbs(F.qrsOff, F.tEnd);

// ---- 判定 ----------------------------------------------------------------
const checks = [
  { name: "r >= 0.90", pass: r >= 0.9, detail: `r=${r.toFixed(4)}` },
  { name: "z-RMSE <= 0.45", pass: rms <= 0.45, detail: `RMSE=${rms.toFixed(4)}` },
  { name: "|ΔR| <= 40ms", pass: dR <= 40, detail: `ΔR=${dR.toFixed(1)}ms` },
  { name: "|ΔP| <= 60ms", pass: dP <= 60, detail: `ΔP=${dP.toFixed(1)}ms` },
  { name: "|ΔT| <= 60ms", pass: dT <= 60, detail: `ΔT=${dT.toFixed(1)}ms` },
  { name: "polarity P/R/T up", pass: polOk, detail: `P=${pP.val.toFixed(2)} R=${pR.val.toFixed(2)} T=${pT.val.toFixed(2)}` },
  { name: "QRS amplitude dominant", pass: qrsDominant, detail: `qrs=${maxAbs(F.qrsOn, F.qrsOff).toFixed(3)}` },
];

console.log(`INJECT_SIGN_BUG=${INJECT_SIGN_BUG ? "1" : "0"}`);
console.log(`Lead II axis = [${II.map((x) => x.toFixed(3)).join(", ")}]`);
let ok = true;
for (const c of checks) {
  const mark = c.pass ? "PASS" : "FAIL";
  if (!c.pass) ok = false;
  console.log(`  [${mark}] ${c.name.padEnd(26)} ${c.detail}`);
}
console.log(ok ? "RESULT: PASS" : "RESULT: FAIL");
process.exit(ok ? 0 : 1);
