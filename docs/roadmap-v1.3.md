# ECG Lab v1.3 Roadmap

## Purpose

v1.3 aims to make the 17-case Lead II rhythm library easier to learn from by
letting learners compare similar waveforms directly, rather than only selecting
one rhythm at a time.

The goal is educational pattern comparison, not diagnosis or clinical decision
support.

## Planned Feature

Add Compare mode.

Compare mode displays two selected Lead II rhythm cases side by side, with:

- rhythm names and abbreviations
- severity badges
- muted ECG waveform canvases
- BPM values
- recognition points
- key differences
- a medical safety note

## Initial Comparison Pairs

- NSR vs Sinus Bradycardia
- Sinus Tachycardia vs SVT
- First-degree AV Block vs Mobitz I
- Mobitz I vs Mobitz II
- Sinus Bradycardia vs Junctional Rhythm
- AF vs AFL
- SVT vs VT

## Medical Safety

Compare mode is for ECG learning only. It does not replace clinical diagnosis,
treatment decisions, emergency response, patient monitoring, or medical device
output.

Real clinical interpretation requires 12-lead ECG, symptoms, vital signs,
patient background, and assessment by qualified healthcare professionals.

## Not In Scope

- New rhythm cases
- 12-lead ECG
- Vectorcardiography
- AI diagnosis
- Treatment recommendation
- ECG engine rewrite
- User accounts
- Data saving
