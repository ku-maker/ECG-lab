"use client";

import { assessMeasurement, describeEndpoint } from "@/lib/ecg/measurementPractice";
import type { TeachingMark } from "@/lib/ecg/teachingHighlights";
import { useState } from "react";
import { pointToSignal, signalToPoint, type MonitorScale } from "@/lib/ecg/monitorScale";

type Point = { timeMs: number; mv: number };

export function WaveformCalipers({ scale, practiceMarks, practiceLabel }: { scale: MonitorScale; practiceMarks?: TeachingMark[]; practiceLabel?: string }) {
  const [points, setPoints] = useState<Point[]>([]);
  const [cursor, setCursor] = useState({ x: 0.5, y: 0.5 });
  const addPoint = (x: number, y: number) => {
    const point = pointToSignal(x, y, scale);
    setPoints((current) => current.length === 2 ? [point] : [...current, point]);
  };
  const result = points.length === 2
    ? `時間差 ${Math.abs(points[1].timeMs - points[0].timeMs).toFixed(0)} ms ／ 電位差 ${Math.abs(points[1].mv - points[0].mv).toFixed(2)} mV`
    : points.length === 1 ? "2点目を選択してください" : "波形上の2点を選択して計測";

  const assessment = practiceMarks ? assessMeasurement(points, practiceMarks) : null;
  return (
    <>
      <button
        type="button"
        aria-label="波形の2点計測。矢印キーでカーソル移動、Enterで点を指定、Escapeでクリア"
        className="group absolute inset-0 cursor-crosshair touch-manipulation focus-visible:outline-2 focus-visible:outline-blue-700 focus-visible:outline-offset-[-2px]"
        onClick={(event) => {
          // Assistive-technology activation uses the keyboard cursor.
          if (event.detail === 0) {
            addPoint(cursor.x * scale.width, cursor.y * scale.height);
            return;
          }
          const rect = event.currentTarget.getBoundingClientRect();
          addPoint((event.clientX - rect.left) / rect.width * scale.width,
            (event.clientY - rect.top) / rect.height * scale.height);
        }}
        onKeyDown={(event) => {
          if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", " ", "Escape"].includes(event.key)) event.preventDefault();
          const stepX = (event.shiftKey ? 40 : 5) / scale.visibleMs;
          const stepY = (event.shiftKey ? 0.1 : 0.01) * scale.pxPerMv / scale.height;
          if (event.key.startsWith("Arrow")) {
            setCursor((current) => ({
              x: Math.max(0, Math.min(1, current.x + (event.key === "ArrowRight" ? stepX : event.key === "ArrowLeft" ? -stepX : 0))),
              y: Math.max(0, Math.min(1, current.y + (event.key === "ArrowDown" ? stepY : event.key === "ArrowUp" ? -stepY : 0))),
            }));
          } else if (event.key === "Enter" || event.key === " ") {
            addPoint(cursor.x * scale.width, cursor.y * scale.height);
          } else if (event.key === "Escape") setPoints([]);
        }}
      >
        <svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox={`0 0 ${scale.width} ${scale.height}`}>
          {points.map((point, index) => {
            const { x, y } = signalToPoint(point, scale);
            return <g key={index} stroke="#1d4ed8" strokeWidth="1.5">
              <path d={`M ${x} 0 V ${scale.height} M 0 ${y} H ${scale.width}`} strokeDasharray="4 3" />
              <circle cx={x} cy={y} r="5" fill="white" />
              <text x={Math.min(x + 8, scale.width - 18)} y={Math.max(16, y - 8)} fill="#1d4ed8" stroke="none" fontSize="14">{index + 1}</text>
            </g>;
          })}
          <circle className="hidden group-focus-visible:block" cx={cursor.x * scale.width} cy={cursor.y * scale.height} r="7" fill="none" stroke="#1d4ed8" strokeWidth="2" />
        </svg>
      </button>
      <output aria-live="polite" className="pointer-events-none absolute bottom-1 left-2 right-2 rounded bg-white/95 px-2 py-1 text-xs text-blue-950 shadow-sm">
        {practiceLabel ? <span className="mr-2 font-semibold">{practiceLabel}の練習</span> : null}
        {result}<span className="ml-2 text-slate-600">{points.length === 2 ? "次の点で再計測" : "手動計測"}</span>
        {assessment ? <span className="mt-1 block">
          {assessment.correct ? "始点・終点とも基準位置を捉えています。" : `${describeEndpoint("始点", assessment.startOffsetMs)} ／ ${describeEndpoint("終点", assessment.endOffsetMs)}`}
          <span className="block">基準の長さ：約{Math.round(assessment.expectedMs)} ms ／ 差：{Math.round(assessment.measuredMs - assessment.expectedMs)} ms</span>
        </span> : null}
      </output>
    </>
  );
}
