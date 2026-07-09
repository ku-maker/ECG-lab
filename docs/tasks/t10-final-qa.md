# Task: T10 総合QA（基本ループ完成の受け入れ検証）

> 親設計: `docs/tasks/12lead-vector-sync.md` の §Success criteria。
> 前提: T1〜T9 完了済み。
> 位置づけ: 実装タスクではなく **受け入れ（acceptance）ゲート**。親設計の Success criteria を1項目ずつ、自動＋目視で確認し、リリース可否を判定する。

## Objective
「12誘導ビュー切り替え → 3D 伝導アニメーション連動 → 波形連動」の基本ループが、NSR 単一リズム・12誘導すべてで成立していることを検証し、**非技術者（松尾）が読める平易な合否レポート**にまとめる。個別タスクの検証は各 T で済んでいるため、T10 は**全体統合の受け入れ**に集中する。

## Scope
- 実装変更は原則なし（QA で発覚した不具合の修正は、該当 T へ差し戻すか、軽微なら T10 内で修正しコミット）。
- 新規作成：`scripts/verify-all.mjs`（または npm script 連鎖）— 全 verify 群を一括実行し、1つでも失敗したら exit 1 で止まる集約ランナー。
- `package.json` に `"verify:all"` を追加：`verify:leadaxes && verify:activation && verify:evaluate && verify:projection && verify:clock && verify:leadcamera && verify:leadproj && verify:clockint` を `&&` で連鎖（各 `npm run` 前置。存在する全 verify を漏れなく・重複なく列挙）。
- 新規作成：`docs/tasks/t10-qa-report.md`（QA 実施結果の記録。下記フォーマット）。

## Out of scope
- 新機能・胸部誘導精度（v2 `12lead-precordial-accuracy`）・不整脈タイムライン（`12lead-arrhythmia-timelines`）・12誘導同時表示。
- `EcgCanvas`/Learning/Quiz/Compare の機能拡張（回帰確認のみ行う）。
- パフォーマンス最適化の追加作業（測定はするが、閾値未達なら別タスク化）。

## Success criteria（親設計の受け入れ条件を集約）

### A. 自動（客観・必須）
- [ ] `npm run verify:all` が **exit 0**（全 verify 群：T2〜T9 の検証が一括で緑）。
- [ ] `npm run lint`・型チェック（`npx tsc --noEmit` 相当）・`npm run build` が成功。
- [ ] `npm run validate:ecg`（既存 ECG コンテンツ検証）が緑（回帰なし）。

### B. 目視QA（親設計 Success criteria の1項目ずつ）
`npm run dev` → `vector` モードで確認：
- [ ] 12誘導いずれのボタンでも (a) 3D カメラ視点、(b) 3D 伝導発光、(c) 2D 波形の3つが切り替わる。
- [ ] 波形が誘導ごとに異なる（aVR は主 QRS 陰性・小、II/aVF は陽性大、aVL は等電位付近＝意図どおり）。
- [ ] Lead II の波形が正常 NSR の見た目（P 上向き・鋭い R・T 上向き）。
- [ ] スライダー（scrubbing）で 3D 発光・波形カーソル・reveal が**同一位相**で一致して動く。
- [ ] （再生機能があれば）再生で自然に周回し、掴む/離す遷移で波形・発光が飛ばない。
- [ ] Learning / Quiz / Compare の既存モードが従来どおり（回帰なし）。
- [ ] モバイル幅（レスポンシブ）でレイアウトが破綻しない（既存 QA チェックリスト水準）。
- [ ] 医学的免責の注意書き（概念図であり厳密再現でない旨）が UI に残っている。

### C. 平易な合否レポート（CLAUDE.md 準拠・必須）
- [ ] `docs/tasks/t10-qa-report.md` に、**技術用語なしの結論を先頭**に書く：
  - 「基本ループは動くか？（はい/いいえ）」
  - 「12誘導すべてで視点・3D・波形が連動するか？」
  - 「リリースして安全か、要修正か」
  - その後に、A の自動結果（各 verify の緑/赤）と B のチェック結果、残課題（v2 送り含む）を列挙。

## QA レポート フォーマット（`t10-qa-report.md`）
```
# T10 QA レポート — 12誘導ベクトル同期 基本ループ

## 結論（平易）
- 基本ループ: 動く / 動かない
- 12誘導連動: 全誘導OK / 一部NG（詳細）
- リリース判定: 可 / 条件付き可 / 不可
- 一言サマリ:（非技術者向けに1〜2文）

## 自動検証結果
| verify | 結果 | 備考 |
|---|---|---|
| verify:all | ... | |
| lint / tsc / build | ... | |

## 目視QA結果
（B の各項目に ✓/✗ と気づき）

## 残課題 / 次タスク
- v2: 胸部誘導精度（12lead-precordial-accuracy）
- 別: 不整脈タイムライン（12lead-arrhythmia-timelines）
- 別: 12誘導同時表示
- その他発見事項
```

## Constraints
- **AGENTS.md 準拠**。QA 中に修正する場合も破壊的変更版 Next.js の作法に従う。
- 依存追加なし。
- **自動検証を合否の芯にする**（CLAUDE.md）。目視QA は自動検証の補完であり、目視だけで「合格」にしない。
- QA で見つけた不具合は、原因タスク（T2〜T9）を特定して差し戻すのが原則。T10 で直すのは軽微・局所のもののみ。

## Edge cases
- 全 verify を連鎖実行する `verify:all` が、途中失敗で確実に止まり exit 1 を返すこと（`&&` 連鎖 or 失敗検知）。
- ビルドは通るが実行時に R3F が描画エラー、というケースを目視QAで拾う（build 緑だけで安心しない）。
- モバイル幅で 3D キャンバスとグラフの2分割が破綻しないか。

## Notes for the orchestrator's review pass
- **最重要**：レポート冒頭の平易な結論が、A/B の実結果と矛盾していないか（「動く」と書きつつ verify が赤、が無いか）。
- `verify:all` が全 verify を漏れなく列挙しているか（新設した検証を1つでも落としていないか）。将来 T を追加した際にここへ足す運用を明記。
- 目視QA で「意図した簡略化」（胸部誘導が肢誘導と似た視点/波形、aVL 等電位）を**バグと誤判定していないか**。各 T の「意図/バグ判別基準」を参照して判定すること。
- 残課題が v2/別タスクとして正しく切り出されているか（親設計 Out of scope と整合）。
- 非技術者が読んで「進めてよいか」を判断できるレポートになっているか（生の metrics 羅列で終わっていないか）。
