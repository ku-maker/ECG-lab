import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildTeachingMarks, getTeachingSteps } from '../lib/ecg/teachingHighlights.ts';
import { templateToBeatMs, getMaxLearningBpm } from '../lib/ecg/rateTiming.ts';
import { isMobitz2DroppedBeat, getWenckebachQrsPeakOffsetMs } from '../lib/ecg/teachingTiming.ts';
const load = id => JSON.parse(readFileSync(new URL(`../src/data/ecg/templates/${id}-lead2.json`, import.meta.url), 'utf8'));
const normal = load('nsr');
const marks = (id, kind, bpm = 60, from = 0, to = 6000) => buildTeachingMarks(load(id), normal, bpm, from, to, kind);
const full = list => list.filter(mark => mark.startMs >= 0 && mark.endMs <= 6000);
const near = (a, b) => assert.ok(Math.abs(a-b) < 1e-7, `${a} should equal ${b}`);

for (const id of ['nsr','sinus-brady','sinus-tachy','avblock1','mobitz2','wenckebach','avblock3']) {
  assert.equal(getTeachingSteps(id).length, 3);
  for (const bpm of [40,60,93,getMaxLearningBpm(id)]) {
    for (const step of getTeachingSteps(id)) {
      for (const end of [0,900,7250]) {
        const result = marks(id,step.kind,bpm,end-6000,end);
        assert.ok(result.length > 0, `${id}/${step.kind} is visible at ${end} ms and ${bpm} bpm`);
        for (const mark of result) {
          assert.ok(mark.endMs > mark.startMs);
          assert.ok(mark.endMs > end-6000 && mark.startMs < end);
        }
      }
    }
  }
}
assert.deepEqual(getTeachingSteps('af'), []);
assert.deepEqual(marks('vf','p'), []);
assert.deepEqual(marks('nsr','p',0), []);
// Normal markers follow template fiducials after heart-rate scaling, even in prefilled negative time.
const p = marks('nsr','p',120,-500,0);
near(p[0].endMs-p[0].startMs,80); assert.ok(p[0].startMs < 0 && p[0].endMs < 0);
const pr = full(marks('avblock1','pr'));
near(pr[0].startMs,40); near(pr[0].endMs,500);
const rr = full(marks('nsr','rr',120));
rr.forEach(mark => near(mark.endMs-mark.startMs,500));
assert.deepEqual(marks('nsr','sequence').map(mark=>mark.kind), ['p','qrs','t']);
for (const id of ['sinus-brady','sinus-tachy']) {
  for (const bpm of [45, 60, 120, 180]) {
    const template = load(id);
    const period = 60000 / bpm;
    const pair = marks(id, 'pq', bpm, 0, period);
    assert.deepEqual(pair.map(mark => mark.kind), ['p', 'qrs']);
    near(pair[0].startMs, templateToBeatMs(template, template.fiducialsMs.pOn, period));
    near(pair[1].endMs, templateToBeatMs(template, template.fiducialsMs.qrsOff, period));
    assert.ok(pair[0].endMs < pair[1].startMs);
    full(marks(id, 'rr', bpm)).forEach(mark => near(mark.endMs - mark.startMs, period));
  }
}
// The signal keeps the P wave when QRS is dropped; no PR bracket may imply conduction on that beat.
assert.equal(isMobitz2DroppedBeat(-1),true);
assert.equal(isMobitz2DroppedBeat(-2),false);
const drop = marks('mobitz2','dropped');
assert.deepEqual(drop.map(mark=>mark.kind),['p','dropped']);
near(drop[1].startMs,3360); near(drop[1].endMs,3460);
const mobitzPr = marks('mobitz2','pr');
assert.equal(mobitzPr.filter(mark=>mark.kind==='pr' && mark.startMs>=3000 && mark.startMs<4000).length,0);
assert.equal(mobitzPr.filter(mark=>mark.kind==='dropped').length,1);
// Three progressive delays, one nonconducted beat, then a short delay again.
const wenck = marks('wenckebach','pr',60,0,5000).filter(mark=>mark.kind==='pr');
const durations = wenck.map(mark=>mark.endMs-mark.startMs);
assert.ok(durations[0] < durations[1] && durations[1] < durations[2]);
near(durations[0],durations[3]);
assert.equal(getWenckebachQrsPeakOffsetMs(1000,3),null);
assert.equal(getWenckebachQrsPeakOffsetMs(1000,-1),null);
// Complete block uses independent fixed atrial/ventricular clocks, irrespective of the BPM slider argument.
assert.deepEqual(marks('avblock3','independent',40),marks('avblock3','independent',100));
const atria = full(marks('avblock3','p'));
const ventricles = full(marks('avblock3','qrs'));
near(atria[1].startMs-atria[0].startMs,60000/82);
near(ventricles[1].startMs-ventricles[0].startMs,60000/35);
console.log('PASS: all 7 teaching cases, rate scaling, negative-time prefill, marker bounds, sinus P/QRS correspondence, preserved P waves, dropped QRS, progressive PR/reset and independent AV clocks.');
