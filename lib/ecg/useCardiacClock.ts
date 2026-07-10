"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  advance,
  cycleMsFromBpm,
  enterPlaying,
  enterScrubbing,
  phaseOf,
  scrubToRatio,
  setBpm as setBpmPure,
  type ClockMode,
  type ClockState,
} from "./cardiacClock";

// 薄い React ラッパ。数式は一切持たず cardiacClock.ts の純ロジックを呼ぶだけ
// （数式がフックへ漏れると Node 検証の網から外れるため）。
//
// 毎フレームアロケーションについて（T9 の制約を念頭に）：
//   - 公開する phaseMs は「プリミティブな number」。購読側は数値を受け取るだけで、
//     購読自体が下流のアロケーションを強制しない。
//   - 毎フレームの重い評価（evaluateDipole）は購読側（T7/T9）が使い回し用 out
//     バッファに書き込む契約。クロックはそれを妨げない。
//   - クロックの状態遷移（advance）はイミュータブルな小さな固定サイズオブジェクト
//     （4フィールド）を1つ返すのみ。RAF ループ内で配列/大きなオブジェクトを新規生成
//     しない。
//
// RAF ライフサイクルは mode ステートをキーにした useEffect が所有する（自己参照 RAF
// や render 中の ref 書き込みを避けるため）。mode → "playing" に入る度に effect が
// 再実行され、ローカルの基準時刻 lastTs が null から始まるので、scrub→play 復帰時に
// 巨大 delta を渡さない（位相が飛ばない）。

type UseCardiacClockOptions = {
  bpm: number;
  cycleMs: number;
  /** 初期状態で再生を開始するか（既定 true）。 */
  autoPlay?: boolean;
};

type UseCardiacClockResult = {
  phaseMs: number;
  cycleMs: number;
  mode: ClockMode;
  play: () => void;
  pause: () => void;
  scrubTo: (ratio: number) => void;
  setBpm: (bpm: number) => void;
};

export function useCardiacClock({
  bpm,
  cycleMs,
  autoPlay = true,
}: UseCardiacClockOptions): UseCardiacClockResult {
  const initialMode: ClockMode = autoPlay ? "playing" : "scrubbing";
  // 可変の真実（RAF ループが読み書きする）。
  const stateRef = useRef<ClockState>({
    mode: initialMode,
    elapsedMs: 0,
    cycleMs: cycleMsFromBpm(bpm, cycleMs),
    bpm,
  });
  const fallbackCycleRef = useRef(cycleMs);

  // 購読側が render で読む値はすべて state（render 中の ref アクセスを避ける）。
  const [phaseMs, setPhaseMs] = useState(0);
  const [publishedCycleMs, setPublishedCycleMs] = useState(() =>
    cycleMsFromBpm(bpm, cycleMs)
  );
  const [mode, setMode] = useState<ClockMode>(initialMode);

  // bpm<=0（VF 等）時の cycle フォールバックを prop に追従（render 中に書かない）。
  useEffect(() => {
    fallbackCycleRef.current = cycleMs;
  }, [cycleMs]);

  // RAF ループは mode をキーに effect が所有。playing の間だけ回す。
  useEffect(() => {
    if (mode !== "playing") return;

    let raf = 0;
    let lastTs: number | null = null; // 再開直後の巨大 delta を防ぐ基準時刻
    const tick = (ts: number) => {
      if (lastTs === null) lastTs = ts;
      const delta = ts - lastTs;
      lastTs = ts;
      stateRef.current = advance(stateRef.current, delta);
      setPhaseMs(phaseOf(stateRef.current));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [mode]);

  const play = useCallback(() => {
    stateRef.current = enterPlaying(stateRef.current);
    setMode("playing");
  }, []);

  const pause = useCallback(() => {
    stateRef.current = enterScrubbing(stateRef.current);
    setMode("scrubbing");
    setPhaseMs(phaseOf(stateRef.current));
  }, []);

  const scrubTo = useCallback((ratio: number) => {
    // スクラブは非再生。掴む＝enterScrubbing、位置指定＝scrubToRatio。
    stateRef.current = scrubToRatio(enterScrubbing(stateRef.current), ratio);
    setMode("scrubbing");
    setPhaseMs(phaseOf(stateRef.current));
  }, []);

  const setBpm = useCallback((nextBpm: number) => {
    stateRef.current = setBpmPure(
      stateRef.current,
      nextBpm,
      fallbackCycleRef.current
    );
    setPublishedCycleMs(stateRef.current.cycleMs);
    setPhaseMs(phaseOf(stateRef.current));
  }, []);

  return {
    phaseMs,
    cycleMs: publishedCycleMs,
    mode,
    play,
    pause,
    scrubTo,
    setBpm,
  };
}
