# ECG Lab

ECG Lab is an educational Lead II ECG waveform simulator built with Next.js.
It is designed for students and clinicians who want to review common rhythms,
practice recognition, and understand the rough relationship between a Lead II
waveform and the cardiac conduction sequence.

The stable baseline is **ECG Lab v1.0: a Lead II-centered ECG simulator**.
The v1.2 focus is a small set of additional Lead II-friendly rhythm cases for
learning. The Conduction mode is a supporting concept map, not a complete
vectorcardiography or 12-lead ECG engine.

Current version: **v1.2.0 Lead II rhythm learning expansion**.
ECG Lab currently includes **17 Lead II-focused rhythm cases**. It remains an
educational simulator, not a diagnostic tool or 12-lead ECG system.

## What You Can Do

- View smooth scrolling Lead II-style ECG waveforms on a monitor-style canvas.
- Switch between rhythm presets and review key findings, recognition tips, common pitfalls, and clinical notes.
- Adjust heart rate where the rhythm supports it.
- Hear synchronized ECG beeps with mute and volume controls.
- Trigger defibrillation-style shock behavior for VT/VF learning scenarios.
- Practice rhythm recognition in Quiz mode with randomized multiple-choice questions.
- Compare two similar Lead II rhythm cases side by side and review key differences such as P-wave visibility, RR regularity, QRS width, PR interval behavior, and rhythm regularity.
- Explore a simplified Conduction Map synchronized to the NSR Lead II waveform.

## Screenshots / Demo

ECG Lab は、Lead IIを中心とした学習用心電図シミュレーターです。

現在は以下の4つのモードを実装しています。

- **Learning**：症例プリセットを選択し、リアルタイム波形・BPM・解説を確認できます。
- **Quiz**：波形を見てリズムを判定する4択クイズで練習できます。
- **Compare**：似ているLead II波形を並べ、P波、RR間隔、QRS幅、PR間隔、規則性などの違いを確認できます。
- **Conduction**：正常洞調律のLead II波形と刺激伝導の流れを同期表示する概念マップです。

> Conduction Map は刺激伝導の理解を補助するための概念図です。
> 厳密な3D心臓電気ベクトル、Vectorcardiography、12誘導心電図を再現するものではありません。

### Learning Mode

Learning Mode は ECG Lab のメイン画面です。
NSR、洞性徐脈、洞性頻脈、AVブロック、AF、PVC、SVT、STEMI、VT、VF などの代表的な波形を切り替えながら、モニター風のリアルタイム心電図として観察できます。

### Quiz Mode

Quiz Mode では、波形名を隠した状態でリズム判読の練習ができます。
心電図初学者が、代表的な波形の見た目を反復して覚えるためのモードです。

### Conduction Map

Conduction Map では、正常洞調律のLead II波形と、SA node、AV node、His bundle、bundle branches などの刺激伝導イメージを同期して表示します。
P波、QRS、ST segment、T波といった波形ランドマークと電気的イベントの対応を直感的に理解するための補助教材です。

## Implemented Cases

- Normal Sinus Rhythm (NSR)
- Sinus Bradycardia
- Sinus Tachycardia
- Atrial Fibrillation (AF)
- Premature Ventricular Contraction (PVC)
- Premature Atrial Contraction (PAC)
- First-degree AV Block
- Second-degree AV Block, Mobitz II
- Mobitz I / Wenckebach
- Supraventricular Tachycardia (SVT)
- ST-elevation Myocardial Infarction (STEMI)
- Torsades de Pointes (TdP)
- Atrial Flutter (AFL)
- Junctional Rhythm
- Third-degree AV Block / Complete AV Block
- Ventricular Tachycardia (VT)
- Ventricular Fibrillation (VF)

## Modes

### Learning

Learning mode is the main simulator. It shows the selected rhythm waveform,
monitor heart rate, controls, audio settings, and an explanation card for the
selected case.

### Quiz

Quiz mode hides the case name and asks the user to identify the rhythm from the
waveform. Four answer choices are generated for each question, with immediate
visual feedback and a next-question flow.

### Compare

Compare mode shows two similar Lead II rhythm cases side by side. It highlights
beginner-friendly differences such as P-wave visibility, RR regularity, QRS
width, PR interval behavior, and rhythm regularity.

### Conduction

Conduction mode displays a simplified **Conduction Map** for normal sinus rhythm.
It synchronizes the Lead II reference waveform with a conceptual animation of
SA node, AV node, His bundle, bundle branches, and recovery timing.

This mode is a learning aid. It does not generate true 12-lead waveforms and
does not strictly reproduce a 3D cardiac electrical vector or clinical
vectorcardiography.

## Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the app:

```txt
http://localhost:3000
```

Run checks:

```bash
npm run validate:ecg
npm run lint
npm run build
```

## 医療免責 / Medical Disclaimer

本アプリは医療従事者・学生・学習者向けの学習用シミュレーターです。
実際の診断、治療方針決定、救急対応、患者モニタリング、医療機器出力の代替として使用しないでください。
波形は教育目的で簡略化・合成されており、実際の患者心電図とは異なる場合があります。

This application is an educational simulator for healthcare professionals,
students, and learners.

Do not use ECG Lab as a substitute for clinical diagnosis, treatment decisions,
emergency response, patient monitoring, or medical device output. The waveforms
are simplified and/or synthesized for learning purposes, and may differ from
real patient ECGs.

## Roadmap

- Keep the Lead II rhythm simulator stable while expanding carefully scoped
  education-focused cases.
- Improve educational copy and case explanations through medical review.
- Add focused tests around rhythm switching, shock state, quiz generation, and
  audio controls.
- Expand rhythm templates only after the current simulator behavior is stable.
- Treat any future 12-lead ECG or vectorcardiography work as a separate,
  explicitly scoped feature.
