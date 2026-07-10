// T7 カメラ純関数検証（依存追加なし・node で直接実行）。
//
// leadCameraPosition（leadAxis 由来）を検証する。特に「edge-on 退化ビューでない
// （z>target.z）」を自動の番人にする。閾値を1つでも外したら exit(1)。
//
//   node scripts/verify-lead-camera.mjs

import {
  CAMERA_DISTANCE,
  leadCameraPosition,
} from "../src/data/ecg/leads/leadCamera.ts";

// SCENE_TARGET と一致（原点でないため方位判定は target 相対で行う）。
const TARGET = [-0.08, -0.28, 0.02];
const LIMB_LEADS = ["I", "II", "III", "aVR", "aVL", "aVF"];
const ALL_LEADS = [...LIMB_LEADS, "V1", "V2", "V3", "V4", "V5", "V6"];

const checks = [];
function check(name, pass, detail = "") {
  checks.push({ name, pass, detail });
}

// 1. 全誘導で z > target.z（edge-on でない）
let allFront = true;
let frontDetail = "";
for (const id of ALL_LEADS) {
  const p = leadCameraPosition(id, TARGET);
  if (!(p[2] > TARGET[2])) {
    allFront = false;
    frontDetail = `${id} z=${p[2]}`;
    break;
  }
}
check("all leads: camera z > target.z (not edge-on)", allFront, frontDetail);

// 2. カメラ〜target 距離が [3.2, 6.6] 内
let distOk = true;
let distDetail = "";
for (const id of ALL_LEADS) {
  const p = leadCameraPosition(id, TARGET);
  const d = Math.hypot(p[0] - TARGET[0], p[1] - TARGET[1], p[2] - TARGET[2]);
  if (d < 3.2 || d > 6.6) {
    distOk = false;
    distDetail = `${id} d=${d.toFixed(3)}`;
    break;
  }
}
check(`all leads: distance in [3.2, 6.6] (=${CAMERA_DISTANCE})`, distOk, distDetail);

// 3. 方位の整合（target 相対）
const rel = (id) => {
  const p = leadCameraPosition(id, TARGET);
  return [p[0] - TARGET[0], p[1] - TARGET[1], p[2] - TARGET[2]];
};
const I = rel("I");
const aVF = rel("aVF");
const aVR = rel("aVR");
const aVL = rel("aVL");
check("I is to the left (x>0)", I[0] > 0, `x=${I[0].toFixed(3)}`);
check("aVF is below (y<0)", aVF[1] < 0, `y=${aVF[1].toFixed(3)}`);
check("aVR is upper-right (x<0, y>0)", aVR[0] < 0 && aVR[1] > 0, `x=${aVR[0].toFixed(3)} y=${aVR[1].toFixed(3)}`);
check("aVL is upper-left (x>0, y>0)", aVL[0] > 0 && aVL[1] > 0, `x=${aVL[0].toFixed(3)} y=${aVL[1].toFixed(3)}`);

// 4. 対称性：aVR と aVL が縦軸に対して概ね鏡像（x 逆符号・y 同符号）
const mirrorX = Math.sign(aVR[0]) === -Math.sign(aVL[0]);
const sameY = Math.sign(aVR[1]) === Math.sign(aVL[1]) && Math.abs(aVR[1] - aVL[1]) < 1e-6;
const mirrorXmag = Math.abs(Math.abs(aVR[0]) - Math.abs(aVL[0])) < 1e-6;
check("aVR/aVL mirror across vertical axis", mirrorX && sameY && mirrorXmag, `aVRx=${aVR[0].toFixed(3)} aVLx=${aVL[0].toFixed(3)} aVRy=${aVR[1].toFixed(3)} aVLy=${aVL[1].toFixed(3)}`);

// 5. NaN/Infinity を返さない
let finite = true;
for (const id of ALL_LEADS) {
  const p = leadCameraPosition(id, TARGET);
  if (!p.every((v) => Number.isFinite(v))) {
    finite = false;
    break;
  }
}
check("all leads: finite coordinates", finite, "");

let ok = true;
for (const c of checks) {
  if (!c.pass) ok = false;
  console.log(`  [${c.pass ? "PASS" : "FAIL"}] ${c.name.padEnd(44)} ${c.detail}`);
}
console.log(ok ? "RESULT: PASS" : "RESULT: FAIL");
process.exit(ok ? 0 : 1);
