import assert from 'node:assert/strict';
import { ECG_CASES } from '../data/ecgCases.ts';
import { buildQuizFeedback } from '../lib/quiz/feedback.ts';
import { COMPARISON_PAIRS } from '../data/comparisonPairs.ts';
const byId = id => ECG_CASES.find(c=>c.id===id);
for (const correct of ECG_CASES) {
  assert.equal(buildQuizFeedback(correct,ECG_CASES,null),null,'no explanation before answering');
  assert.equal(buildQuizFeedback(correct,[correct],'not-a-choice'),null,'reject foreign answer IDs');
  assert.equal(buildQuizFeedback(correct,[],correct.id),null,'reject missing question choices');
  for (const selected of ECG_CASES) {
    const result = buildQuizFeedback(correct,ECG_CASES,selected.id);
    assert.equal(result.correctCase.id,correct.id);
    assert.equal(result.selectedCase.id,selected.id);
    assert.equal(result.isCorrect,correct.id===selected.id);
    if(result.isCorrect) assert.equal(result.comparison,undefined);
    if(result.comparison) {
      assert.deepEqual(new Set([result.comparison.leftCaseId,result.comparison.rightCaseId]),new Set([correct.id,selected.id]));
    }
  }
}
for (const pair of COMPARISON_PAIRS) {
  for (const [correct, selected] of [[pair.leftCaseId,pair.rightCaseId],[pair.rightCaseId,pair.leftCaseId]]) {
    assert.equal(buildQuizFeedback(byId(correct),ECG_CASES,selected).comparison.id,pair.id);
  }
}
assert.equal(buildQuizFeedback(byId('nsr'),[byId('af')],'af'),null,'correct answer must also belong to the question');
assert.equal(buildQuizFeedback(byId('nsr'),ECG_CASES,'vf').comparison,undefined,'do not substitute an unrelated comparison');
console.log('PASS: answer gating, valid choices, all 289 answer combinations, all comparison pairs in both directions and unrelated-pair fallback.');
