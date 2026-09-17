# ECG Lab

ECG Lab is an educational Lead II ECG waveform simulator built with Next.js.
It is designed for students and clinicians who want to review common rhythms,
practice recognition, and understand the rough relationship between a Lead II
waveform and the cardiac conduction sequence.

The stable baseline is **ECG Lab v1.0: a Lead II-centered ECG simulator**.
The latest released version is **v1.3.0 Rhythm Compare Mode**, and the current
release-prep focus is **v1.4.0 Observation Guide polish**. The Conduction mode
is a supporting concept map, not a complete vectorcardiography or 12-lead ECG
engine.

ECG Lab currently includes **17 Lead II-focused rhythm cases**. It remains an
educational simulator, not a diagnostic tool or 12-lead ECG system.

## What You Can Do

- View smooth scrolling Lead II-style ECG waveforms on a monitor-style canvas.
- Switch between rhythm presets and review key findings, recognition tips, common pitfalls, and clinical notes.
- Review observation guides with optional paused-waveform highlights for seven supported cases.
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
- **Quiz**：出題範囲を選び、波形を見てリズムを判定する3〜4択クイズで練習できます。
- **Compare**：似ているLead II波形を並べ、P波、RR間隔、QRS幅、PR間隔、規則性などの違いを確認できます。
- **Conduction**：正常洞調律のLead II波形と刺激伝導の流れを同期表示する概念マップです。

Learning Mode の全17症例は、**ひとことでいうと → 波形を見る3ステップ → 似た波形との違い** の順に読めます。専門用語は開閉式の用語集で確認でき、間違えやすい点・臨床的な補足・症例ごとの参考資料は別の開閉欄にまとめています。解説は `data/ecgCases.ts` に集約し、観察ガイド・比較・クイズの解説で共用しています。参考資料は `data/ecgReferences.ts` に記録しています（文章確認：2026-09-08）。

> Conduction Map は刺激伝導の理解を補助するための概念図です。
> 厳密な3D心臓電気ベクトル、Vectorcardiography、12誘導心電図を再現するものではありません。

### Learning Mode

全17症例の「似た波形との違い」から、その症例を含む比較ペアを直接開けます。比較ペアは13組で、日本語名で選択できます。解説から開いた場合は「○○の解説に戻る」で元の症例と心拍数を復元します（Learningタブから戻る場合も同様）。比較モード内で別のペアを選んでも、戻り先は最初の症例を保ちます。

正常洞調律・洞性徐脈・洞性頻脈・1度房室ブロック・Mobitz II・Wenckebach型・3度房室ブロックでは、観察ステップを押すと表示中の波形を一時停止し、P波・PR間隔・QRS脱落などの位置を強調します。「強調を解除」で計測に戻り、「再生する」で強調を消して再開します。症例変更・心拍数変更・初期化でも強調は解除されます。色に加えてラベルと破線を使い、波形と同じ時間軸・拍のタイミングから位置を算出しています。合成波形の境界や欠落位置は学習用の目安です。

Learning Mode は ECG Lab のメイン画面です。
NSR、洞性徐脈、洞性頻脈、AVブロック、AF、PVC、SVT、STEMI、VT、VF などの代表的な波形を切り替えながら、モニター風のリアルタイム心電図として観察できます。

### Quiz Mode

回答すると波形を一時停止し、判断理由の3択練習を表示します。理由に回答するか、練習を飛ばすと正解の観察ポイントを表示します。不正解の場合は選んだ症例の所見も並べ、登録済みの比較ペアには見分ける軸を表示します。正常洞調律・洞性徐脈・洞性頻脈と4種類の房室ブロックでは、正解側のステップから波形を強調できます。回答前は解説・強調を表示せず、次の問題へ進むと選択と強調を消して再生を再開します。

Quiz Mode では、波形名を隠した状態でリズム判読の練習ができます。
心電図初学者が、代表的な波形の見た目を反復して覚えるためのモードです。

### Conduction Map

Conduction Map では、正常洞調律のLead II波形と、SA node、AV node、His bundle、bundle branches などの刺激伝導イメージを同期して表示します。
P波、QRS、ST segment、T波といった波形ランドマークと電気的イベントの対応を直感的に理解するための補助教材です。

## Implemented Cases

### 段階的な学習の改善（2026-09-09）

