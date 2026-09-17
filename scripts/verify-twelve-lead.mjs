import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TWELVE_LEADS,REPORT_ROWS,isClinicalRecord,clinicalPath} from '../lib/ecg/twelveLead.ts';
import {CLINICAL_LESSONS} from '../data/twelveLeadLessons.ts';
assert.deepEqual([...REPORT_ROWS.flat()].sort(), [...TWELVE_LEADS].sort());
for(const lesson of CLINICAL_LESSONS){
 const r=JSON.parse(readFileSync(new URL(`../public/ecg/ptbxl/${lesson.id}.json`,import.meta.url)));
 assert.ok(isClinicalRecord(r));
 const header=readFileSync(new URL(`../public/ecg/ptbxl/${lesson.id}.hea`,import.meta.url),'utf8').trim().split('\n');
 assert.ok(r.sourceRecord.endsWith(lesson.record+'_hr'));
 for(const line of header.slice(1)){
  const f=line.split(/\s+/), name=({AVR:'aVR',AVL:'aVL',AVF:'aVF'})[f.at(-1)]??f.at(-1);
  const [,gain,baseline]=f[2].match(/([\d.]+)\((-?\d+)\)\/mV/);
  const digital=r.leads[name].map(v=>Math.round(v*Number(gain)+Number(baseline)));
  assert.equal(digital[0],Number(f[5]));
  assert.equal((digital.reduce((a,b)=>a+b,0)%65536+65536)%65536,Number(f[6])%65536);
  for(const start of [0,2.5,5,7.5]){
   const path=clinicalPath(r.leads[name],500,start,2.5,100);
   assert.equal((path.match(/[ML]/g)||[]).length,1250);
   assert.ok(!path.includes('NaN'));
  }
 }
}
assert.equal(clinicalPath([0,1,-1],500,0,1,100),'M0.00,100.00 L0.20,60.00 L0.40,140.00 ');
assert.equal(isClinicalRecord({}),false);
assert.equal(isClinicalRecord(null),false);
const broken=JSON.parse(readFileSync(new URL('../public/ecg/ptbxl/a.json',import.meta.url)));
broken.leads.V6.pop();assert.equal(isClinicalRecord(broken),false);
console.log(`PASS: ${CLINICAL_LESSONS.length} 500Hz/10s/12-lead records, source calibration/checksums, lead layout, all time windows and mV/time geometry.`);

const {parseTwelveLeadDraft,emptyTwelveLeadDraft}=await import('../lib/ecg/twelveLeadProgress.ts');
const {pointToSignal,signalToPoint}=await import('../lib/ecg/monitorScale.ts');
const draft={version:1,notes:['正常','','幅が広い','',''],evidence:['V1','V6'],answer:'完全右脚ブロック',reason:'V1とV6の形を比較',differential:'完全左脚ブロック',exclusion:'V1とV6の終末部が異なる',reflection:'幅も確認する',revealed:true};
assert.deepEqual(parseTwelveLeadDraft(JSON.stringify(draft)),draft);
for(const bad of [null,'broken','{}','{"version":2}']) assert.deepEqual(parseTwelveLeadDraft(bad),emptyTwelveLeadDraft());
const invalid=parseTwelveLeadDraft(JSON.stringify({...draft,evidence:['invalid'],reason:' '}));
assert.equal(invalid.revealed,true);assert.deepEqual(invalid.evidence,[]);
assert.equal(parseTwelveLeadDraft(JSON.stringify({...draft,answer:''})).revealed,false);
assert.equal(parseTwelveLeadDraft(JSON.stringify({...draft,differential:draft.answer})).differential,'');
const legacy={version:1,notes:draft.notes,evidence:draft.evidence,answer:draft.answer,reason:draft.reason,reflection:draft.reflection,revealed:true};
assert.equal(parseTwelveLeadDraft(JSON.stringify(legacy)).revealed,true);
assert.equal(parseTwelveLeadDraft(JSON.stringify({...draft,reason:'x'.repeat(6000)})).reason.length,5000);
for(const seconds of [2.5,10]){
 const scale={width:seconds*100,height:272,visibleMs:seconds*1000,baselineY:136,pxPerMv:40};
 const p=pointToSignal(25,96,scale);assert.equal(p.timeMs,250);assert.equal(p.mv,1);
 assert.deepEqual(signalToPoint(p,scale),{x:25,y:96});
 assert.equal(pointToSignal(41,136,scale).timeMs-p.timeMs,160);
}
console.log('PASS: saved answer validation, reflection roundtrip, invalid saved-state handling, 2.5s/10s caliper alignment.');

const {TWELVE_EXPLANATIONS}=await import('../data/twelveLeadExplanations.ts');
assert.deepEqual(Object.keys(TWELVE_EXPLANATIONS).sort(),CLINICAL_LESSONS.map(l=>l.id).sort());
for(const lesson of CLINICAL_LESSONS){
 const explanation=TWELVE_EXPLANATIONS[lesson.id];
 assert.equal(explanation.steps.length,3);
 for(const step of explanation.steps){
  assert.equal(new Set(step.leads).size,2);
  step.leads.forEach(l=>assert.ok(TWELVE_LEADS.includes(l)));
 }
 assert.ok(explanation.reasoning && explanation.distinction && explanation.checklist.length);
}
console.log(`PASS: all ${CLINICAL_LESSONS.length} lesson explanations have valid two-lead observation targets.`);

const {formatTwelveLeadNotes}=await import('../lib/ecg/twelveLeadProgress.ts');
const exported=formatTwelveLeadNotes([{...draft,reason:'観察1\n観察2'}]);
assert.ok(exported.includes('観察1\n観察2'));
assert.ok(exported.includes(draft.reflection));
assert.ok(exported.includes('V1・V6'));
for (let i=1;i<=CLINICAL_LESSONS.length;i++) assert.ok(exported.includes(`症例 ${i}（PTB-XL 記録`));
assert.ok(!formatTwelveLeadNotes([]).includes('完全左脚ブロック'));
console.log('PASS: memo export preserves multiline observations and reflection without disclosing lesson answers.');
