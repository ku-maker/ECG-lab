"use client";

import { OrbitControls, Text } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { Slider } from "@/components/ui/slider";
import { clamp } from "@/lib/ecg/easing";
import { useCardiacClock } from "@/lib/ecg/useCardiacClock";
import { evaluateSegments } from "@/src/data/ecg/activation/evaluate";
import { nsrTimeline } from "@/src/data/ecg/activation/nsr";
import {
  CONDUCTION_POINTS,
  SEGMENT_POINTS,
} from "@/src/data/ecg/activation/segmentPoints";
import type { ConductionSegmentId } from "@/src/data/ecg/activation/types";
import { resolveVentricularGlow } from "@/src/data/ecg/activation/ventricularGlow";
import {
  GRAPH_BASELINE_Y,
  GRAPH_HEIGHT,
  GRAPH_SAMPLE_COUNT,
  computeGraphMvScale,
} from "@/src/data/ecg/leads/graphScale";
import { LEADS, type LeadId } from "@/src/data/ecg/leads/leadAxes";
import { leadCameraPosition } from "@/src/data/ecg/leads/leadCamera";
import {
  projectLeadValue,
  sampleLeadCycle,
} from "@/src/data/ecg/leads/projectLead";
import nsrTemplate from "@/src/data/ecg/templates/nsr-lead2.json";

const GRAPH_WIDTH = 900;
const GRAPH_PADDING_X = 36;
const PLOT_WIDTH = GRAPH_WIDTH - GRAPH_PADDING_X * 2;
// 縦スケールは全12誘導の全体最大振幅から導出（どの誘導でも枠内に収める）。module ロード時に一度算出。
const GRAPH_MV_SCALE = computeGraphMvScale(nsrTimeline, LEADS);

type VectorPoint = [number, number, number];

const SCENE_TARGET: VectorPoint = [-0.08, -0.28, 0.02];

// カメラ位置は leadCameraPosition（T2 の leadAxis 由来）で算出する。
// 伝導路の3D点列は SEGMENT_POINTS / CONDUCTION_POINTS（segmentPoints.ts）から import。

const ECG_TIMELINE_MS = {
  cycleStart: 0,
  pOn: nsrTemplate.fiducialsMs.pOn ?? 120,
  pOff: nsrTemplate.fiducialsMs.pOff ?? 240,
  qrsOn: nsrTemplate.fiducialsMs.qrsOn ?? 360,
  qrsOff: nsrTemplate.fiducialsMs.qrsOff ?? 460,
  tPeak: nsrTemplate.fiducialsMs.tPeak ?? 640,
  tEnd: nsrTemplate.fiducialsMs.tEnd ?? 820,
  cycleEnd: nsrTemplate.durationMs,
} as const;

const CONDUCTION_COLORS = {
  atrial: "#fef08a",
  avDelay: "#a7f3d0",
  ventricular: "#f472b6",
  septal: "#c4b5fd",
  recovery: "#67e8f9",
} as const;

// 各セグメントの発光ウィンドウ [center-2σ, center+2σ]（伝導パルスの走行位置算出用）。
// nsrTimeline のイベントから一度だけ構築する。
type SegmentWindow = { start: number; end: number };
const SEGMENT_WINDOWS: Partial<Record<ConductionSegmentId, SegmentWindow>> =
  (() => {
    const windows: Partial<Record<ConductionSegmentId, SegmentWindow>> = {};
    for (const event of nsrTimeline.events) {
      const start = event.centerMs - 2 * event.sigmaMs;
      const end = event.centerMs + 2 * event.sigmaMs;
      const existing = windows[event.segment];
      windows[event.segment] = existing
        ? { start: Math.min(existing.start, start), end: Math.max(existing.end, end) }
        : { start, end };
    }
    return windows;
  })();

// phaseMs におけるセグメント内ローカル進行度 0..1（パルスの走行位置）。
function segmentLocalProgress(
  segment: ConductionSegmentId,
  phaseMs: number
): number {
  const window = SEGMENT_WINDOWS[segment];
  if (!window || window.end <= window.start) return 0;
  return clamp((phaseMs - window.start) / (window.end - window.start), 0, 1);
}

function sliderValue(values: number | readonly number[]): number {
  if (typeof values === "number") return values;
  return values[0] ?? 0;
}

// SVG viewBox 内に y をクランプ（保険。データ駆動スケールでは正常時に発動しない）。
function clampGraphY(y: number): number {
  return clamp(y, 0, GRAPH_HEIGHT);
}