- クイズの「難易度・出題範囲」で入門（基本3症例）、中級（房室ブロック4症例／期外収縮と正常の3症例）、総合（全17症例）を選べます。初期値は入門です。選択肢と苦手復習を同じ範囲に絞り、成績は全範囲共通で保存します。
- 比較画面では2枚を同じ終了時刻で一時停止できます。強調に対応した7症例同士では、共通するP波・QRS波・PR間隔・RR間隔・QRS脱落を同時に強調できます。房室ブロックの種類によって項目は異なります。未対応のペアでも停止と手動計測は使えます。
- 解説文・観察ステップの直下に、その文章に出てくる用語ボタンを表示します。短い説明を開き、対応する観察ステップがある場合は「関連する波形を見る」で強調できます。閉じる／Escapeで元の用語ボタンにフォーカスを戻します。
- 正常洞調律と洞性徐脈の初期PR間隔・QRS幅、描画サンプルの時間対応、PAC/PVCの早期拍と休止のつながりを修正しました。心拍数変更ではP波〜QRS波の幅を保ち、その前後の時間を調整します（2026-09-10更新）。生理学的なQT変化のモデルではありません。2度房室ブロックは心房側、期外収縮は基礎リズムの速さを表示します。

検証範囲と制約は [波形整合性の確認記録](docs/ECG_CONSISTENCY_AUDIT.md) を参照してください。verify:consistency は実際の描画関数を検査し、verify:quizscopes は800問の生成と範囲内の復習を確認します。いずれも npm run verify:all に含みます。

### 症例一覧

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
selected case. Supported cases include text-based Observation Guides for
quick rhythm-reading points such as RR regularity, P-wave visibility, QRS
width, PR behavior, dropped beats, and common pitfalls.

### Quiz

Quiz mode hides the case name and asks the user to identify the rhythm from the
waveform. Three or four choices are generated within the selected scope, with immediate
visual feedback and a next-question flow.

### Compare

Compare mode shows two similar Lead II rhythm cases side by side. It highlights
beginner-friendly differences such as P-wave visibility, RR regularity, QRS
width, PR interval behavior, and rhythm regularity.

