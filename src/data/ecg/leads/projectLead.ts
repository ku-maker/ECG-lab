// 双極子ベクトルの誘導軸への投影（純関数）。核心は1行：
//   leadValue(id, φ) = evaluateDipole(timeline, φ) · leadAxis(id)
//
// これで T4 の双極子（時間変化）と T2 の誘導軸から12誘導波形が得られる。
// Lead II 投影は T5 の検証済み結果（r≈0.9678）と一致し続ける（独自実装で二重化しない）。
//
// 注：Node の型ストリップ検証（verify-lead-projection-all.mjs）が実体を解決できるよう
// ランタイム import は明示的な .ts 拡張子で書く（allowImportingTsExtensions で許可）。

import { envelopeAt, evaluateDipole } from "../activation/evaluate.ts";
import type { ActivationTimeline } from "../activation/types";
import { leadAxis, type LeadId } from "./leadAxes.ts";

/** 誘導 id の心周期内時刻 tMs における投影振幅（mV 相当の相対値）。 */
export function projectLeadValue(
  timeline: ActivationTimeline,
  id: LeadId,
  tMs: number,
  dipoleOut: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 }
): number {
  const v = evaluateDipole(timeline, tMs, dipoleOut);
  const axis = leadAxis(id);
  let value = v.x * axis[0] + v.y * axis[1] + v.z * axis[2];

  // 原則は双極子投影。WPW局在教材のデルタ波など、誘導別の初期極性が重要な
  // イベントだけ、指定誘導の寄与を直接係数へ置き換える。
  for (const event of timeline.events) {
    const directProjection = event.leadProjection?.[id];
    if (directProjection === undefined || !event.contributesToWave) continue;
    const magnitude = event.dipolePeakMag * envelopeAt(event.centerMs, event.sigmaMs, tMs);
    const genericProjection = event.dipoleDir[0] * axis[0] + event.dipoleDir[1] * axis[1] + event.dipoleDir[2] * axis[2];
    value += magnitude * (directProjection - genericProjection);
  }

  return value;
}

/** 1心周期を sampleCount 点サンプルした投影波形（波形パス生成用）。 */
export function sampleLeadCycle(
  timeline: ActivationTimeline,
  id: LeadId,
  sampleCount: number
): { tMs: number; mv: number }[] {
  const n = Math.max(2, Math.floor(sampleCount));
  const dipoleOut = { x: 0, y: 0, z: 0 }; // 全サンプルで使い回し（アロケーション回避）
  const out: { tMs: number; mv: number }[] = [];

  for (let i = 0; i < n; i++) {
    const ratio = i / (n - 1);
    const tMs = ratio * timeline.cycleMs;
    out.push({ tMs, mv: projectLeadValue(timeline, id, tMs, dipoleOut) });
  }

  return out;
}
