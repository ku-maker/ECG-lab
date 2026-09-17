# PTB-XL teaching subset

Data: Wagner, P., Strodthoff, N., Bousseljot, R.-D., Samek, W., & Schaeffter, T. (2022). PTB-XL, a large publicly available electrocardiography dataset (version 1.0.3). PhysioNet. https://doi.org/10.13026/kfzx-aw45

Original publication: Wagner, P., et al. (2020). PTB-XL, a large publicly available electrocardiography dataset. Scientific Data. https://doi.org/10.1038/s41597-020-0495-6

PhysioNet: Pollard, T., et al. (2026). PhysioNet as a global platform for biomedical research. Nature Health. https://doi.org/10.1038/s44360-026-00096-z

License: Creative Commons Attribution 4.0 International, https://creativecommons.org/licenses/by/4.0/ . The complete license is in LICENSE.txt.

Selected source records: 00010, 03155, 00057, 00618, 04117, 02146, 00023, 00219, 00052, 14009 from records500. selection.json contains their source label and validation metadata. No demographic or patient identifiers are included. Source ECG record IDs are retained for attribution and verification.

Changes: WFDB format 16 interleaved signed samples converted to millivolts using header gain/baseline, serialized as JSON. No additional filtering, resampling, baseline adjustment, or amplitude normalization. Headers are retained. JSON sourceRecord and SHA256 identify original signal files. UI displays selected intervals of the 10-second signal; all columns show the same interval. Japanese prompts and learning feedback were added by this application, are not original annotations, and have not received case-specific clinical review. No endorsement by the data authors or societies is implied.


## 虚血・梗塞部位教材の追加（2026-09-15）

PTB-XL記録 00526（ASMI）、01577（IMI）、10873（LMI）を500 Hzの12誘導表示へ追加しました。提供元ラベルはそれぞれ前壁中隔・下壁・側壁の心筋梗塞所見で、急性冠閉塞や責任血管を確定するラベルではありません。波形値は単位をmVへ変換した以外に加工していません。

PTB-XL記録 07244（PMI）を後壁領域の鏡像変化教材として追加しました。V1〜V3から後壁所見を疑う練習で、V7〜V9は必要性を説明しますが、この記録には含まれません。
