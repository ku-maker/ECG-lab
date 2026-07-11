// NSR 賦活タイムラインのビルダー（純関数）。
//
// 型のみ import＝ランタイム import ゼロなので、検証スクリプト（Node 型ストリップ）が
// 相対 import で直接叩ける。実データ nsr.ts はこのビルダーに JSON 由来の fiducials を
// 渡すだけ（時刻の生数値ハードコードは nsr.ts 側にも本ファイルにも置かない）。

import type {
  ActivationEvent,
  ActivationTimeline,
} from "./types";

// 双極子の向き（T2 の axisFromAngle(deg) = [cos, -sin, 0]、単位長）。
function dirFromDeg(deg: number): [number, number, number] {
  const rad = (deg * Math.PI) / 180;
  return [Math.cos(rad), -Math.sin(rad), 0];
}

// QRS（septalQ/mainR/terminalS）は平均電気軸 +60° に固定。biphasic の前後振れは
// dipolePeakMag の符号のみで表す（T5 ハーネスと同方式）。※ QRS の向きは変更禁止（T5 ゲート）。
const DIR_60: [number, number, number] = [0.5, -0.8660254037844386, 0];

// P波・T波は QRS(+60°)から少しだけ振る。正常心でも P軸・QRS軸・T軸は完全一致せず、aVL(-30°)が
// +60° と直交して周期を通しフラットになるのを避けるための微小 tilt。詳細と再検証見込みは
// docs/tasks/avl-pt-axis-tilt.md 参照。QRS-T angle = 10°（正常範囲）。この tilt により aVL の
// P・T に小さな非ゼロの振れが出る（実測 P≈0.034 / T≈0.052、QRS は near-iso のまま）。
const DIR_P_45: [number, number, number] = dirFromDeg(45); // P波軸 +45°
const DIR_T_50: [number, number, number] = dirFromDeg(50); // T波軸 +50°

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
      dipoleDir: DIR_P_45, // P波軸 +45°（aVL を非ゼロ化。QRS とは別軸）
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
      // 心室再分極（T）：QRS と概ね同極性（concordant）だが軸はわずかに分離（+50°）。
      id: "repol",
      segment: "ventRepol",
      centerMs: tPeak,
      sigmaMs: (tEnd - qrsOff) / 5.0,
      dipoleDir: DIR_T_50, // T波軸 +50°（QRS-T angle 10°。aVL を非ゼロ化）
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
