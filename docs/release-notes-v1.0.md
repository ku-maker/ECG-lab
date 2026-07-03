# ECG Lab v1.0

## Summary

ECG Lab v1.0 is an educational web simulator focused on representative Lead II
ECG waveforms. It lets healthcare learners observe real-time rhythms, switch
between common cases, review BPM behavior, practice with quizzes, and explore a
simplified conduction concept map.

This release marks the project as a v1.0 MVP: useful for learning and
demonstration, while intentionally scoped away from clinical diagnosis,
12-lead ECG generation, and full vectorcardiography.

## Highlights

- Smooth Lead II-centered real-time ECG waveform simulation.
- Learning mode with rhythm presets, BPM display, controls, and explanations.
- Quiz mode with randomized four-choice rhythm recognition.
- Conduction Map that synchronizes an NSR Lead II waveform with a simplified
  stimulus-conduction animation.
- Audio controls with mute and volume adjustment.
- VT/VF shock interaction with artifact, flatline, recovery, and reset support.
- ECG content validation command for release confidence.
- Manual v1.0 QA checklist.
- README medical disclaimer and scope clarification.

## Implemented Cases

- Normal Sinus Rhythm (NSR)
- Atrial Fibrillation (AF)
- Premature Ventricular Contraction (PVC)
- Premature Atrial Contraction (PAC)
- Second-degree AV Block, Mobitz II
- Supraventricular Tachycardia (SVT)
- ST-elevation Myocardial Infarction (STEMI)
- Torsades de Pointes (TdP)
- Atrial Flutter (AFL)
- Third-degree AV Block / Complete AV Block
- Ventricular Tachycardia (VT)
- Ventricular Fibrillation (VF)

## Validation

Recommended release checks:

```bash
npm run validate:ecg
npm run lint
npm run build
```

The ECG content validation checks template JSON files and case definitions for
required fields, sample validity, fiducial ranges, fiducial ordering, duplicate
case IDs, and template ID consistency.

Manual release QA is documented in:

```txt
docs/v1-qa-checklist.md
```

## Medical Disclaimer

ECG Lab is an educational simulator for healthcare professionals, students, and
learners. Do not use it as a substitute for clinical diagnosis, treatment
decisions, emergency response, patient monitoring, or medical device output.

Waveforms are simplified and/or synthesized for learning purposes, and may
differ from real patient ECGs.

## Known Limitations

- Not a diagnostic tool.
- Not a 12-lead ECG simulator.
- Not a clinical vectorcardiography engine.
- Waveforms are simplified/synthesized for education.
- Medical review is still required before clinical teaching use.

## Next Roadmap

- Stabilize the v1.0 Lead II simulator experience after real learner feedback.
- Continue improving educational explanations and case copy.
- Add focused regression checks around rhythm switching, shock state, quiz
  generation, and audio controls.
- Expand waveform templates only after the current simulator behavior remains
  stable.
- Treat any future 12-lead ECG or vectorcardiography work as a separately
  scoped feature.
