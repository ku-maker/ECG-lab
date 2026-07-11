// 心室系伝導路チューブの発光決定（純関数）。
//
// 脱分極（QRS）＝ピンク/紫の前進パルス、再分極（T波）＝シアンの均一グロー（方向なし）。
// 再分極では伝導路上を光が「流れる」表現（逆走・前進掃引）をしない——His-Purkinje 系を
// 電気が流れる現象ではないため。戻り型に "reverse" を含めないことで逆走を型レベルで排除する。
//
// 外部ランタイム import ゼロ（型のみ）＝Node の型ストリップで検証可能。

import type { ConductionSegmentId } from "./types";

const ACTIVE_THRESHOLD = 0.02;

export type VentricularGlow = {
  phase: "depol" | "repol" | "idle";
  /** "reverse" は存在しない（逆走を型で排除）。uniform = 方向なし均一グロー。 */
  mode: "pulse" | "uniform";
  /** uniform 明るさ（repol の ventRepol 包絡値）／pulse ゲート値。 */
  intensity: number;
  active: boolean;
  ventColorKey: "ventricular" | "septal" | "recovery";
  septalColorKey: "ventricular" | "septal" | "recovery";
};

/**
 * segments（evaluateSegments の結果）から心室系チューブの発光スタイルを決める。
 *
 * - 再分極優勢（ventRepol が立ち、QRS 以上）→ 均一グロー（uniform）・シアン（recovery）。
 *   明るさは ventRepol の包絡そのもの（Gaussian 1山）。時間オシレータは掛けない
 *   （＝1心拍1回のゆっくりした立ち上がり→ピーク→減衰。反復点滅にしない）。
 * - 脱分極（QRS）→ 前進パルス（pulse）・ピンク/紫（ventricular/septal）。
 * - どちらも非活性 → idle。
 */
export function resolveVentricularGlow(
  segments: Record<ConductionSegmentId, number>
): VentricularGlow {
  const qrs = segments.septalPurkinje;
  const repol = segments.ventRepol;

  if (repol > ACTIVE_THRESHOLD && repol >= qrs) {
    return {
      phase: "repol",
      mode: "uniform",
      intensity: repol,
      active: true,
      ventColorKey: "recovery",
      septalColorKey: "recovery",
    };
  }

  if (qrs > ACTIVE_THRESHOLD) {
    return {
      phase: "depol",
      mode: "pulse",
      intensity: qrs,
      active: true,
      ventColorKey: "ventricular",
      septalColorKey: "septal",
    };
  }

  return {
    phase: "idle",
    mode: "pulse",
    intensity: 0,
    active: false,
    ventColorKey: "ventricular",
    septalColorKey: "septal",
  };
}
