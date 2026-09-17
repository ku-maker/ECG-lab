import assert from 'node:assert/strict';
import { loadRenderer } from './helpers/load-renderer.mjs';
import { templateToBeatMs, beatToTemplateMs, getMaxLearningBpm } from '../lib/ecg/rateTiming.ts';
import { buildTeachingMarks } from '../lib/ecg/teachingHighlights.ts';
import { assessMeasurement, describeEndpoint } from '../lib/ecg/measurementPractice.ts';
import { ECG_CASES } from '../data/ecgCases.ts';
import { QUIZ_REASONS, getReasonChoices } from '../data/quizReasons.ts';
import { parsePreferences, defaultPreferences } from '../lib/learningPreferences.ts';
import {parseAppMode} from '../components/appMode.ts';
import { emptyProgress, parseProgress, recordAttempt, recordReasonAttempt, summarizeProgress, summarizeReasons } from '../lib/quiz/progress.ts';
import { getReasonReviewIds, createQuizQuestion } from '../lib/quiz/questions.ts';
import { REASON_TOPICS } from '../data/quizReasons.ts';
const { renderer, templates, normal } = loadRenderer();
const validIds = ECG_CASES.map(c => c.id);
assert.deepEqual(REASON_TOPICS.flatMap(t => [...t.caseIds]).sort(), [...validIds].sort(), 'every case has exactly one review topic');
let reasonProgress = recordAttempt(emptyProgress(), {caseId:'sinus-brady', selectedCaseId:'sinus-brady', at:1});
assert.deepEqual(summarizeReasons(reasonProgress), {total:0,correct:0,missedCaseIds:[]}, 'old history remains valid');
reasonProgress = recordReasonAttempt(reasonProgress, {caseId:'sinus-brady', selectedReason:QUIZ_REASONS['sinus-brady'].alternatives[0], at:2});
assert.deepEqual(summarizeReasons(reasonProgress), {total:1,correct:0,missedCaseIds:['sinus-brady']});
assert.equal(summarizeProgress(reasonProgress).correct,1, 'reason failures do not change diagnosis score');
reasonProgress = recordAttempt(reasonProgress, {caseId:'sinus-brady', selectedCaseId:'sinus-brady', at:3});
assert.deepEqual(summarizeReasons(reasonProgress).missedCaseIds,['sinus-brady'], 'diagnosis success does not clear reason weakness');
assert.deepEqual(getReasonReviewIds(['sinus-brady','avblock1'], 'basic', 'rhythm'), ['sinus-brady']);
assert.deepEqual(getReasonReviewIds(['sinus-brady','avblock1'], 'block', 'rhythm'), []);
assert.equal(createQuizQuestion(42, getReasonReviewIds(['sinus-brady'], 'basic', 'rhythm')[0], 'basic').correctCase.id, 'sinus-brady');
assert.deepEqual(parseProgress(JSON.stringify(reasonProgress),validIds),reasonProgress, 'reason history survives persistence');
reasonProgress = recordReasonAttempt(reasonProgress, {caseId:'sinus-brady',selectedReason:QUIZ_REASONS['sinus-brady'].correct,at:4});
assert.deepEqual(summarizeReasons(reasonProgress), {total:2,correct:1,missedCaseIds:[]});
const badReasons = parseProgress(JSON.stringify({version:1,attempts:[],reasonAttempts:[null,{}, {caseId:'nsr',selectedReason:'unknown',at:1},{caseId:'nsr',selectedReason:QUIZ_REASONS.nsr.correct,at:-1}]}),validIds);
assert.deepEqual(badReasons.reasonAttempts, []);
for (let i=0;i<105;i++) reasonProgress=recordReasonAttempt(reasonProgress,{caseId:'nsr',selectedReason:QUIZ_REASONS.nsr.correct,at:5+i});
assert.equal(reasonProgress.reasonAttempts.length,100);
assert.equal(reasonProgress.attempts.length,2, 'reason history limit is independent');
assert.equal(summarizeReasons(emptyProgress()).total,0, 'reset clears both histories');
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-6, a+' != '+b);
for (const [id, referenceRate] of [['nsr',60],['sinus-brady',45],['sinus-tachy',120],['avblock1',60],['junctional',60],['vt',160]]) {
  const t = templates.find(t => t.id === id+'-lead2-v0');
  const f=t.fiducialsMs, refScale=60000/referenceRate/t.durationMs;
  for(let bpm=40;bpm<=getMaxLearningBpm(id);bpm+=5) {
    const period=60000/bpm, at=x=>templateToBeatMs(t,x,period);
    near(at(f.qrsOff)-at(f.qrsOn),(f.qrsOff-f.qrsOn)*refScale);
    if(f.pOn!==undefined) near(at(f.qrsOn)-at(f.pOn),(f.qrsOn-f.pOn)*refScale);
    for(let ms=0;ms<t.durationMs;ms+=7) near(beatToTemplateMs(t,at(ms),period),ms);
    for(let ms=f.qrsOn;ms<=f.qrsOff;ms+=3) {
      near(renderer.getRhythmValueAtTimeMs(t,at(ms),bpm,'regular'),renderer.getTemplateValueAtMs(t,ms));
    }
    const peaks=[];renderer.forEachQrsPeakInRange(t,0,period*5,bpm,'regular',time=>peaks.push(time));
    assert.equal(peaks.length,5);
    peaks.forEach((time,i)=> {near(time,i*period+at(f.r));assert.ok(renderer.getRhythmValueAtTimeMs(t,time,bpm,'regular')>.5);});
  }
}
for(const bpm of [40,60,100]) {
  const t=templates.find(t=>t.id==='wenckebach-lead2-v0');
  const marks=buildTeachingMarks(t,normal,bpm,0,60000/bpm*4,'pr').filter(m=>m.kind==='pr');
  assert.deepEqual(marks.map(m=>Math.round(m.endMs-m.startMs)),[266,356,446]);
}
const marks=[{kind:'pr',label:'PR',startMs:200,endMs:360},{kind:'pr',label:'PR',startMs:1200,endMs:1360}];
assert.equal(assessMeasurement([{timeMs:200},{timeMs:360}],marks).correct,true);
assert.equal(assessMeasurement([{timeMs:1360},{timeMs:1200}],marks).correct,true);
assert.equal(assessMeasurement([{timeMs:220},{timeMs:340}],marks).correct,true);
assert.equal(assessMeasurement([{timeMs:600},{timeMs:760}],marks).correct,false,'right duration at wrong place');
assert.equal(assessMeasurement([{timeMs:200},{timeMs:1360}],marks).correct,false,'one beat skipped');
assert.equal(assessMeasurement([{timeMs:NaN},{timeMs:360}],marks),null);
assert.equal(assessMeasurement([],marks),null);
const shifted = assessMeasurement([{timeMs:390},{timeMs:230}], marks);
assert.equal(shifted.measuredMs,160);
assert.equal(shifted.startOffsetMs,30);
assert.equal(shifted.endOffsetMs,30);
assert.equal(shifted.correct,false);
assert.equal(describeEndpoint('始点', shifted.startOffsetMs),'始点：左へ約30 ms');
assert.equal(describeEndpoint('終点', -35),'終点：右へ約35 ms');
assert.equal(describeEndpoint('始点', -20),'始点：基準位置の範囲内');
const oneEnd = assessMeasurement([{timeMs:200},{timeMs:400}], marks);
assert.equal(oneEnd.startOffsetMs,0);
assert.equal(oneEnd.endOffsetMs,40);
for(const c of ECG_CASES) {
  assert.ok(QUIZ_REASONS[c.id],c.id+' reason exists');
  const positions=new Set();
  for(const seed of [0,1,2,995]) {
    const q=getReasonChoices(c.id,seed);
    assert.equal(new Set(q.options).size,3);assert.ok(q.options.includes(q.correct));
    positions.add(q.options.indexOf(q.correct));
  }
  assert.equal(positions.size,3);
}
for(const raw of [null,'broken','null','[]','{"version":2}']) assert.deepEqual(parsePreferences(raw),defaultPreferences());
for(const mode of ['learning','quiz','compare','vector','twelve']) assert.equal(parseAppMode(mode),mode);
for(const mode of [null,'broken','']) assert.equal(parseAppMode(mode),'learning');
const saved={version:1,learning:{caseId:'avblock1',bpm:180,paused:true,teachingStep:0,mobileFocus:'explanation',scrollTop:100},quizScope:'block',quizMobileFocus:'explanation'};
const restored=parsePreferences(JSON.stringify(saved));
assert.equal(restored.learning.bpm,100);assert.equal(restored.learning.teachingStep,0);
assert.equal(restored.learning.mobileFocus,'explanation');assert.equal(restored.quizScope,'block');
assert.equal(restored.learning.scrollTop,undefined,'scroll position is page-local');
assert.deepEqual(parsePreferences(JSON.stringify(restored)),restored);
const invalid=parsePreferences(JSON.stringify({version:1,learning:{caseId:'nsr',bpm:'fast',teachingStep:999},quizScope:'unknown'}));
assert.equal(invalid.learning.bpm,60);assert.equal(invalid.learning.teachingStep,null);assert.equal(invalid.quizScope,'basic');
const locked=parsePreferences(JSON.stringify({version:1,learning:{caseId:'svt',bpm:50}}));
assert.equal(locked.learning.bpm,180);
console.log('PASS: fixed PR/QRS and actual morphology across supported rates, inverse timing, R events, Wenckebach delays, measurement endpoints, 17 reason exercises, preference validation.');
