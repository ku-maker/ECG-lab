# ECG Lab v1.3.0

## Summary

ECG Lab v1.3.0 adds Compare mode, allowing learners to review two similar Lead
II rhythm cases side by side and focus on key differences such as P-wave
visibility, RR regularity, QRS width, PR interval behavior, and rhythm
regularity.

## Highlights

- Added Compare mode.
- Added side-by-side ECG waveform comparison.
- Added preset comparison pairs.
- Added focus text and key differences for each comparison pair.
- Kept Compare mode audio muted to avoid duplicate ECG sounds.
- Updated README, CHANGELOG, roadmap, and QA checklist.
- Maintained educational/non-diagnostic safety positioning.

## Compare Mode

Compare mode is an educational mode for observing two selected Lead II rhythm
cases side by side.

It includes:

- rhythm names and abbreviations
- severity badges
- BPM values
- muted ECG waveform canvases
- recognition points
- clinical notes
- key differences
- safety note

## Initial Comparison Pairs

- NSR vs Sinus Bradycardia
- Sinus Tachycardia vs SVT
- First-degree AV Block vs Mobitz I
- Mobitz I vs Mobitz II
- Sinus Bradycardia vs Junctional Rhythm
- AF vs AFL
- SVT vs VT

## Educational Improvements

- Helps learners compare similar rhythms directly.
- Helps learners focus on P-wave visibility, RR regularity, QRS width, PR
  interval behavior, and rhythm regularity.
- Helps distinguish common look-alike rhythms.
- Deepens understanding of the existing 17-case library without adding new rhythms.
- Keeps the app focused on Lead II learning.

## Validation

Recommended release checks:

```bash
npm run validate:ecg
npm run lint
npm run build
```

## Medical Disclaimer

ECG Lab is an educational simulator. Compare mode is for ECG learning only.

It is not a diagnostic tool and does not replace clinical diagnosis, emergency
response, treatment decisions, patient monitoring, or medical device output.

Lead II simulation is simplified and does not replace 12-lead ECG
interpretation. Medical copy should be reviewed before clinical teaching use.

## Known Limitations

- Not a diagnostic tool.
- Not a 12-lead ECG simulator.
- Not a clinical vectorcardiography engine.
- Compare mode uses simplified/synthesized Lead II waveforms.
- Comparison pairs are preset in v1.3.0.
- Some rhythm behaviors are intentionally simplified for learning.
- Medical review is required before clinical teaching use.

## Next Roadmap

- Manual visual QA of Compare mode on desktop and mobile.
- Consider optional custom left/right case selection in a future version.
- Consider beginner guidance for how to read ECG rhythm strips.
- Consider waveform annotation labels in a separately scoped future release.
- Continue medical copy review.
- Keep 12-lead ECG and vectorcardiography as separately scoped future work.