スマホでは2枚の波形を先に縦に並べ、その後に症例別の解説を表示します。「波形へ移動」「比較の操作に戻る」で表示位置とキーボードフォーカスを移動できます。比較解説にも用語ボタンがあり、臨床的な補足は「実際の患者さんでは」を開いて確認できます。波形の停止・強調状態は移動しても維持します。

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
http://localhost:3100
```

上部の「目的から学ぶ」では、正常洞調律の観察、波形比較、PR間隔の計測、苦手の復習から開始できます。計測は正常洞調律を停止して開き、復習は出題範囲を全症例にして成績一覧へ移動します。

復習一覧は、回答前・現在の範囲に対象なし・保存履歴に対象なしで案内を切り替えます。一覧のボタンから問題へ移動でき、回答済みなら次の問題を開きます。

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

## 学習・計測機能の改善

- 「学習ガイド」は正常波形の観察 → 正常洞調律と洞性徐脈の比較 → 基本3症例から始めるクイズの3段階です。各画面と刺激伝導マップを直接開けます。閉じる／Escapeでは元の画面を維持します。
- スマホの学習・クイズ画面は「波形を大きく」「解説を広く」で表示配分を変更できます。解説を広げても波形は残り、観察ステップを押すと波形を大きくして強調します。
- モード名を「学習・クイズ・比較・刺激伝導」に統一しました。

- ナビゲーションの「症例ライブラリ」で全17症例の概要を確認できます。症例名・略称・解説・観察ステップを検索でき、空白区切りの複数語、英字の大小文字・全角半角に対応します。波形の強調に対応した7症例だけの絞り込みも可能です。閉じる／Escapeでは元の画面の状態を保ち、症例を選ぶと、その症例の初期BPMで学習モードを開きます。
- 学習・クイズの「一時停止・計測」で波形と音声を停止し、波形上の2点をクリック／タップすると時間差（ms）・電位差（mV）を表示します。3点目で再計測します。
- キーボードでは計測面にフォーカスし、矢印キーで移動、Enter／Spaceで点を指定、Escapeでクリアできます。1ステップは横5 ms・縦0.01 mV、Shift併用で横40 ms・縦0.1 mVです。
- 表示範囲は6秒です。格子は波形と同じ座標変換を使い、小マスは横40 ms・縦0.1 mV、大マスは横200 ms・縦0.5 mVです。画面幅と波形振幅に応じて縦横を独立に拡縮するデジタル表示のため、紙の物理寸法を示すmm表記は使用しません。計測値は教育用合成波形上で選んだ点の差です。
- クイズは直近100問の成績をこのブラウザのlocalStorageに保存します（キー `ecg-lab.quiz.v1`）。最近10問の履歴を表示し、保存範囲内で各症例の最後の回答が不正解なら復習対象になります。復習で正解すると対象から外れます。履歴欄から成績をリセットできます。保存領域が使えない場合はページ内のメモリで継続します。
- 学習から比較・クイズ・刺激伝導に移動して戻ると、症例・BPM・一時停止・観察ステップ・スマホの表示配分・解説のスクロール位置を復元します。症例・BPM・停止状態・観察ステップ・表示配分はブラウザに保存し、再読み込み時は学習画面から再開します。解説のスクロール位置は現在のページ内だけで保持します。波形の時刻、手動計測点、SHOCK状態は引き継ぎません。クイズ成績は引き続き保存します。SHOCK中と完了後のBPM操作を無効化し、症例リセットで元の設定に戻します。
- SHOCKはVF・無脈性VTを想定した成功例のデモです。脈のあるVTとの区別と、実際には必ず回復するとは限らないことを明記しています。説明の参照元：[AHA 2025 Adult Advanced Life Support](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-advanced-life-support)。

追加検証：`npm run verify:learning`（目盛り・計測座標・保存データ検証・履歴上限・復習対象の遷移）。`npm run check` に含まれます。

## 刺激伝導マップの改善

- 心房・心室を分けた半透明の3D模式モデル、日本語の構造ラベル、心室末梢の伝導路を表示します。外形とラベルは個別に切り替えられます。
- 正面視点を初期表示にし、自由回転・拡大・正面リセットを用意しました。モデル上部の12誘導ボタンを選ぶと、波形と3D視点が同時に切り替わります。自由回転後も同じ誘導を再選択すれば、その誘導の視点に戻ります。
- 基線・P波・PR部分・QRS波・ST部分・T波のボタンで停止して観察できます。波形の色帯・カーソル・3D発光・解説は同じ心周期時刻を使用します。T波の始まりは、このモデルの再分極イベントの±2σ包絡から近似しています。
- 再生速度は0.1／0.25／0.5／1倍。スロー再生しても60 bpmのモデル自体の周期は変わりません。時刻スライダーは1 ms刻みで、末端を選んでも0 msに巻き戻りません。
- 再分極は心室筋表面の発光で示し、His・脚・プルキンエ線維を逆向きに流れる表現はしません。形状・伝播は教育用の簡略表現です。
- 3DはConductionモードを開いたときだけ読み込みます。ラベルに外部フォント取得は不要です。
- 内容の参考：[NHLBI — How the Heart Beats](https://www.nhlbi.nih.gov/health/heart/heart-beats)。

追加検証：`npm run verify:conduction`（段階の境界・T波の開始・段階選択・再生速度・背景復帰・左右の向き）。`npm run check` に含まれます。

## 学習機能の追加（2026-09-10）

- 心拍数と波形の幅を分離しました。1度房室ブロック・Wenckebach型は40〜100 bpm、その他の可変症例は40〜180 bpmです。固定BPMの症例は従来どおりです。
- 正常洞調律・洞性徐脈・洞性頻脈・1度房室ブロックで、PR間隔・QRS幅・RR間隔の計測練習を使えます。位置のヒントを表示でき、2点の時間座標をそれぞれ±20 msで照合します。
- 全17症例に判断理由の3択練習を追加しました。理由の成績は症例名と別に直近100回答を保存し、最近10回答の正誤と選んだ根拠を表示します。「拍の速さ・間隔」「P波とQRS波の関係」「QRS波の幅・形」「P波・F波の見つけ方」「ST部分の高さ」から、現在の出題範囲内の苦手を復習できます。症例名だけ正解しても根拠の復習対象は残り、根拠に正解すると外れます。未回答・スキップは採点しません。次の問題・範囲変更で理由の選択も解除します。成績リセットは両方の履歴を消去します。
- 学習設定をlocalStorageの ecg-lab.learning.v1 に保存します。症例、BPM、停止、観察ステップ、学習・クイズそれぞれのスマホ表示配分、クイズ範囲が対象です。保存できない環境ではページ内で継続します。画面上部の「学習設定」で、クイズ成績を残して設定だけを初期化できます。

実装・検証範囲：[学習機能の確認記録](docs/LEARNING_UPGRADES.md)。追加検証は npm run verify:upgrades で実行でき、verify:all に含まれます。

### 12誘導判読（試行版）

上部「12誘導」から、PTB-XLの実記録6件（正常2件・完全右脚ブロック・完全左脚ブロック・心房細動・第1度房室ブロック）を開けます。3行×4列で同じ2.5秒区間を並べ、選択誘導を10秒で拡大します。校正は25 mm/s・10 mm/mV相当の比率です。

観察メモ・根拠誘導・第一候補・理由に加え、別に考えた診断と除外・保留した根拠を入力すると、提供元の診断ラベルと照合します。自由記述の自動採点はせず、診断名が一致しただけで習得済みとは判定しません。教材解説の個別医療者レビューは未実施です。仕様・参照勧告・検証は [12誘導判読の設計](docs/TWELVE_LEAD_LEARNING.md)、データの出典とCC BY 4.0は [帰属表示](public/ecg/ptbxl/ATTRIBUTION.md) に記載しています。

12誘導の拡大欄では2つの誘導を上下に並べ、同じ時間・尺度で比較できます。「2点を選んで計測」で時間差を測り、回答後の解説から対応する誘導の比較へ戻れます。回答時または「回答・メモを保存」で最新の回答と振り返りをブラウザへ保存し、同じ症例に再挑戦できます。未保存の編集と計測点は保持しません。
