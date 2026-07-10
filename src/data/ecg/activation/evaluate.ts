// 賦活タイムラインの評価ロジック（純関数）。
//
// T3 の静的な ActivationTimeline から、心周期内の任意時刻 tMs における
//   - 合成双極子ベクトル（evaluateDipole）
//   - 各セグメントの発光強度（evaluateSegments）
// を計算する。誘導への投影（· leadAxis）は消費側（T5/T8）で行う。
//
// 外部 import は T3 の型のみ（ランタイム import ゼロ）。envelope の Gaussian は
// easing 非依存で自前実装し、検証スクリプトが相対 import 一発で動くようにする。

import type {
  ActivationTimeline,
  ConductionSegmentId,
} from "./types";

const ALL_SEGMENTS: ConductionSegmentId[] = [
  "saAtrial",
  "avDelay",
  "hisBundle",
  "rightBundle",
  "leftAnterior",
  "leftPosterior",
  "septalPurkinje",
  "ventRepol",
];

/**
 * 単一イベントの Gaussian 包絡（0..1）：exp(-0.5 * ((t-center)/sigma)^2)。
 * sigma<=0 は退化なので 0 を返す（防御的）。
 */
export function envelopeAt(
  centerMs: number,
  sigmaMs: number,
  tMs: number
): number {
  if (!(sigmaMs > 0)) return 0;
  const z = (tMs - centerMs) / sigmaMs;
  return Math.exp(-0.5 * z * z);
}

/**
 * 合成双極子ベクトル。contributesToWave===true の全イベントについて
 * dir * peakMag * envelope を総和する（false は加算しない）。
 * out を渡すとそこへ書き込み、新規オブジェクトを作らない（毎フレーム呼ばれる想定）。
 */
export function evaluateDipole(
  timeline: ActivationTimeline,
  tMs: number,
  out: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 }
): { x: number; y: number; z: number } {
  out.x = 0;
  out.y = 0;
  out.z = 0;

  const events = timeline.events;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (!e.contributesToWave) continue;
    const mag = e.dipolePeakMag * envelopeAt(e.centerMs, e.sigmaMs, tMs);
    out.x += e.dipoleDir[0] * mag;
    out.y += e.dipoleDir[1] * mag;
    out.z += e.dipoleDir[2] * mag;
  }

  return out;
}

/**
 * 各セグメントの発光強度(0..1)。そのセグメントに属するイベントの envelope の
 * 最大値を採用する（同一セグメントに複数イベントがある QRS 系＝septalPurkinje は
 * Q/R/S のどれかが立っていれば発光）。
 *
 * 注：peakMag では重み付けしない。avDelay は peakMag=0（波形非寄与）だが AV 遅延中は
 * 発光してよい（発光と波形寄与は別概念）ため、envelope のみで強度を決める。
 * envelope は [0,1] なので最大値も [0,1] に収まる（防御的にクランプ）。
 * NSR で対応イベントを持たないセグメント（His/脚）は 0 のまま返る（T7 で septalPurkinje
 * 窓に同期させる）。
 */
export function evaluateSegments(
  timeline: ActivationTimeline,
  tMs: number
): Record<ConductionSegmentId, number> {
  const result = {} as Record<ConductionSegmentId, number>;
  for (let i = 0; i < ALL_SEGMENTS.length; i++) {
    result[ALL_SEGMENTS[i]] = 0;
  }

  const events = timeline.events;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const env = envelopeAt(e.centerMs, e.sigmaMs, tMs);
    if (env > result[e.segment]) {
      result[e.segment] = env > 1 ? 1 : env;
    }
  }

  return result;
}
