// 刺激伝導路の3D点列と、賦活セグメント（ConductionSegmentId）への割当。
//
// 4腔の模式モデルに合わせた伝導路。心尖側は患者左（+X）へ向ける。
// フレーム整合（T2：+X=患者左, +Y=上, +Z=前）は既に満たしている：
//   - SA 結節・右脚（RBB）は x<0（=−X=患者右）… 解剖どおり右房・右脚は患者右。
//   - 左脚系（LBB/LAF/LPF）は x>0（=+X=患者左）… 左脚は患者左。
// 個々の点は教育用近似であり、解剖学的な計測座標ではない。
//
// 型のみ import（ランタイム import ゼロ）＝node の型ストリップで扱える。

import type { ConductionSegmentId } from "./types";

export type VectorPoint = [number, number, number];

export const CONDUCTION_POINTS = {
  sa: [-0.62, 0.88, -0.28],
  internodal: [-0.42, 0.42, -0.22],
  av: [-0.16, 0.02, -0.14],
  his: [-0.07, -0.2, -0.05],
  rbbMid: [-0.32, -0.66, 0.1],
  rbbEnd: [-0.5, -1.08, 0.24],
  lbbTrunk: [0.06, -0.38, -0.02],
  lafMid: [0.36, -0.74, 0.08],
  lafEnd: [0.62, -1.04, 0.14],
  lpfMid: [0.12, -0.94, -0.2],
  lpfEnd: [0.26, -1.24, -0.22],
  septalApex: [0.08, -1.22, 0.14],
  purkinjeApex: [0.36, -1.70, 0.16],
} satisfies Record<string, VectorPoint>;

/**
 * 各賦活セグメントに対応する3D点列。
 * His束・脚（hisBundle/rightBundle/leftAnterior/leftPosterior）は 3D 発光専用で、
 * NSR タイムラインでは波形寄与を mainR に集約するため固有イベントを持たない。
 * これらの発光は T7 で septalPurkinje（QRS）窓に同期させる（VectorVisualizer 側）。
 * ventRepol（T波）は心室全体の再分極を表すため septalPurkinje と同じ経路を用いる。
 */
export const SEGMENT_POINTS: Record<ConductionSegmentId, VectorPoint[]> = {
  saAtrial: [CONDUCTION_POINTS.sa, CONDUCTION_POINTS.internodal, CONDUCTION_POINTS.av],
  avDelay: [CONDUCTION_POINTS.av, CONDUCTION_POINTS.his],
  // WPWの位置別経路は wpw.ts のバリアント定義を使う。ここは型を満たす既定値。
  accessoryAtrialApproach: [[0.2, 0.7, -0.2], [0.67, 0.28, -0.12]],
  accessoryPathway: [[0.67, 0.28, -0.12], [0.8, -0.05, 0.08]],
  accessoryVentricularSpread: [[0.8, -0.05, 0.08], [0.55, -0.82, 0.2]],
  hisBundle: [CONDUCTION_POINTS.his, CONDUCTION_POINTS.lbbTrunk],
  rightBundle: [
    CONDUCTION_POINTS.his,
    CONDUCTION_POINTS.rbbMid,
    CONDUCTION_POINTS.rbbEnd,
  ],
  leftAnterior: [
    CONDUCTION_POINTS.his,
    CONDUCTION_POINTS.lbbTrunk,
    CONDUCTION_POINTS.lafMid,
    CONDUCTION_POINTS.lafEnd,
  ],
  leftPosterior: [
    CONDUCTION_POINTS.his,
    CONDUCTION_POINTS.lbbTrunk,
    CONDUCTION_POINTS.lpfMid,
    CONDUCTION_POINTS.lpfEnd,
  ],
  septalPurkinje: [
    CONDUCTION_POINTS.his,
    CONDUCTION_POINTS.lbbTrunk,
    CONDUCTION_POINTS.septalApex,
    CONDUCTION_POINTS.purkinjeApex,
  ],
  ventRepol: [
    CONDUCTION_POINTS.his,
    CONDUCTION_POINTS.lbbTrunk,
    CONDUCTION_POINTS.septalApex,
    CONDUCTION_POINTS.purkinjeApex,
  ],
};
