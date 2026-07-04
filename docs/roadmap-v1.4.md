# ECG Lab v1.4 Roadmap

## Purpose

v1.4は、既存17症例のLead II波形に学習用ラベルを表示し、初学者がP波、QRS、T波、PR間隔、RR間隔などの観察ポイントを理解しやすくすることを目的とする。

## Planned Feature

Annotation overlayを追加します。

Learning modeとCompare modeで、必要なときだけECG canvas上に簡易ラベルを重ねられるようにします。初期状態はOFFとし、通常の波形観察を妨げないことを優先します。

## Initial Annotation Targets

- P wave
- QRS complex
- T wave
- PR interval
- RR interval
- Dropped QRS, where appropriate
- Wide QRS, where appropriate
- Irregular RR, where appropriate

## Supported Modes

- Learning mode
- Compare mode
- Quiz mode is intentionally not annotated by default

## Medical Safety

Annotation overlayは心電図学習用の概念表示です。

正確な計測、診断、治療判断、救急対応、患者モニタリング、医療機器出力の代替ではありません。実臨床では12誘導心電図、症状、バイタル、患者背景、医療者評価と合わせて判断します。

## Not In Scope

- New rhythm cases
- 12-lead ECG
- Vectorcardiography
- Automated ECG diagnosis
- Treatment recommendation
- Precise measurement calipers
- Full waveform analysis engine
- User accounts
- Data saving
