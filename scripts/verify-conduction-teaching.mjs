import assert from 'node:assert/strict';
import { waveformSeekRatio } from '../lib/ecg/waveformSeek.ts';
import { readFileSync } from 'node:fs';
import { buildNsrTimeline } from '../src/data/ecg/activation/buildTimeline.ts';
import { buildConductionStages, conductionStageAt, playbackDelta } from '../lib/ecg/conductionStages.ts';
import { advance, phaseOf, enterScrubbing, scrubToRatio } from '../lib/ecg/cardiacClock.ts';
import { CONDUCTION_POINTS } from '../src/data/ecg/activation/segmentPoints.ts';

const template = JSON.parse(readFileSync(new URL('../src/data/ecg/templates/nsr-lead2.json', import.meta.url), 'utf8'));
const f = template.fiducialsMs;
const timeline = buildNsrTimeline(template.id, f, template.durationMs);
const stages = buildConductionStages(f, timeline);
for (const width of [320, 640, 1200]) {
  const viewWidth = 1200, padding = 30;
  for (const ms of [0, f.pPeak, f.r, f.tPeak, 999]) {
    const x = (padding + ms / 1000 * (viewWidth - 2 * padding)) / viewWidth * width;
    const ratio = waveformSeekRatio(x, width, viewWidth, padding, 1000);
    const state = scrubToRatio(enterScrubbing({mode:'playing',elapsedMs:2200,cycleMs:1000,bpm:60}),ratio);
    assert.equal(state.mode,'scrubbing');
    assert.ok(Math.abs(phaseOf(state)-ms)<1e-8);
  }
  assert.equal(waveformSeekRatio(-20,width,viewWidth,padding,1000),0);
  assert.equal(waveformSeekRatio(width+20,width,viewWidth,padding,1000),0.999);
}
assert.equal(waveformSeekRatio(10,0,1200,30,1000),0);
assert.equal(conductionStageAt(stages, f.pPeak).id, 'atrial');
assert.equal(conductionStageAt(stages, (f.pOff + f.qrsOn) / 2).id, 'av');
assert.equal(conductionStageAt(stages, f.r).id, 'qrs');
assert.equal(conductionStageAt(stages, f.tPeak).id, 'repol');
assert.equal(conductionStageAt(stages, f.tEnd).id, 'rest');
for (const stage of stages) {
  assert.ok(stage.endMs > stage.startMs);
  assert.equal(conductionStageAt(stages, stage.focusMs).id, stage.id);
}
const t = stages.find(stage => stage.id === 'repol');
assert.ok(t.startMs < f.tPeak, 'T-wave explanation must begin before its peak');
assert.equal(stages.find(stage => stage.id === 'st').endMs, t.startMs);
for (let ms = 0; ms < timeline.cycleMs; ms++) {
  assert.ok(conductionStageAt(stages, ms));
  assert.ok(stages.filter(stage => ms >= stage.startMs && ms < stage.endMs).length <= 1);
}
for (const rate of [0.1, 0.25, 0.5, 1]) {
  let state = { mode: 'playing', elapsedMs: 0, cycleMs: 1000, bpm: 60 };
  for (let frame = 0; frame < 60; frame++) state = advance(state, playbackDelta(1000 / 60, rate));
  assert.ok(Math.abs(state.elapsedMs - 1000 * rate) < 1e-8);
  assert.equal(state.cycleMs, 1000, 'slow motion must not change physiological cycle length');
  assert.ok(Math.abs(phaseOf(state) - (state.elapsedMs % 1000)) < 1e-8);
}
assert.equal(playbackDelta(5000, 0.25), 12.5, 'background tab delta must be clamped before slowdown');
assert.equal(playbackDelta(-1, 1), 0);
assert.equal(playbackDelta(NaN, 1), 0);
assert.ok(CONDUCTION_POINTS.sa[0] < 0, 'SA node remains on patient right');
assert.ok(CONDUCTION_POINTS.purkinjeApex[0] > 0, 'apical network points toward patient left');
console.log('PASS: teaching landmarks, T onset, step selection, four playback rates, background resumption and anatomical orientation.');
