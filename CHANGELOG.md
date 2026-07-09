# Changelog

## Unreleased

### Added

- Added text-based Observation Guide cards for ECG rhythm learning in Learning mode.
- Added rhythm-specific observation points without overlaying labels on the live ECG waveform.

### Improved

- Simplified Observation Guide cards into compact rhythm-reading checklists.
- Reduced long explanatory text in learning cards to improve readability on desktop and mobile.
- Reduced ECG monitor height slightly to improve access to Observation Guide and case explanations on desktop and mobile.
- Improved mobile readability by reducing panel headers, horizontal padding, and nested card width constraints in Learning mode.
- Improved readability by reducing the ECG monitor height so learning text and case explanations are easier to view.
- Kept the live ECG canvas focused on waveform simulation while moving learning guidance into text-based guide cards.

### Fixed

- Disabled the experimental ECG waveform annotation overlay because label positions were not reliable enough for ECG learning use.
- Removed inaccurate annotation controls from Learning and Compare views.
- Removed static waveform diagrams after visual review showed they could still be misleading.

### Safety

- Avoided exposing inaccurate ECG labels or diagrams that could cause misunderstanding during rhythm learning.
- Clarified that Observation Guides are learning aids and not precise measurement, diagnosis, treatment, monitoring, or medical device output.

## 1.3.0 - Rhythm Compare Mode

### Added

- Added Compare mode for side-by-side review of similar Lead II rhythm cases.
- Added preset comparison pairs for common rhythm learning contrasts:
  - NSR vs Sinus Bradycardia
  - Sinus Tachycardia vs SVT
  - First-degree AV Block vs Mobitz I
  - Mobitz I vs Mobitz II
  - Sinus Bradycardia vs Junctional Rhythm
  - AF vs AFL
  - SVT vs VT
- Added comparison focus text, key differences, and safety notes for each comparison pair.
- Added v1.3 roadmap documentation.

### Improved

- Improved rhythm learning workflow by helping learners compare similar patterns directly.
- Polished Compare mode layout for desktop and narrow screens.
- Updated README with Compare mode explanation.
- Updated QA checklist with Compare mode coverage.

### Safety

- Compare mode remains an educational feature and does not replace clinical diagnosis, treatment decisions, emergency response, patient monitoring, or medical device output.
- Compare mode keeps Lead II comparison scoped as simplified educational pattern learning.

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
