# 波形と解説の整合性確認

初回確認日：2026-09-09。心拍数モデルの更新：2026-09-10。[更新後の検証記録](LEARNING_UPGRADES.md)も参照してください。

## 方法と範囲

検証スクリプト verify-case-consistency.mjs は EcgCanvas.tsx の実際の描画・QRSイベント関数を読み込みます。全17症例で、テンプレート参照、観察文3項目の存在、初期設定の信号が有限値かつ表示可能な振幅を持つこと、QRSイベントの有無を検査します。下表の追加条件も確認します。文章の存在確認は、文章の医学的妥当性を自動判定するものではありません。

verify:highlights は対応7症例の強調位置を検査します。整合性テストではP波・QRSの強調範囲に実際の描画信号が含まれることも確認します。

| 症例 | 共通検査に加えた条件 |
| --- | --- |
| 正常洞調律 | 初期PR 120〜200 ms、QRS 120 ms未満、規則的RR、強調位置 |
| 洞性徐脈 | 同上、45 bpmに対応するRR |
| 洞性頻脈 | 同上、120 bpmに対応するRR |
| 心房細動 | RR間隔の変動 |
| 心室期外収縮 | 5段階のBPMで正常3拍＋早期1拍、イベントとR波の対応、休止後の周期終了 |
| 心房期外収縮 | 同上 |
| 1度房室ブロック | PR 200 ms超、強調位置 |
| Mobitz II | 心房4拍に対しQRS 3拍、一定PRと脱落の位置 |
| Wenckebach型 | 心房4拍に対しQRS 3拍、PR延長とリセット、脱落の位置 |
| 上室性頻拍 | 180 bpmに対応するQRSイベント間隔 |
| ST上昇の例 | 同じ時刻の正常波形よりST部分が上昇 |
| Torsades de Pointes | 共通の描画・イベント検査のみ |
| 心房粗動 | 75 bpmに対応するQRSイベント間隔 |
| 接合部調律 | 共通の描画・イベント検査のみ |
| 3度房室ブロック | 心室35 bpmの間隔、独立した心房・心室の強調位置 |
| 心室頻拍 | 共通の描画・イベント検査のみ |
| 心室細動 | 信号は存在し、規則的QRSイベントは生成しない |

## 修正した不整合

- 正常洞調律のP波を調整し、初期PRを240 msから160 msへ修正。
- 洞性徐脈のP波とQRSを調整し、初期45 bpmのPRを約173 ms、QRSを100 msへ修正。
- サンプル番号とランドマーク時刻の対応を修正。サンプル数から1を引く処理による位置ずれを解消。
- PAC/PVCの早期拍の開始を正常3拍の後へ揃え、描画とイベント生成の拍数差を修正。PVCの周期末尾で波形・休止が切れる問題を修正。
- P波の変更に伴い、SVTで通常のP波を抑える処理を更新。

## 残る制約

この検査は医学的な認証・専門家による臨床レビューではありません。全症例の形態、幅、電位を患者心電図と照合したものではなく、特にTdP・接合部調律・VTの形態には追加の専門家確認が必要です。

2026-09-10以降、心拍数変更ではP波〜QRS波の幅を保ち、その前後を伸縮します。操作可能な範囲でPR/QRS幅と実際の描画形態を追加検証しました。これは固定幅の教育モデルで、生理学的なPR/QTの心拍数依存性は再現しません。PAC/PVCの休止は簡略モデルで、厳密な代償性休止・洞結節リセットの再現ではありません。強調は対応7症例の学習用目安です。12誘導の診断的な再現は対象外です。

## 参考

- [University of Nottingham — Normal Duration Times](https://www.nottingham.ac.uk/nursing/practice/resources/cardiology/function/normal_duration.php)：通常の間隔の教育資料。
- [Clinical Methods — Electrocardiography](https://www.ncbi.nlm.nih.gov/books/NBK354/)：波形と間隔の基礎。
- [MSD Manual — Ventricular Premature Beats](https://www.msdmanuals.com/professional/cardiovascular-disorders/specific-cardiac-arrhythmias/ventricular-premature-beats-vpb)：早期心室拍と休止の説明。
- 症例ごとの解説の出典は data/ecgReferences.ts に記録。
