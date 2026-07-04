# ECG Lab v1.2.0

## Summary

ECG Lab v1.2.0 expands the Lead II ECG learning simulator from 12 to 17 rhythm
cases, focusing on foundational rhythms that are useful for comparison and
beginner learning.

## Highlights

- Added five Lead II-focused rhythm cases.
- Expanded the rhythm library from 12 to 17 cases.
- Added sinus bradycardia and sinus tachycardia for comparison with normal sinus rhythm.
- Added first-degree AV block for PR interval learning.
- Added Mobitz I / Wenckebach with educational progressive PR prolongation and dropped QRS behavior.
- Added junctional rhythm for comparing P-wave relationship with sinus bradycardia.
- Updated README, CHANGELOG, roadmap, and medical copy review documentation.

## Added Rhythm Cases

- Sinus Bradycardia
- Sinus Tachycardia
- First-degree AV Block
- Mobitz I / Wenckebach
- Junctional Rhythm

## Educational Improvements

- Helps learners compare NSR with slow and fast sinus rhythms.
- Helps learners understand PR prolongation.
- Helps learners compare Mobitz I and Mobitz II.
- Helps learners distinguish sinus bradycardia from junctional rhythm using P-wave relationship to QRS.
- Keeps the app scoped as a Lead II educational simulator.

## Validation

Recommended release checks:

```bash
npm run validate:ecg
npm run lint
npm run build
```

## Medical Disclaimer

ECG Lab is an educational simulator. It is not a diagnostic tool and does not
replace clinical diagnosis, emergency response, treatment decisions, patient
monitoring, or medical device output.

Lead II simulation is simplified and does not replace 12-lead ECG
interpretation. Medical copy should be reviewed before clinical teaching use.

## Known Limitations

- Not a diagnostic tool.
- Not a 12-lead ECG simulator.
- Not a clinical vectorcardiography engine.
- Waveforms are simplified/synthesized for education.
- Some rhythm behaviors are intentionally simplified for learning.
- Medical review is required before clinical teaching use.

## Next Roadmap

- Manual visual QA of the new five rhythm cases.
- Improve Quiz difficulty control as the case library grows.
- Add beginner/intermediate quiz modes.
- Continue medical copy review.
- Consider future rhythm additions only after v1.2 stability is confirmed.
- Keep 12-lead ECG and vectorcardiography as separately scoped future work.
