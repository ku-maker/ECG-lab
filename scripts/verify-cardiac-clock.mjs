// T6 心周期クロック検証（依存追加なし・node で直接実行）。
//
// cardiacClock.ts（純ロジック）を相対 import（型ストリップ）して検証する。
// 閾値を1つでも外したら exit(1)。
//
//   node scripts/verify-cardiac-clock.mjs

import {
  MAX_FRAME_DELTA_MS,
  advance,
  cycleMsFromBpm,
  enterPlaying,
  enterScrubbing,
  phaseOf,
  scrubToRatio,
  setBpm,
} from "../lib/ecg/cardiacClock.ts";

const checks = [];
function check(name, pass, detail = "") {
  checks.push({ name, pass, detail });
}
function approx(a, b, tol = 1e-6) {
  return Math.abs(a - b) <= tol;
}
function makeState(partial) {
  return {
    mode: "playing",
    elapsedMs: 0,
    cycleMs: 1000,
    bpm: 60,
    ...partial,
  };
}

// 1. cycleMsFromBpm
check("cycleMsFromBpm(60) === 1000", cycleMsFromBpm(60, 800) === 1000, `${cycleMsFromBpm(60, 800)}`);
check("cycleMsFromBpm(120) === 500", cycleMsFromBpm(120, 800) === 500, `${cycleMsFromBpm(120, 800)}`);
check("cycleMsFromBpm(0) === fallback(800)", cycleMsFromBpm(0, 800) === 800, `${cycleMsFromBpm(0, 800)}`);

// 2. advance delta クランプ
const advanced = advance(makeState({ elapsedMs: 0 }), 500);
check(
  "advance clamps delta to MAX_FRAME_DELTA_MS",
  advanced.elapsedMs - 0 <= MAX_FRAME_DELTA_MS && advanced.elapsedMs === MAX_FRAME_DELTA_MS,
  `inc=${advanced.elapsedMs} max=${MAX_FRAME_DELTA_MS}`
);

// 3. phaseOf 畳み込み
check("phaseOf(2500,1000) === 500", phaseOf(makeState({ elapsedMs: 2500 })) === 500, `${phaseOf(makeState({ elapsedMs: 2500 }))}`);
check("phaseOf(-100,1000) === 900", phaseOf(makeState({ elapsedMs: -100 })) === 900, `${phaseOf(makeState({ elapsedMs: -100 }))}`);

// 4. BPM 変更で位相割合が保存される
const s4 = makeState({ elapsedMs: 2350, cycleMs: 1000, bpm: 60 }); // phase=350, ratio=0.35
const ratioBefore = phaseOf(s4) / s4.cycleMs;
const s4b = setBpm(s4, 120, 800); // cycle 500
const ratioAfter = phaseOf(s4b) / s4b.cycleMs;
check(
  "setBpm preserves phase ratio (no jump)",
  approx(ratioBefore, ratioAfter),
  `before=${ratioBefore.toFixed(6)} after=${ratioAfter.toFixed(6)} cycle=${s4b.cycleMs}`
);

// 5. scrubToRatio と端値
const s5 = scrubToRatio(makeState({ elapsedMs: 0, cycleMs: 1000 }), 0.25);
check("scrubToRatio(0.25) => phase ratio 0.25", approx(phaseOf(s5) / s5.cycleMs, 0.25), `${(phaseOf(s5) / s5.cycleMs).toFixed(4)}`);
const s5a = scrubToRatio(makeState({ elapsedMs: 0, cycleMs: 1000 }), 0);
const s5b = scrubToRatio(makeState({ elapsedMs: 0, cycleMs: 1000 }), 1);
check(
  "scrubToRatio endpoints finite, ratio=1 folds to 0",
  Number.isFinite(phaseOf(s5a)) && Number.isFinite(phaseOf(s5b)) && phaseOf(s5b) === 0,
  `p0=${phaseOf(s5a)} p1=${phaseOf(s5b)}`
);

// 6. 連続 advance で単調増加・phaseOf は [0,cycleMs)
let s6 = makeState({ elapsedMs: 0, cycleMs: 1000 });
let monotonic = true;
let phaseInRange = true;
let prev = s6.elapsedMs;
for (let i = 0; i < 500; i++) {
  s6 = advance(s6, 16);
  if (s6.elapsedMs < prev) monotonic = false;
  prev = s6.elapsedMs;
  const p = phaseOf(s6);
  if (p < 0 || p >= s6.cycleMs) phaseInRange = false;
}
check("advance monotonic increase", monotonic, `elapsed=${s6.elapsedMs}`);
check("phaseOf always in [0, cycleMs)", phaseInRange, "");

// 7. playing→scrubbing 連続性
const s7 = makeState({ elapsedMs: 1234, cycleMs: 1000, mode: "playing" });
const before7 = phaseOf(s7);
const s7b = enterScrubbing(s7);
check(
  "enterScrubbing keeps phase exactly",
  phaseOf(s7b) === before7 && s7b.mode === "scrubbing",
  `before=${before7} after=${phaseOf(s7b)}`
);

// 8. scrubbing→playing 連続性 + 続く advance は delta 分のみ
const s8 = makeState({ elapsedMs: 1234, cycleMs: 1000, mode: "scrubbing" });
const atRelease = phaseOf(s8);
const s8play = enterPlaying(s8);
const releaseOk = phaseOf(s8play) === atRelease && s8play.mode === "playing";
const s8stepped = advance(s8play, 16);
const expected = ((atRelease + 16) % 1000 + 1000) % 1000;
check(
  "enterPlaying keeps phase, then advance(16) steps by 16",
  releaseOk && approx(phaseOf(s8stepped), expected),
  `release=${atRelease} stepped=${phaseOf(s8stepped)} expected=${expected}`
);

// 9. scrub 中の周期保存（巻き戻さない）
const s9 = scrubToRatio(makeState({ elapsedMs: 2400, cycleMs: 1000 }), 0.1);
check(
  "scrubToRatio preserves cycle index (no rewind)",
  s9.elapsedMs === 2100 && phaseOf(s9) === 100,
  `elapsed=${s9.elapsedMs} phase=${phaseOf(s9)}`
);

let ok = true;
for (const c of checks) {
  if (!c.pass) ok = false;
  console.log(`  [${c.pass ? "PASS" : "FAIL"}] ${c.name.padEnd(48)} ${c.detail}`);
}
console.log(ok ? "RESULT: PASS" : "RESULT: FAIL");
process.exit(ok ? 0 : 1);