// モバイル幅（<768px）判定。3Dラベルの出し分けに使う。SSR/初期は false（ラベル表示）。
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isMobile;
}

// 選択誘導の投影波形（leadValue = evaluateDipole · leadAxis）を SVG パスにする。
// 全誘導共通の固定 mV スケール（GRAPH_MV_SCALE）を用い、誘導ごと正規化はしない
// （誘導間の相対的な大小・極性を保つため）。
function buildLeadPath(id: LeadId): string {
  const samples = sampleLeadCycle(nsrTimeline, id, GRAPH_SAMPLE_COUNT);

  return samples
    .map((sample, index) => {
      const ratio = sample.tMs / nsrTimeline.cycleMs;
      const x = GRAPH_PADDING_X + ratio * PLOT_WIDTH;
      const y = clampGraphY(GRAPH_BASELINE_Y - sample.mv * GRAPH_MV_SCALE);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function toVector3(point: VectorPoint): THREE.Vector3 {
  return new THREE.Vector3(...point);
}

function getEcgPhaseLabel(phaseMs: number): string {
  const currentMs = phaseMs;

  if (
    currentMs >= ECG_TIMELINE_MS.pOn &&
    currentMs < ECG_TIMELINE_MS.pOff
  ) {
    return "P wave";
  }
  if (
    currentMs >= ECG_TIMELINE_MS.pOff &&
    currentMs < ECG_TIMELINE_MS.qrsOn
  ) {
    return "AV delay";
  }
  if (
    currentMs >= ECG_TIMELINE_MS.qrsOn &&
    currentMs < ECG_TIMELINE_MS.qrsOff
  ) {
    return "QRS";
  }
  if (
    currentMs >= ECG_TIMELINE_MS.qrsOff &&
    currentMs < ECG_TIMELINE_MS.tPeak
  ) {
    return "ST segment";
  }
  if (
    currentMs >= ECG_TIMELINE_MS.tPeak &&
    currentMs < ECG_TIMELINE_MS.tEnd
  ) {
    return "T wave";
  }
  return "Rest";
}

const conductionVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const conductionFragmentShader = `
  uniform float uProgress;
  uniform float uActive;
  uniform float uUniform; // 1 = 方向なし均一グロー（再分極）、0 = 前進パルス（脱分極）
  uniform float uGlow;    // 均一グロー時の明るさ 0..1（ventRepol 包絡）
  uniform vec3 uColor;
  varying vec2 vUv;

  void main() {
    vec3 baseColor = vec3(0.20, 0.26, 0.28);
    float baseAlpha = 0.40;
    // 脱分極：位置 uProgress を先頭に前進する光（後方テール）。
    float distanceToPulse = abs(vUv.x - uProgress);
    float pulse = smoothstep(0.075, 0.0, distanceToPulse);
    float tailDiff = uProgress - vUv.x; // 常に後方（前進）テール。逆走は廃止。
    float tailMask = step(0.0, tailDiff);
    float tail = smoothstep(0.34, 0.0, tailDiff) * tailMask;
    float pulseIntensity = (pulse + tail * 0.55) * uActive;
    // 再分極：チューブ全体が方向を持たず均一に光る（uGlow で明滅）。
    float intensity = mix(pulseIntensity, uGlow, uUniform);
    vec3 finalColor = mix(baseColor, uColor, intensity);
    float finalAlpha = max(baseAlpha, intensity);

    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`;

function ConductionPathway({
  points,
  color,
  pulseProgress,
  active,
  glowMode = "pulse",
  glow = 0,
  radius = 0.018,
}: {
  points: VectorPoint[];
  color: string;
  pulseProgress: number;
  active: boolean;
  glowMode?: "pulse" | "uniform";
  glow?: number;
  radius?: number;
}) {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      points.map(toVector3),
      false,
      "catmullrom",
      0.5
    );

    return new THREE.TubeGeometry(curve, 144, radius, 10, false);
  }, [points, radius]);
  const uniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uActive: { value: 0 },
      uUniform: { value: 0 },
      uGlow: { value: 0 },
      uColor: { value: new THREE.Color(color) },
    }),
    [color]
  );

  useFrame(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uProgress.value = clamp(pulseProgress, 0, 1);
    materialRef.current.uniforms.uActive.value = active ? 1 : 0;
    materialRef.current.uniforms.uUniform.value = glowMode === "uniform" ? 1 : 0;
    materialRef.current.uniforms.uGlow.value = active ? clamp(glow, 0, 1) : 0;
    materialRef.current.uniforms.uColor.value.set(color);
  });

  return (
    <mesh geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={conductionVertexShader}
        fragmentShader={conductionFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function NodeMarker({
  position,
  label,
  color,
  showLabel = true,
  labelOffset = [0.18, 0.12, 0.02],
}: {
  position: VectorPoint;
  label: string;
  color: string;
  showLabel?: boolean;
  labelOffset?: VectorPoint;
}) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.06, 24, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} />
      </mesh>
      <mesh scale={[2.6, 2.6, 2.6]}>
        <sphereGeometry args={[0.06, 24, 24]} />
        <meshBasicMaterial color={color} opacity={0.16} transparent />
      </mesh>
      {showLabel ? (
        <Text
          anchorX="left"
          anchorY="middle"
          color="#e0f2fe"
          fontSize={0.038}
          outlineColor="#020617"
          outlineWidth={0.006}
          position={labelOffset}
        >
          {label}
        </Text>
      ) : null}
    </group>
  );
}

