// NSR 賦活タイムラインのビルダー（純関数）。
//
// 型のみ import＝ランタイム import ゼロなので、検証スクリプト（Node 型ストリップ）が
// 相対 import で直接叩ける。実データ nsr.ts はこのビルダーに JSON 由来の fiducials を
// 渡すだけ（時刻の生数値ハードコードは nsr.ts 側にも本ファイルにも置かない）。

import type {
  ActivationEvent,
  ActivationTimeline,
} from "./types";

// 平均電気軸（+60°）方向。T2 の axisFromAngle(60) = [cos60, -sin60, 0]。
// 既に単位長（norm=1）。全イベントでこの向きに統一し、biphasic の前後振れは
// dipolePeakMag の符号のみで表す（T5 ハーネスと同方式・§Notes 参照）。
const DIR_60: [number, number, number] = [0.5, -0.8660254037844386, 0];

export type NsrFiducials = {
  pOn: number;
  pPeak: number;
  pOff: number;
  qrsOn: number;
  q: number;
  r: number;
  s: number;
  qrsOff: number;
  tPeak: number;
  tEnd: number;
};

const REQUIRED_FIDUCIALS: (keyof NsrFiducials)[] = [
  "pOn",
  "pPeak",
  "pOff",
  "qrsOn",
  "q",
  "r",
  "s",
  "qrsOff",
  "tPeak",
  "tEnd",
];

/**
 * NSR の賦活タイムラインを fiducials から構築する。
 *
 * QRS は単一イベントにせず septalQ → mainR → terminalS の3分割にする。これは
 * 「QRS 中に合成双極子ベクトルが回転する」ことのデータ表現であり、biphasic な
 * Q波・S波（陰性偏位）を再現するために必須。
 *
 * 根拠は T5 の実測：P/QRS/T を各1個の Gaussian で表す最小構成では Lead II 投影の
 * 形状相関が r=0.8885 と閾値 0.90 を僅かに下回り、この3分割を入れると r=0.9678 へ
 * 改善してゲートを通過した。**この分割を省くと T5 ゲート（verify:projection）が
 * 静かに r<0.90 で落ちる。** 安易に1イベントへ単純化しないこと。
 *
 * なお septalQ/terminalS を主R（+60°）と同一軸上の符号反転（=180°正反対）で表すのは
 * 意図的簡略化。実際の中隔脱分極ベクトルは主Rに対して180°ではない。QRS 内の双極子
 * 回転角の精緻化は将来タスク（12lead-qrs-vector-loop 仮）へ切り出す。
 */
export function buildNsrTimeline(
  templateId: string,
  fiducials: NsrFiducials,
  durationMs: number
): ActivationTimeline {
  for (const key of REQUIRED_FIDUCIALS) {
    const value = fiducials[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(
        `buildNsrTimeline: missing or invalid fiducial "${key}" (got ${String(value)})`
      );
    }
  }

  const { pOn, pPeak, pOff, qrsOn, q, r, s, qrsOff, tPeak, tEnd } = fiducials;

  const events: ActivationEvent[] = [
    {
      id: "atrial",
      segment: "saAtrial",
      centerMs: pPeak,
      sigmaMs: (pOff - pOn) / 2.4,
      dipoleDir: DIR_60,
      dipolePeakMag: 0.13,
      contributesToWave: true,
    },
    {
      // AV 遅延（PR 区間）：電気的に静か。発光はするが波形へは寄与しない。
      id: "avDelay",
      segment: "avDelay",
      centerMs: (pOff + qrsOn) / 2,
      sigmaMs: (qrsOn - pOff) / 2,
      dipoleDir: DIR_60,
      dipolePeakMag: 0,
      contributesToWave: false,
    },
    {
      // 中隔脱分極（Q）：主Rに対して逆向き（負値）。
      id: "septalQ",
      segment: "septalPurkinje",
      centerMs: q,
      sigmaMs: 10,
      dipoleDir: DIR_60,
      dipolePeakMag: -0.18,
      contributesToWave: true,
    },
    {
      // 主心室脱分極（R）：平均電気軸方向に大振幅。QRS で支配的。
      id: "mainR",
      segment: "septalPurkinje",
      centerMs: r,
      sigmaMs: (qrsOff - qrsOn) / 5.5,
      dipoleDir: DIR_60,
      dipolePeakMag: 1.0,
      contributesToWave: true,
    },
    {
      // 終末脱分極（S）：主Rに対して逆向き（負値）。
      id: "terminalS",
      segment: "septalPurkinje",
      centerMs: s,
      sigmaMs: 12,
      dipoleDir: DIR_60,
      dipolePeakMag: -0.22,
      contributesToWave: true,
    },
    {
      // 心室再分極（T）：QRS と同極性（concordant）。
      id: "repol",
      segment: "ventRepol",
      centerMs: tPeak,
      sigmaMs: (tEnd - qrsOff) / 5.0,
      dipoleDir: DIR_60,
      dipolePeakMag: 0.3,
      contributesToWave: true,
    },
  ];

  for (const event of events) {
    if (!(event.sigmaMs > 0)) {
      throw new Error(
        `buildNsrTimeline: non-positive sigmaMs for event "${event.id}" (${event.sigmaMs})`
      );
    }
  }

  return { templateId, cycleMs: durationMs, events };
}
