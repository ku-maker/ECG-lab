import assert from 'node:assert/strict';
import { gridSpacing, pointToSignal, signalToPoint } from '../lib/ecg/monitorScale.ts';
import { emptyProgress, parseProgress, recordAttempt, summarizeProgress, chooseReviewCase } from '../lib/quiz/progress.ts';

// A five-small-box interval is always 200 ms / 0.5 mV, regardless of viewport or auto gain.
for (const width of [320, 390, 768, 1440]) {
  for (const pxPerMv of [25, 52, 80]) {
    const scale = { width, height: 180, visibleMs: 6000, baselineY: 90, pxPerMv };
    const grid = gridSpacing(scale);
    const from = pointToSignal(0, 90, scale);
    const to = pointToSignal(grid.x * 5, 90 - grid.y * 5, scale);
    assert.ok(Math.abs(to.timeMs - from.timeMs - 200) < 1e-9);
    assert.ok(Math.abs(to.mv - from.mv - 0.5) < 1e-9);
    const cursor = signalToPoint({ timeMs: 1000, mv: 1 }, scale);
    const measured = pointToSignal(cursor.x, cursor.y, scale);
    assert.ok(Math.abs(measured.timeMs - 1000) < 1e-9);
    assert.equal(measured.mv, 1);
  }
}
const ids = ['nsr', 'vf', 'vt'];
assert.deepEqual(parseProgress('broken json', ids), emptyProgress());
assert.deepEqual(parseProgress('{"version":2,"attempts":[]}', ids), emptyProgress());
assert.deepEqual(parseProgress(JSON.stringify({ version: 1, attempts: [null, {}, {caseId:'unknown',selectedCaseId:'vf',at:1}] }), ids), emptyProgress());
let progress = recordAttempt(emptyProgress(), { caseId: 'vf', selectedCaseId: 'vt', at: 1 });
assert.deepEqual(summarizeProgress(progress), { total: 1, correct: 0, missedCaseIds: ['vf'] });
progress = recordAttempt(progress, { caseId: 'vf', selectedCaseId: 'vf', at: 2 });
assert.deepEqual(summarizeProgress(progress), { total: 2, correct: 1, missedCaseIds: [] });
progress = recordAttempt(progress, { caseId: 'vf', selectedCaseId: 'nsr', at: 3 });
assert.deepEqual(summarizeProgress(progress).missedCaseIds, ['vf']);
assert.deepEqual(parseProgress(JSON.stringify(progress), ids), progress);
assert.equal(chooseReviewCase(['vf', 'vt'], 'vf', () => 0), 'vt');
assert.equal(chooseReviewCase(['vf'], 'vf', () => 0), 'vf');
assert.equal(chooseReviewCase([], 'vf'), undefined);
for (let i = 0; i < 120; i++) progress = recordAttempt(progress, {caseId:'nsr',selectedCaseId:'nsr',at:4+i});
assert.equal(progress.attempts.length, 100);
assert.equal(summarizeProgress(progress).correct, 100);
assert.deepEqual(summarizeProgress(progress).missedCaseIds, []);
console.log('PASS: monitor calibration across 12 viewport/gain combinations; calipers; quiz persistence, validation, history cap and review transitions.');
