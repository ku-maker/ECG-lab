// 波形グラフの縦スケール（純モジュール・実装と検証で式を共有）。
//
// 「どの誘導を選んでも・どの位相でも」波形が枠内に収まることを保証するため、
// 縦スケールを全12誘導・1周期の投影振幅の全体最大（globalMaxAbsMv）から導出する。
// Lead II だけ合わせても誘導によって R 波高が違うため他で切れうる——それを防ぐ。
//
// 注：Node の型ストリップ検証が実体を解決できるよう、ランタイム import は .ts 拡張子で書く。

import { sampleLeadCycle } from "./projectLead.ts";
import type { ActivationTimeline } from "../activation/types";
import type { LeadId } from "./leadAxes";

/** viewBox 縦サイズ。 */
export const GRAPH_HEIGHT = 360;
/** ベースラインを viewBox 縦中央に置く（上向き・下向きどちらの誘導も対称に収める）。 */
export const GRAPH_BASELINE_Y = GRAPH_HEIGHT / 2;
/** 上下に残す安全マージン（px）。最大偏位でもこのマージン内に収める（波形を枠いっぱいにしない）。 */
export const GRAPH_VERTICAL_MARGIN = 54;
/** 波形サンプリング点数（パス生成・スケール算出共通）。 */
export const GRAPH_SAMPLE_COUNT = 240;

/** 全誘導・1周期の投影振幅の全体最大 |mv|（0 除算回避のため下限あり）。 */
export function computeGlobalMaxAbsMv(
  timeline: ActivationTimeline,
  leads: readonly LeadId[]
): number {
  let maxAbs = 0;
  for (const lead of leads) {
    for (const sample of sampleLeadCycle(timeline, lead, GRAPH_SAMPLE_COUNT)) {
      const abs = Math.abs(sample.mv);
      if (abs > maxAbs) maxAbs = abs;
    }
  }
  return Math.max(1e-6, maxAbs);
}

/**
 * 全誘導共通の mV→px スケール。最大偏位が「半分の高さ − マージン」にちょうど収まるよう決める。
 * baseline ± globalMaxAbsMv×scale = [margin, GRAPH_HEIGHT−margin] ⊂ [0, GRAPH_HEIGHT]。
 * 誘導ごと正規化はしない（共通スケール＝誘導間の相対振幅を保つ、T8 方針）。
 */
export function computeGraphMvScale(
  timeline: ActivationTimeline,
  leads: readonly LeadId[]
): number {
  const globalMaxAbsMv = computeGlobalMaxAbsMv(timeline, leads);
  return (GRAPH_HEIGHT / 2 - GRAPH_VERTICAL_MARGIN) / globalMaxAbsMv;
}
