// 賦活タイムライン（Activation Timeline）のデータ構造。
// 心周期を「賦活イベントの列」として表現し、3D発光・双極子・12誘導波形すべての
// single source of truth になる。評価ロジック（総和・包絡計算）は T4 に置く。
//
// 外部 import ゼロ（T2 同様、Node の型ストリップで検証可能に保つため）。

export type ConductionSegmentId =
  | "saAtrial"
  | "avDelay"
  | "hisBundle"
  | "rightBundle"
  | "leftAnterior"
  | "leftPosterior"
  | "septalPurkinje"
  | "ventRepol";

export type ActivationEvent = {
  /** 一意名（"atrial","septalQ","mainR","terminalS","repol" 等） */
  id: string;
  /** 3D発光の対応セグメント */
  segment: ConductionSegmentId;
  /** 包絡の中心時刻（ms、心周期起点=0 からの相対） */
  centerMs: number;
  /** 包絡の幅（Gaussian の σ、ms） */
  sigmaMs: number;
  /** 双極子の向き（単位ベクトル。フレームは T2 と同一：+X=左, +Y=上, +Z=前） */
  dipoleDir: [number, number, number];
  /** ピーク振幅（負値で逆向き＝biphasic の Q/S を表現） */
  dipolePeakMag: number;
  /** 波形寄与の有無（avDelay は false＝電気的に静かな PR 区間） */
  contributesToWave: boolean;
};

export type ActivationTimeline = {
  /** 対応する BeatTemplate.id（例 "nsr-lead2-v0"） */
  templateId: string;
  /** 1心周期長（ms、BeatTemplate.durationMs と一致） */
  cycleMs: number;
  events: ActivationEvent[];
};