function TerminalGlow({
  active,
  color,
  intensity,
}: {
  active: boolean;
  color: string;
  intensity: number;
}) {
  const terminalPoints = [
    CONDUCTION_POINTS.rbbEnd,
    CONDUCTION_POINTS.lafEnd,
    CONDUCTION_POINTS.lpfEnd,
    CONDUCTION_POINTS.purkinjeApex,
  ];
  const opacity = active ? 0.34 * intensity : 0;
  const haloOpacity = active ? 0.12 * intensity : 0;

  return (
    <>
      {terminalPoints.map((point, index) => (
        <group key={`${point.join(",")}-${index}`} position={point}>
          <mesh>
            <sphereGeometry args={[0.052, 18, 18]} />
            <meshBasicMaterial color={color} opacity={opacity} transparent />
          </mesh>
          <mesh scale={[3.8, 3.8, 3.8]}>
            <sphereGeometry args={[0.052, 18, 18]} />
            <meshBasicMaterial
              color={color}
              opacity={haloOpacity}
              transparent
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

function LeadCameraController({ selectedLead }: { selectedLead: LeadId }) {
  const { camera } = useThree();
  // カメラ位置は leadCameraPosition（leadAxis 由来）で算出。目分量の
  // LEAD_CAMERA_POSITIONS は廃止し、投影軸とカメラを同一ソースに統一する。
  const targetPosition = useMemo(
    () => new THREE.Vector3(...leadCameraPosition(selectedLead, SCENE_TARGET)),
    [selectedLead]
  );
  const lookAtTarget = useMemo(() => new THREE.Vector3(...SCENE_TARGET), []);

  useFrame(() => {
    camera.position.lerp(targetPosition, 0.075);
    camera.lookAt(lookAtTarget);
  });

  return null;
}

// 心臓の側面シルエット（回転体プロファイル）。x=半径, y=高さ(-1=apex 下端 → +1=心基部 上端)。
// 上端は丸く閉じ、上〜中段で心室が膨らみ、下端は心尖(apex)へ1点に収束する対称テーパー形状。
// Y 軸まわりに latheGeometry で回して心臓らしい外形にする（LV/RV 非対称は今回入れない）。
const HEART_PROFILE: THREE.Vector2[] = [
  new THREE.Vector2(0.001, -1.0), // 心尖 apex（先端・ほぼ点）
  new THREE.Vector2(0.14, -0.9),
  new THREE.Vector2(0.34, -0.72),
  new THREE.Vector2(0.55, -0.5),
  new THREE.Vector2(0.75, -0.26),
  new THREE.Vector2(0.92, 0.0),
  new THREE.Vector2(1.0, 0.22), // 最大幅（上〜中段の心室膨らみ）
  new THREE.Vector2(0.98, 0.42),
  new THREE.Vector2(0.86, 0.62),
  new THREE.Vector2(0.66, 0.8),
  new THREE.Vector2(0.4, 0.93),
  new THREE.Vector2(0.001, 1.0), // 心基部 上端（丸く閉じる）
];

function AnatomicalBoundingHeart({ showLabel = true }: { showLabel?: boolean }) {
  return (
    <group>
      <mesh
        position={SCENE_TARGET}
        rotation={[0.12, 0.24, -0.24]}
        scale={[1.4, 1.3, 0.85]}
      >
        <latheGeometry args={[HEART_PROFILE, 48]} />
        <meshStandardMaterial
          color="#7f1d1d"
          emissive="#450a0a"
          emissiveIntensity={0.2}
          opacity={0.38}
          transparent
          wireframe
        />
      </mesh>
      {showLabel ? (
        <Text
          anchorX="center"
          anchorY="middle"
          color="#cbd5e1"
          fontSize={0.038}
          outlineColor="#020617"
          outlineWidth={0.006}
          position={[
            CONDUCTION_POINTS.purkinjeApex[0],
            CONDUCTION_POINTS.purkinjeApex[1] - 0.14,
            CONDUCTION_POINTS.purkinjeApex[2],
          ]}
        >
          Apex
        </Text>
      ) : null}
    </group>
  );
}

function HeartVectorScene({
  phaseMs,
  selectedLead,
  showLabels,
}: {
  phaseMs: number;
  selectedLead: LeadId;
  showLabels: boolean;
}) {
  const segments = evaluateSegments(nsrTimeline, phaseMs);

  const qrsGlow = segments.septalPurkinje;
  const repolGlow = segments.ventRepol;
  // 心室系の発光スタイル（純関数）。再分極は方向なし均一グロー（逆走なし）。
  const vent = resolveVentricularGlow(segments);
  const isRepol = vent.phase === "repol";

  // 心室系パスウェイ（RBB/LAF/LPF/septalPurkinje）。脱分極時のみ前進パルスを掃引し、
  // 再分極時は均一グロー（掃引しない）。His/脚は固有イベントを持たないため QRS 窓に同期。
  const ventProgress = isRepol
    ? 0
    : segmentLocalProgress("septalPurkinje", phaseMs);
  const ventActive = vent.active;
  const ventGlowMode = vent.mode;
  const ventGlow = vent.intensity; // 再分極: ventRepol 包絡（1心拍1回の穏やかな明滅）
  const ventColor = CONDUCTION_COLORS[vent.ventColorKey];
  const septalColor = CONDUCTION_COLORS[vent.septalColorKey];

  const glowActive = qrsGlow > 0.02 || repolGlow > 0.02;
  const glowColor = isRepol
    ? CONDUCTION_COLORS.recovery
    : CONDUCTION_COLORS.ventricular;
  const glowIntensity = Math.max(qrsGlow, repolGlow);

  return (
    <Canvas
      camera={{ position: [0, -0.18, 4.85], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <color attach="background" args={["#0f172a"]} />
      <ambientLight intensity={0.9} />
      <pointLight position={[2, 2.4, 3]} intensity={5.2} color="#67e8f9" />
      <pointLight position={[-2, -1, 2.2]} intensity={2.2} color="#fb7185" />

      <LeadCameraController selectedLead={selectedLead} />
      <AnatomicalBoundingHeart showLabel={showLabels} />

      <ConductionPathway
        points={SEGMENT_POINTS.saAtrial}
        color={CONDUCTION_COLORS.atrial}
        pulseProgress={segmentLocalProgress("saAtrial", phaseMs)}
        active={segments.saAtrial > 0.02}
        radius={0.016}
      />
      <ConductionPathway
        points={SEGMENT_POINTS.avDelay}
        color={CONDUCTION_COLORS.avDelay}
        pulseProgress={segmentLocalProgress("avDelay", phaseMs)}
        active={segments.avDelay > 0.02}
        radius={0.018}
      />
      <ConductionPathway
        points={SEGMENT_POINTS.rightBundle}
        color={ventColor}
        pulseProgress={ventProgress}
        active={ventActive}
        glowMode={ventGlowMode}
        glow={ventGlow}
        radius={0.018}
      />
      <ConductionPathway
        points={SEGMENT_POINTS.leftAnterior}
        color={ventColor}
        pulseProgress={ventProgress}
        active={ventActive}
        glowMode={ventGlowMode}
        glow={ventGlow}
        radius={0.019}
      />
      <ConductionPathway
        points={SEGMENT_POINTS.leftPosterior}
        color={ventColor}
        pulseProgress={ventProgress}
        active={ventActive}
        glowMode={ventGlowMode}
        glow={ventGlow}
        radius={0.019}
      />
      <ConductionPathway
        points={SEGMENT_POINTS.septalPurkinje}
        color={septalColor}
        pulseProgress={ventProgress}
        active={ventActive}
        glowMode={ventGlowMode}
        glow={ventGlow}
        radius={0.015}
      />
      <TerminalGlow
        active={glowActive}
        color={glowColor}
        intensity={glowIntensity}
      />

      <NodeMarker
        position={CONDUCTION_POINTS.sa}
        label="SA Node"
        color="#67e8f9"
        showLabel={showLabels}
        labelOffset={[0.2, 0.11, 0.02]}
      />
      <NodeMarker
        position={CONDUCTION_POINTS.av}
        label="AV Node"
        color="#a7f3d0"
        showLabel={showLabels}
        labelOffset={[0.18, 0.08, 0.02]}
      />
      <NodeMarker
        position={CONDUCTION_POINTS.his}
        label="Bundle of His"
        color="#f0abfc"
        showLabel={showLabels}
        labelOffset={[0.18, -0.02, 0.02]}
      />

      <OrbitControls
        enablePan={false}
        minDistance={3.2}
        maxDistance={6.6}
        target={SCENE_TARGET}
      />
    </Canvas>
  );
}

function EcgRevealGraph({
  phaseMs,
  cycleMs,
  selectedLead,
}: {
  phaseMs: number;
  cycleMs: number;
  selectedLead: LeadId;
}) {
  const clipId = useId();
  // 波形パスは選択誘導が変わった時のみ再生成（毎フレームではない）。
  const wavePath = useMemo(() => buildLeadPath(selectedLead), [selectedLead]);
  const progressRatio = clamp(cycleMs > 0 ? phaseMs / cycleMs : 0, 0, 1);
  const clipWidth = GRAPH_PADDING_X + PLOT_WIDTH * progressRatio;
  // カーソル用の1回だけの投影（レンダ経路。毎フレームの useFrame 経路ではない）。
  const currentMv = projectLeadValue(nsrTimeline, selectedLead, phaseMs);
  const currentPoint = {
    x: GRAPH_PADDING_X + progressRatio * PLOT_WIDTH,
    y: clampGraphY(GRAPH_BASELINE_Y - currentMv * GRAPH_MV_SCALE),
  };
  const phase = getEcgPhaseLabel(phaseMs);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-[#08111f]">
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 text-emerald-300">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400/70">
            Lead {selectedLead}
          </div>
          <h2 className="text-sm font-semibold md:text-base">
            NSR projected waveform
          </h2>
        </div>
        <div className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 font-mono text-xs">
          {phase}
        </div>
      </div>

      <div className="min-h-0 flex-1 px-3 py-4 md:px-5">
        <svg
          aria-label="同期して描画される正常洞調律の心電図波形"
          className="block h-full w-full"
          viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
        >
          <defs>
            <pattern
              id={`${clipId}-minor-grid`}
              width="30"
              height="30"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 30 0 L 0 0 0 30"
                fill="none"
                stroke="#164e63"
                strokeOpacity="0.32"
                strokeWidth="1"
              />
            </pattern>
            <pattern
              id={`${clipId}-major-grid`}
              width="150"
              height="150"
              patternUnits="userSpaceOnUse"
            >
              <rect
                width="150"
                height="150"
                fill={`url(#${clipId}-minor-grid)`}
              />
              <path
                d="M 150 0 L 0 0 0 150"
                fill="none"
                stroke="#22d3ee"
                strokeOpacity="0.18"
                strokeWidth="2"
              />
            </pattern>
            <clipPath id={`${clipId}-reveal`}>
              <rect x="0" y="0" width={clipWidth} height={GRAPH_HEIGHT} />
            </clipPath>
          </defs>

          <rect width={GRAPH_WIDTH} height={GRAPH_HEIGHT} fill="#08111f" />
          <rect
            width={GRAPH_WIDTH}
            height={GRAPH_HEIGHT}
            fill={`url(#${clipId}-major-grid)`}
          />
          <line
            x1={GRAPH_PADDING_X}
            x2={GRAPH_WIDTH - GRAPH_PADDING_X}
            y1={GRAPH_BASELINE_Y}
            y2={GRAPH_BASELINE_Y}
            stroke="#94a3b8"
            strokeOpacity="0.3"
            strokeWidth="2"
          />
          <path
            d={wavePath}
            fill="none"
            stroke="#064e3b"
            strokeOpacity="0.42"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={wavePath}
            fill="none"
            stroke="#34d399"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            clipPath={`url(#${clipId}-reveal)`}
          />
          <circle
            cx={currentPoint.x}
            cy={currentPoint.y}
            r="8"
            fill="#fef08a"
            stroke="#facc15"
            strokeWidth="4"
          />
        </svg>
      </div>
    </div>
  );
}

const NSR_BPM = 60_000 / nsrTimeline.cycleMs;

export function VectorVisualizer() {
  // 単一の心周期クロック（single source of truth）。3D・波形・カーソル・reveal・
  // スライダー・読み出しは全てこの phaseMs を購読する。
  const { phaseMs, cycleMs: clockCycleMs, mode, play, pause, scrubTo } =
    useCardiacClock({ bpm: NSR_BPM, cycleMs: nsrTimeline.cycleMs, autoPlay: false });
  const [selectedLead, setSelectedLead] = useState<LeadId>("II");
  // モバイルでは3Dラベルを隠して心臓本体の視認性を優先（ノードの球は残す）。
  const isMobile = useIsMobile();
  // 選択誘導の現在位相における投影値（下部の ms/mV 読み出し用。レンダ経路の1回計算）。
  const currentMv = projectLeadValue(nsrTimeline, selectedLead, phaseMs);
  const sliderPercent = clockCycleMs > 0 ? (phaseMs / clockCycleMs) * 100 : 0;
  const isPlaying = mode === "playing";

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:grid-rows-1">
        <section
          aria-label="刺激伝導マップ"
          className="relative min-h-0 overflow-hidden border-b border-border bg-[#0f172a] lg:border-r lg:border-b-0"
        >
          <HeartVectorScene
            phaseMs={phaseMs}
            selectedLead={selectedLead}
            showLabels={!isMobile}
          />
          {/* 注釈は上端(タイトル)・下端(免責文)へ振り分け、中央の3Dモデルに被らないようにする。 */}
          <div className="pointer-events-none absolute top-3 left-4 text-cyan-100">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-cyan-200/60">
              Conduction Map
            </div>
            <h2 className="text-sm font-semibold">刺激伝導マップ</h2>
          </div>
          <div className="pointer-events-none absolute top-3 right-4 font-mono text-[10px] text-cyan-100/60">
            View angle: Lead {selectedLead}-like
          </div>
          <p className="pointer-events-none absolute bottom-2 left-4 right-4 text-[10px] leading-snug text-cyan-100/55">
            正常洞調律における刺激伝導の概念図です。実際の3D心臓電気ベクトルや12誘導心電図を厳密に再現するものではありません。
          </p>
        </section>

        <section aria-label="2D心電図波形" className="flex min-h-0">
          <EcgRevealGraph
            phaseMs={phaseMs}
            cycleMs={clockCycleMs}
            selectedLead={selectedLead}
          />
        </section>
      </div>

      <section
        aria-label="伝導マップ同期スライダー"
        className="shrink-0 border-t border-border bg-card px-4 py-4 md:px-6"
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Lead-like view</h2>
              <span className="font-mono text-xs text-muted-foreground">
                {selectedLead}
              </span>
            </div>
            <div
              className="grid grid-cols-6 gap-1.5 sm:grid-cols-12"
              role="group"
              aria-label="誘導方向を模した視点切り替え"
            >
              {LEADS.map((lead) => {
                const isActive = selectedLead === lead;

                return (
                  <button
                    key={lead}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setSelectedLead(lead)}
                    className={[
                      "h-8 rounded-md border px-2 font-mono text-xs font-semibold transition-colors",
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-muted",
                    ].join(" ")}
                  >
                    {lead}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              ※ 波形は各誘導への簡略化した双極子投影です（胸部誘導 V1–V6 は近似）。厳密な12誘導心電図を再現するものではありません。
            </p>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold">Conduction progress</h2>
              <p className="font-mono text-xs text-muted-foreground">
                {Math.round(sliderPercent)}% / {Math.round(phaseMs)}ms /{" "}
                {currentMv.toFixed(3)}mV
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => (isPlaying ? pause() : play())}
                aria-pressed={isPlaying}
                className="h-8 rounded-md border border-border bg-background px-3 font-mono text-xs font-semibold text-foreground transition-colors hover:bg-muted"
              >
                {isPlaying ? "Pause" : "Play"}
              </button>
              <div className="rounded-md border border-border bg-muted px-3 py-1 font-mono text-xs">
                NSR Lead {selectedLead}
              </div>
            </div>
          </div>
          <Slider
            min={0}
            max={100}
            step={0.5}
            value={[sliderPercent]}
            onValueChange={(value) => scrubTo(sliderValue(value) / 100)}
            aria-label="刺激伝導マップと選択誘導波形の同期進行度"
          />
        </div>
      </section>
    </main>
  );
}
