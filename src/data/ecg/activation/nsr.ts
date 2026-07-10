// NSR 賦活タイムラインの実体。
//
// 時刻の数値は nsr-lead2.json の fiducialsMs / durationMs を single source とし、
// buildNsrTimeline で構築する（生数値の再ハードコード＝二重管理はしない）。
//
// biphasic な QRS 3分割（septalQ/mainR/terminalS）を省略すると T5 ゲート
// （verify:projection）が r<0.90 で落ちる。詳細な根拠は buildTimeline.ts の
// buildNsrTimeline の doc コメントを参照。

import nsrTemplateJson from "@/src/data/ecg/templates/nsr-lead2.json";
import { buildNsrTimeline, type NsrFiducials } from "./buildTimeline";
import type { ActivationTimeline } from "./types";

export const nsrTimeline: ActivationTimeline = buildNsrTimeline(
  nsrTemplateJson.id,
  nsrTemplateJson.fiducialsMs as NsrFiducials,
  nsrTemplateJson.durationMs
);
