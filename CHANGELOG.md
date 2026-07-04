# Changelog

## Unreleased

### Added

- Added Compare mode for side-by-side review of similar Lead II rhythm cases.
- Added preset comparison pairs for common beginner learning contrasts.

### Improved

- Polished Compare mode layout, documentation, and QA checklist coverage before v1.3 release.
- Improved rhythm learning workflow by helping learners compare similar patterns directly.

## 1.2.0 - Lead II Rhythm Expansion

### Added

- Added five Lead II-focused rhythm cases:
  - Sinus Bradycardia
  - Sinus Tachycardia
  - First-degree AV Block
  - Mobitz I / Wenckebach
  - Junctional Rhythm
- Added template JSON files for the new rhythm cases.
- Added educational Wenckebach rhythm behavior with progressive PR prolongation
  and dropped QRS beats.
- Added roadmap documentation for v1.2.

### Improved

- Expanded the implemented case library from 12 to 17 rhythms.
- Updated README implemented cases and learning descriptions.
- Updated medical copy review documentation to include new v1.2 rhythm cases.
- Improved Learning mode explanation cards with Overview, Key findings,
  Recognition tips, Common pitfalls, and Clinical note sections.
- Added Quiz answer feedback that explains the correct rhythm and key
  recognition points after each response.
- Added a safety note to Quiz feedback to keep the app clearly positioned as an
  ECG learning simulator.
- Reviewed educational copy wording to avoid diagnostic or treatment-substitute
  framing.

### Validation

- Confirmed new cases remain covered by ECG content validation.
- Maintained educational/non-diagnostic safety positioning.
- Extended ECG content validation to check required education fields.
- Added a lightweight clinical note safety wording check.

## 1.0.0 - ECG Lab v1.0 MVP

ECG Lab v1.0 establishes the project as an educational Lead II ECG waveform
simulator. The release focuses on a stable MVP for observing representative
rhythms, switching cases, practicing recognition, and reviewing simplified
conduction concepts.

### Added

- Lead II waveform simulator with smooth real-time scrolling.
- Learning mode for rhythm selection, BPM review, controls, and case explanations.
- Quiz mode with randomized four-choice rhythm recognition practice.
- Conduction Map for synchronizing an NSR Lead II waveform with a simplified
  stimulus-conduction concept animation.
- 12 implemented rhythm cases:
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
- Audio controls with mute and volume adjustment.
- QRS-synchronized educational beeps and warning-style behavior for relevant
  scenarios.
- VT/VF shock interaction with artifact, flatline, recovery, and reset support.
- ECG content validation script: `npm run validate:ecg`.
- v1.0 manual QA checklist in `docs/v1-qa-checklist.md`.
- README documentation with medical disclaimer and current scope.

### Known Limitations

- Not a diagnostic tool.
- Not a 12-lead ECG simulator.
- Not a clinical vectorcardiography engine.
- Waveforms are simplified/synthesized for education.
- Medical review is still required before clinical teaching use.
