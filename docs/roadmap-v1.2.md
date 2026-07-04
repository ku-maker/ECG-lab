# ECG Lab v1.2 Roadmap

## Purpose

ECG Lab v1.2 extends the v1.0/v1.1 Lead II learning simulator with a small set
of foundational rhythm cases that are useful to compare against the existing
arrhythmia library.

The goal is not to build a diagnostic ECG system. The goal is to make common
Lead II rhythm patterns easier to observe, compare, and quiz in an educational
setting.

## Added Cases

- Sinus Bradycardia
- Sinus Tachycardia
- First-degree AV Block
- Mobitz I / Wenckebach
- Junctional Rhythm

## Learning Goals

- Compare normal sinus rhythm with slow and fast sinus rhythms.
- Recognize prolonged PR interval without dropped beats.
- Compare Mobitz I gradual PR prolongation with Mobitz II dropped QRS beats.
- Compare sinus bradycardia with junctional rhythm by looking at P-wave
  relationship to QRS.

## Medical Review

All new educational copy should be reviewed before clinical teaching use.
ECG Lab remains an educational simulator and does not replace clinical
diagnosis, emergency response, treatment decisions, patient monitoring, or
medical device output.

## Not In Scope

- New 12-lead waveform generation
- Bundle branch block diagnosis
- Axis deviation
- STEMI localization
- Clinical vectorcardiography
- AI diagnosis or treatment recommendation
- Large waveform engine refactoring
