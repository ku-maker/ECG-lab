# ECG Lab v1.0 QA Checklist

Use this checklist before publishing ECG Lab v1.0. The goal is to confirm that
the current Lead II simulator experience is stable, understandable, and safe to
show as an educational tool.

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

## Shock / Audio

- [ ] VT enables the Shock control.
- [ ] VF enables the Shock control.
- [ ] NSR and non-shockable cases do not present a misleading Shock action.
- [ ] Shock artifact, flatline, and recovery display without obvious visual breaks.
- [ ] Reset returns the current scenario to a usable initial state.
- [ ] Audio on/off works.
- [ ] Volume adjustment works.
- [ ] QRS beeps remain reasonably synchronized with visible beats.
- [ ] VF/flatline warning audio does not continue incorrectly after switching or resetting.

## Conduction Map

- [ ] The Conduction tab opens.
- [ ] The screen is labeled as Conduction Map / stimulus-conduction learning, not full vectorcardiography.
- [ ] Lead-like view controls can be changed.
- [ ] The note explaining that this is not true 12-lead waveform generation is visible.
- [ ] The conceptual disclaimer is visible.
- [ ] Moving the slider updates the Lead II waveform progress.
- [ ] Moving the slider updates the conduction animation.
- [ ] P wave, QRS, ST segment, T wave, and rest labels appear at plausible points.
- [ ] The view remains usable at mobile width.

## Responsive / Basic

- [ ] Desktop layout does not show major overlapping or clipped controls.
- [ ] Mobile layout remains minimally usable for Learning and Quiz modes.
- [ ] Initial page load does not produce serious console errors.
- [ ] Reloading the page starts in a usable default state.
- [ ] README still includes the medical disclaimer.
- [ ] `npm run validate:ecg` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes before deployment.
