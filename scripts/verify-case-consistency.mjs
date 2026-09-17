import assert from 'node:assert/strict';
import { ECG_CASES } from '../data/ecgCases.ts';
import { buildTeachingMarks, getTeachingSteps } from '../lib/ecg/teachingHighlights.ts';
import { templateToBeatMs } from '../lib/ecg/rateTiming.ts';
import { loadRenderer } from './helpers/load-renderer.mjs';
const {renderer:r, templates, normal} = loadRenderer();
const template = id => templates.find(t => t.id === ECG_CASES.find(c => c.id === id).templateId);
const peaks = (c, end = 10000) => { const p=[]; r.forEachQrsPeakInRange(template(c.id), 0,end,c.initialBpm,c.rhythm,t=>p.push(t)); return p; };
const near = (a,b,tol=1e-6) => assert.ok(Math.abs(a-b)<=tol, `${a} != ${b}`);
for (const c of ECG_CASES) {
  const t=template(c.id); assert.ok(t); assert.equal(c.learningPoints.length,3);
  const sample = time => r.getRhythmValueAtTimeMs(t,time,c.initialBpm,c.rhythm);
  const values=Array.from({length:3201},(_,i)=>sample(i*5-6000));
  assert.ok(values.every(Number.isFinite),c.id+' has finite rendered samples');
  assert.ok(Math.max(...values)-Math.min(...values)>.25,c.id+' has a visible signal');
  const p=peaks(c); assert.equal(p.length>0,c.id!=='vf',c.id+' QRS events');
  for (const focus of getTeachingSteps(c.id)) {
    const marks=buildTeachingMarks(t,normal,c.initialBpm,-6000,0,focus.kind);
    assert.ok(marks.length,c.id+' annotations in prefill');
    for (const mark of marks.filter(m=>m.kind==='p' || m.kind==='qrs')) {
      let amplitude=0;
      for(let time=mark.startMs;time<mark.endMs;time+=1) amplitude=Math.max(amplitude,Math.abs(sample(time)));
      assert.ok(amplitude>.05,c.id+' annotation contains the rendered wave');
    }
  }
  console.log(`PASS ${c.id}: rendered signal, QRS events, copy, annotations (${p.length} QRS / 10 s)`);
}
for(const id of ['nsr','sinus-brady','sinus-tachy']) {
 const c=ECG_CASES.find(c=>c.id===id), t=template(id), scale=60000/c.initialBpm/t.durationMs;
 const pr=(t.fiducialsMs.qrsOn-t.fiducialsMs.pOn)*scale;
 const qrs=(t.fiducialsMs.qrsOff-t.fiducialsMs.qrsOn)*scale;
 assert.ok(pr>=120 && pr<=200,id+' initial PR 120–200 ms'); assert.ok(qrs<120,id+' initial narrow QRS');
 const p=peaks(c); p.slice(1).forEach((v,i)=>near(v-p[i],60000/c.initialBpm));
}
assert.ok(template('avblock1').fiducialsMs.qrsOn-template('avblock1').fiducialsMs.pOn>200);
for(const id of ['pvc','pac']) for(const bpm of [40,60,75,120,180]) {
 const c=ECG_CASES.find(c=>c.id===id), cycle=id==='pvc'?r.getPvcCycleMs(bpm):r.getPacCycleMs(bpm);
 const pos=id==='pvc'?r.getPvcCyclePosition(0,bpm):r.getPacCyclePosition(0,bpm);
 near(cycle,pos.pauseEndMs);
 const p=[];r.forEachQrsPeakInRange(template(id),0,cycle,bpm,c.rhythm,time=>p.push(time));
 assert.equal(p.length,4,id+' has 3 normal beats and one premature beat');
 assert.ok(p[3]-p[2] < 60000/bpm,id+' premature coupling');
 for(const time of p) {
  const value=r.getRhythmValueAtTimeMs(template(id),time,bpm,c.rhythm);
  assert.ok(value>.6,id+' event corresponds to visible R peak');
 }
 near(r.getRhythmValueAtTimeMs(template(id),cycle-1,bpm,c.rhythm),0);
}
const af=peaks(ECG_CASES.find(c=>c.id==='af')); const gaps=af.slice(1).map((p,i)=>p-af[i]);
assert.ok(Math.max(...gaps)-Math.min(...gaps)>80,'AF irregular RR');
const sinusArrhythmia=peaks(ECG_CASES.find(c=>c.id==='sinus-arrhythmia'));
const sinusGaps=sinusArrhythmia.slice(1).map((p,i)=>p-sinusArrhythmia[i]);
assert.ok(Math.max(...sinusGaps)-Math.min(...sinusGaps)>80,'sinus arrhythmia variable RR');
const bigeminy=peaks(ECG_CASES.find(c=>c.id==='pvc-bigeminy'));
const bigeminyGaps=bigeminy.slice(1).map((p,i)=>p-bigeminy[i]);
assert.ok(bigeminyGaps.every((gap,i)=>i<2 || Math.abs(gap-bigeminyGaps[i-2])<1e-6),'bigeminy alternates short and long RR');
const atrialBigeminy=peaks(ECG_CASES.find(c=>c.id==='pac-bigeminy'));
const atrialBigeminyGaps=atrialBigeminy.slice(1).map((p,i)=>p-atrialBigeminy[i]);
assert.ok(atrialBigeminyGaps.every((gap,i)=>i<2 || Math.abs(gap-atrialBigeminyGaps[i-2])<1e-6),'atrial bigeminy alternates short and long RR');
const escape=peaks(ECG_CASES.find(c=>c.id==='ventricular-escape'));
escape.slice(1).forEach((v,i)=>near(v-escape[i],60000/35));
const pacedCase=ECG_CASES.find(c=>c.id==='ventricular-paced'), pacedTemplate=template('ventricular-paced');
const pacedBeatMs=60000/pacedCase.initialBpm;
const pacedQrsOn=templateToBeatMs(pacedTemplate,pacedTemplate.fiducialsMs.qrsOn,pacedBeatMs);
let pacedSpike=0;
for(let time=pacedQrsOn-60;time<pacedQrsOn;time+=1) pacedSpike=Math.max(pacedSpike,r.getRhythmValueAtTimeMs(pacedTemplate,time,pacedCase.initialBpm,pacedCase.rhythm));
assert.ok(pacedSpike>1.5,'ventricular paced rhythm has a visible spike before QRS');
for(const [id,rate] of [['svt',180],['afl',75],['avblock3',35]]) {
 const p=peaks(ECG_CASES.find(c=>c.id===id));p.slice(1).forEach((v,i)=>near(v-p[i],60000/rate));
}
for(const id of ['mobitz2','wenckebach']) assert.equal(peaks(ECG_CASES.find(c=>c.id===id),4000).length,3,id+' one dropped QRS / 4 atrial beats');
const st=template('stemi');assert.ok(r.getRhythmValueAtTimeMs(st,550/65*60,65,'regular')-r.getRhythmValueAtTimeMs(normal,550/65*60,65,'regular')>.2,'ST elevation is actually rendered');
console.log(`PASS: all ${ECG_CASES.length} cases at initial settings; sinus PR/QRS, sinus arrhythmia, ectopy/bigeminy timing, AF irregularity, fixed clocks, AV dropped beats and ST elevation.`);
