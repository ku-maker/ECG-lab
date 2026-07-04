# ECG Lab v1.4 Roadmap

## Status

Annotation overlay and static waveform diagrams were prototyped but are currently disabled.

## Reason

Initial annotation labels and waveform diagrams were not reliable enough for ECG learning use. Even NSR labels or diagrams could appear misaligned or misleading, creating a risk of incorrect pattern learning.

## Revised Direction

v1.4 will use text-based Observation Guides instead of overlaying labels or showing waveform diagrams.

## Observation Guide

Observation Guides explain what to look for in each rhythm pattern using text. They help learners focus on rhythm regularity, P-wave visibility, QRS width, PR behavior, dropped beats, chaotic rhythm, and other high-level recognition points without placing labels on a waveform.

## Layout Improvement

The ECG monitor area will be made more compact so learning text and case explanations remain readable on both desktop and mobile.

## Medical Safety

Observation Guides are educational aids only. They do not replace precise measurement, clinical diagnosis, treatment decisions, patient monitoring, emergency response, or medical device output.

## Not In Scope

- Shipping inaccurate waveform labels
- Overlaying labels on the live ECG canvas
- Static waveform diagrams with potentially misleading positions
- Approximate fixed-position labels over the real waveform
- Precise measurement calipers
- Automated ECG diagnosis
- Treatment recommendation
- 12-lead ECG
- Vectorcardiography
