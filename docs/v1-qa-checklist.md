# ECG Lab QA Checklist

Use this checklist before publishing ECG Lab updates. The goal is to confirm
that the current Lead II simulator experience is stable, understandable, and
safe to show as an educational tool.

## Learning Mode

- [ ] All 17 cases can be selected from the case selector.
- [ ] Each case renders an ECG waveform on the monitor canvas.
- [ ] Each case shows its educational explanation.
- [ ] Cases with adjustable BPM respond smoothly when the heart-rate control is changed.
- [ ] Cases with fixed or special BPM behavior do not expose confusing controls, or remain visually stable when controls are present.
- [ ] Switching between cases does not leave stale labels, stale HR values, or broken waveform state.

## Quiz Mode

- [ ] A quiz question is shown with the rhythm name hidden.
- [ ] Four answer choices are displayed.
- [ ] Selecting an answer shows correct or incorrect feedback.
- [ ] The correct answer is visually distinguishable after answering.
- [ ] The "Next Question" flow advances to another question.
- [ ] The same question is not repeated every time.

## Compare Mode

- [ ] Compare mode can be opened from the header navigation.
- [ ] Preset comparison pairs can be selected.
- [ ] Two ECG waveform cards are displayed side by side on desktop.
- [ ] Two ECG waveform cards stack vertically on narrow screens.
- [ ] Each compared case shows rhythm name, abbreviation, severity, BPM, waveform, recognition points, and clinical note.
- [ ] Key differences are displayed for the selected comparison pair.
- [ ] Safety note is displayed and clearly states that Compare mode is educational and not a diagnostic or treatment tool.
- [ ] Compare mode ECG canvases do not play duplicate audio.
- [ ] Switching away from Compare mode does not break Learning, Quiz, or Conduction modes.

## Observation Guide

- [ ] Observation Guide appears in Learning mode.
- [ ] Observation Guide is concise and easy to scan.
- [ ] Each guide uses short rhythm-reading checklist items.
- [ ] No waveform labels or static waveform diagrams are shown.
- [ ] Safety note remains visible but does not dominate the card.
- [ ] Mobile layout remains readable without dense paragraphs.
- [ ] Quiz mode does not reveal Observation Guide during questions.
- [ ] Live ECG canvas does not show annotation labels.

## Layout / Readability

- [ ] ECG monitor height leaves enough space for case explanations on desktop.
- [ ] ECG monitor height leaves enough space for learning text on mobile.
- [ ] ECG monitor height does not dominate the screen on mobile.
- [ ] Observation Guide is reachable with less scrolling after selecting a case.
- [ ] Observation Guide and case explanation remain readable without excessive scrolling.
- [ ] Mobile Learning view does not show an unnecessary parameter-control heading.
- [ ] Case explanation text uses most of the available mobile width.
- [ ] Observation Guide remains readable on narrow screens without excessive line breaks.

## Shock / Audio

- [ ] VT enables the Shock control.
- [ ] VF enables the Shock control.
- [ ] Non-shockable cases do not show a "除細動" label.
- [ ] VT/VF still show the SHOCK control and reset option.
- [ ] Non-shockable cases do not show a SHOCK button.
- [ ] Fixed-rate, non-shockable cases do not show an unnecessary reset card.
- [ ] Adjustable-rate cases still provide a way to return BPM and waveform to the initial state.
- [ ] BPM fixed badges such as "75固定" remain visible where appropriate.
- [ ] NSR and non-shockable cases do not present a misleading Shock action.
- [ ] Shock artifact, flatline, and recovery display without obvious visual breaks.
- [ ] Reset returns the current scenario to a usable initial state.
- [ ] Audio on/off works.
- [ ] Volume adjustment works.
- [ ] QRS beeps remain reasonably synchronized with visible beats.
- [ ] VF/flatline warning audio does not continue incorrectly after switching or resetting.

## Conduction Map (synchronized 12-lead view)

### Safety / positioning (keep visible)
- [ ] The Conduction tab opens.
- [ ] The screen is labeled as Conduction Map / stimulus-conduction learning, not full vectorcardiography.
- [ ] The disclaimer notes the waveform is a simplified per-lead dipole projection (precordial V1–V6 approximate), not a clinical 12-lead ECG.

### Lead switching drives all three (3D view + glow + waveform)
- [ ] Selecting each of the 12 leads changes (a) the 3D camera angle, (b) the conduction-path glow target, and (c) the 2D waveform.
- [ ] Waveform polarity is medically sensible: aVR mainly negative, II/aVF clearly positive, aVL near-flat (small P/T, isoelectric QRS).
- [ ] Lead II looks like normal NSR (upright P, sharp upright R, upright T).
- [ ] Switching between coincident simplified leads (e.g. V4↔II, V6↔I) shows little/no change — this is an intended MVP limit, not a bug.

### Clock / synchronization
- [ ] Play animates the cycle; Pause holds the phase.
- [ ] With Play or the scrub slider, the 3D glow, waveform cursor, reveal, and %/ms/mV readout all move at the same phase.
- [ ] Grabbing/releasing the slider during playback does not make the phase jump.
- [ ] P wave, QRS, ST segment, T wave, and rest phase labels appear at plausible points.

### Repolarization glow
- [ ] During the T wave the ventricular tubes glow cyan uniformly (a single gentle rise/fall), with no light flowing/reversing along the tubes and no rapid flicker.
- [ ] QRS still shows the forward pink/purple pulse.

### 3D model
- [ ] The heart reads as a heart-like tapered shape (not an ellipsoid); conduction paths sit inside it with no tubes poking out near the apex.
- [ ] At rest the wireframe and paths are clearly visible.
- [ ] 3D node labels show on desktop and are hidden on mobile (node spheres remain).

### Layout / responsive
- [ ] The waveform is fully visible (never clipped) at any lead and any phase, on desktop and mobile (375px).
- [ ] The view remains usable at mobile width.

### Automated (objective gate)
- [ ] `npm run verify:all` exits 0 (lead axes, activation, evaluate, Lead II projection r≥0.90, clock, camera, all-lead projection, clock integration, repol glow, graph fit).
- [ ] `npm run lint`, type check, and `npm run build` pass.

## App Icons / Metadata

- [ ] Browser tab uses the ECG Lab logo favicon.
- [ ] App metadata uses the ECG Lab title and Japanese description.
- [ ] Social preview image uses the ECG Lab logo-based thumbnail.
- [ ] Header logo still displays correctly.
- [ ] OGP thumbnail uses a full dark background without visible white corner margins.
- [ ] App icons keep a dark background with a simple white ECG waveform.
- [ ] Header logo still matches the icon style.

## Responsive / Basic

- [ ] Desktop layout does not show major overlapping or clipped controls.
- [ ] Mobile layout remains minimally usable for Learning and Quiz modes.
- [ ] Initial page load does not produce serious console errors.
- [ ] Reloading the page starts in a usable default state.
- [ ] README still includes the medical disclaimer.
- [ ] `npm run validate:ecg` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes before deployment.
