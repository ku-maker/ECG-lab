import assert from 'node:assert/strict';
import { QUIZ_SCOPES, createQuizQuestion, getScopedReviewIds } from '../lib/quiz/questions.ts';
for(const scope of QUIZ_SCOPES) {
 for(let seed=1;seed<=200;seed++) {
  const q=createQuizQuestion(seed,null,scope.id);
  assert.ok(scope.caseIds.includes(q.correctCase.id));
  assert.equal(q.choices.length,Math.min(4,scope.caseIds.length));
  assert.equal(new Set(q.choices.map(c=>c.id)).size,q.choices.length);
  assert.ok(q.choices.some(c=>c.id===q.correctCase.id));
  assert.ok(q.choices.every(c=>scope.caseIds.includes(c.id)));
 }
 for(const target of scope.caseIds) assert.equal(createQuizQuestion(9,target,scope.id).correctCase.id,target);
 assert.ok(scope.caseIds.includes(createQuizQuestion(9,'invalid',scope.id).correctCase.id));
 assert.deepEqual(getScopedReviewIds(['nsr','pvc','avblock3','invalid'],scope.id),['nsr','pvc','avblock3'].filter(id=>scope.caseIds.includes(id)));
}
console.log('PASS: all scopes across 800 questions; choice counts, no out-of-scope answers, review boundaries and invalid targets.');
