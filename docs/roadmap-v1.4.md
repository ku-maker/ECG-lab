# ECG Lab v1.4 Roadmap

## Status

Annotation overlay was prototyped but is currently disabled.

## Reason

Initial annotation labels were not reliable enough because they were not derived from the exact rendered ECG canvas coordinates. Even NSR labels could appear misaligned, which could mislead learners.

## Revised Direction

v1.4 will use static Waveform Guide diagrams instead of overlaying labels on the live ECG canvas.

## Waveform Guide

Waveform Guide diagrams are simplified educational diagrams shown in the Learning explanation area. They help learners understand P wave, QRS complex, T wave, PR interval, RR interval, and selected rhythm comparison concepts.

## Layout Improvement

The ECG monitor area will be made more compact so learning text and case explanations remain readable on both desktop and mobile.

## Medical Safety

Waveform Guide diagrams are educational diagrams only. They do not replace precise measurement, clinical diagnosis, treatment decisions, patient monitoring, emergency response, or medical device output.

## Not In Scope

- Shipping inaccurate waveform labels
- Overlaying labels on the live ECG canvas
- Approximate fixed-position labels over the real waveform
- Precise measurement calipers
- Automated ECG diagnosis
- Treatment recommendation
- 12-lead ECG
- Vectorcardiography
