"use client";

import { Line, OrbitControls, Text } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useId, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { Slider } from "@/components/ui/slider";
import { clamp } from "@/lib/ecg/easing";
import { evaluateSegments } from "@/src/data/ecg/activation/evaluate";
import { nsrTimeline } from "@/src/data/ecg/activation/nsr";
import {
  CONDUCTION_POINTS,
  SEGMENT_POINTS,
} from "@/src/data/ecg/activation/segmentPoints";
import type { ConductionSegmentId } from "@/src/data/ecg/activation/types";
import { LEADS, type LeadId } from "@/src/data/ecg/leads/leadAxes";
import { leadCameraPosition } from "@/src/data/ecg/leads/leadCamera";
import nsrTemplate from "@/src/data/ecg/templates/nsr-lead2.json";

const GRAPH_WIDTH = 900;
const GRAPH_HEIGHT = 360;
const GRAPH_PADDING_X = 36;
const GRAPH_BASELINE_Y = 205;
const GRAPH_MV_SCALE = 128;
const PLOT_WIDTH = GRAPH_WIDTH - GRAPH_PADDING_X * 2;

type VectorPoint = [number, number, number];
type PulseDirection = "forward" | "reverse";

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

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;

  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

function getNsrValueAtMs(ms: number): number {
  const samples = nsrTemplate.samplesMv;
  const durationMs = nsrTemplate.durationMs;
  const position = clamp(ms / durationMs, 0, 1) * (samples.length - 1);
  const index = Math.floor(position);
  const localT = position - index;
  const sampleAt = (sampleIndex: number) =>
    samples[clamp(sampleIndex, 0, samples.length - 1)] ?? 0;

  return catmullRom(
    sampleAt(index - 1),
    sampleAt(index),
    sampleAt(index + 1),
    sampleAt(index + 2),
    localT
  );
}

function ecgPointAt(progressRatio: number) {
  const ratio = clamp(progressRatio, 0, 1);
  const ms = ratio * nsrTemplate.durationMs;
  const mv = getNsrValueAtMs(ms);

  return {
    x: GRAPH_PADDING_X + ratio * PLOT_WIDTH,
    y: GRAPH_BASELINE_Y - mv * GRAPH_MV_SCALE,
    mv,
    ms,
  };
}

function buildNsrPath(): string {
  const pointCount = 420;

  return Array.from({ length: pointCount + 1 }, (_, index) => {
    const ratio = index / pointCount;
    const point = ecgPointAt(ratio);
    const command = index === 0 ? "M" : "L";

    return `${command} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }).join(" ");
}

function toVector3(point: VectorPoint): THREE.Vector3 {
  return new THREE.Vector3(...point);
}

function progressToTemplateMs(progress: number): number {
  return (clamp(progress, 0, 100) / 100) * nsrTemplate.durationMs;
}

function getEcgPhaseLabel(progress: number): string {
  const currentMs = progressToTemplateMs(progress);

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
  uniform float uReverse;
  uniform vec3 uColor;
  varying vec2 vUv;

  void main() {
    vec3 baseColor = vec3(0.10, 0.14, 0.15);
    float baseAlpha = 0.24;
    float distanceToPulse = abs(vUv.x - uProgress);
    float pulse = smoothstep(0.075, 0.0, distanceToPulse);
    float forwardTailDiff = uProgress - vUv.x;
    float reverseTailDiff = vUv.x - uProgress;
    float tailDiff = mix(forwardTailDiff, reverseTailDiff, uReverse);
    float tailMask = step(0.0, tailDiff);
    float tail = smoothstep(0.34, 0.0, tailDiff) * tailMask;
    float intensity = (pulse + tail * 0.55) * uActive;
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
  direction = "forward",
  radius = 0.018,
}: {
  points: VectorPoint[];
  color: string;
  pulseProgress: number;
  active: boolean;
  direction?: PulseDirection;
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
      uReverse: { value: 0 },
      uColor: { value: new THREE.Color(color) },
    }),
    [color]
  );

  useFrame(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uProgress.value = clamp(pulseProgress, 0, 1);
    materialRef.current.uniforms.uActive.value = active ? 1 : 0;
    materialRef.current.uniforms.uReverse.value =
      direction === "reverse" ? 1 : 0;
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
  labelOffset = [0.18, 0.12, 0.02],
}: {
  position: VectorPoint;
  label: string;
  color: string;
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
      <Text
        anchorX="left"
        anchorY="middle"
        color="#e0f2fe"
        fontSize={0.055}
        outlineColor="#020617"
        outlineWidth={0.006}
        position={labelOffset}
      >
        {label}
      </Text>
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

function AnatomicalBoundingHeart() {
  return (
    <group>
      <mesh
        position={SCENE_TARGET}
        rotation={[0.12, 0.24, -0.24]}
        scale={[1.32, 1.72, 0.82]}
      >
        <sphereGeometry args={[1, 64, 32]} />
        <meshStandardMaterial
          color="#7f1d1d"
          emissive="#450a0a"
          emissiveIntensity={0.08}
          opacity={0.2}
          transparent
          wireframe
        />
      </mesh>
      <Line
        points={[
          CONDUCTION_POINTS.sa,
          CONDUCTION_POINTS.av,
          CONDUCTION_POINTS.his,
          CONDUCTION_POINTS.purkinjeApex,
        ]}
        color="#e2e8f0"
        lineWidth={1.2}
        transparent
        opacity={0.22}
      />
      <Text
        anchorX="center"
        anchorY="middle"
        color="#cbd5e1"
        fontSize={0.052}
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
    </group>
  );
}

function HeartVectorScene({
  progress,
  selectedLead,
}: {
  progress: number;
  selectedLead: LeadId;
}) {
  // 暫定 phaseMs ブリッジ：T7 時点ではクロック（T6）未配線のため progress(0–100) を
  // phaseMs に変換して使う。T9 で useCardiacClock の phaseMs に置換する。
  // TODO(T9): この暫定ブリッジを撤去し、単一クロックの phaseMs を購読する。
  const phaseMs = (clamp(progress, 0, 100) / 100) * nsrTimeline.cycleMs;
  const segments = evaluateSegments(nsrTimeline, phaseMs);

  const qrsGlow = segments.septalPurkinje;
  const repolGlow = segments.ventRepol;
  // T波（ventRepol）が優勢な間は心室系を recovery 色で逆向きに流す。
  const isRepol = repolGlow > 0.02 && repolGlow >= qrsGlow;

  // 心室系パスウェイ（RBB/LAF/LPF/septalPurkinje）は QRS 窓（septalPurkinje）に
  // 同期して発光する（His/脚は固有イベントを持たないため）。
  const ventProgress = segmentLocalProgress(
    isRepol ? "ventRepol" : "septalPurkinje",
    phaseMs
  );
  const ventActive = isRepol ? repolGlow > 0.02 : qrsGlow > 0.02;
  const ventColor = isRepol
    ? CONDUCTION_COLORS.recovery
    : CONDUCTION_COLORS.ventricular;
  const septalColor = isRepol
    ? CONDUCTION_COLORS.recovery
    : CONDUCTION_COLORS.septal;
  const ventDirection: PulseDirection = isRepol ? "reverse" : "forward";

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
      <color attach="background" args={["#071018"]} />
      <ambientLight intensity={0.72} />
      <pointLight position={[2, 2.4, 3]} intensity={5.2} color="#67e8f9" />
      <pointLight position={[-2, -1, 2.2]} intensity={2.2} color="#fb7185" />

      <LeadCameraController selectedLead={selectedLead} />
      <AnatomicalBoundingHeart />

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
        direction={ventDirection}
        radius={0.018}
      />
      <ConductionPathway
        points={SEGMENT_POINTS.leftAnterior}
        color={ventColor}
        pulseProgress={ventProgress}
        active={ventActive}
        direction={ventDirection}
        radius={0.019}
      />
      <ConductionPathway
        points={SEGMENT_POINTS.leftPosterior}
        color={ventColor}
        pulseProgress={ventProgress}
        active={ventActive}
        direction={ventDirection}
        radius={0.019}
      />
      <ConductionPathway
        points={SEGMENT_POINTS.septalPurkinje}
        color={septalColor}
        pulseProgress={ventProgress}
        active={ventActive}
        direction={ventDirection}
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
        labelOffset={[0.2, 0.11, 0.02]}
      />
      <NodeMarker
        position={CONDUCTION_POINTS.av}
        label="AV Node"
        color="#a7f3d0"
        labelOffset={[0.18, 0.08, 0.02]}
      />
      <NodeMarker
        position={CONDUCTION_POINTS.his}
        label="Bundle of His"
        color="#f0abfc"
        labelOffset={[0.18, -0.02, 0.02]}
      />

      <gridHelper
        args={[3.4, 12, "#155e75", "#0f172a"]}
        position={[SCENE_TARGET[0], -1.62, SCENE_TARGET[2]]}
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

function EcgRevealGraph({ progress }: { progress: number }) {
  const clipId = useId();
  const wavePath = useMemo(() => buildNsrPath(), []);
  const progressRatio = clamp(progress / 100, 0, 1);
  const clipWidth = GRAPH_PADDING_X + PLOT_WIDTH * progressRatio;
  const currentPoint = ecgPointAt(progressRatio);
  const phase = getEcgPhaseLabel(progress);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-[#08111f]">
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 text-emerald-300">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400/70">
            Lead II
          </div>
          <h2 className="text-sm font-semibold md:text-base">
            NSR 2D waveform
          </h2>
        </div>
        <div className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 font-mono text-xs">
          {phase}
        </div>
      </div>

      <div className="min-h-0 flex-1 px-3 py-4 md:px-5">
        <svg
          aria-label="同期して描画される正常洞調律の心電図波形"
          className="h-full min-h-[220px] w-full"
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

export function VectorVisualizer() {
  const [progress, setProgress] = useState(0);
  const [selectedLead, setSelectedLead] = useState<LeadId>("II");
  const currentPoint = ecgPointAt(progress / 100);

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,0.95fr)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:grid-rows-1">
        <section
          aria-label="刺激伝導マップ"
          className="relative min-h-0 overflow-hidden border-b border-border bg-[#071018] lg:border-r lg:border-b-0"
        >
          <HeartVectorScene progress={progress} selectedLead={selectedLead} />
          <div className="pointer-events-none absolute top-4 left-4 text-cyan-100">
            <div className="text-xs font-semibold uppercase tracking-wider text-cyan-200/70">
              Conduction Map
            </div>
            <h2 className="text-sm font-semibold md:text-base">
              刺激伝導マップ
            </h2>
            <div className="mt-2 inline-flex rounded-md border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 font-mono text-[10px] text-cyan-100">
              View angle: Lead {selectedLead}-like
            </div>
            <p className="mt-3 max-w-[18rem] text-xs leading-relaxed text-cyan-100/72">
              正常洞調律における刺激伝導の概念図です。実際の3D心臓電気ベクトルや12誘導心電図を厳密に再現するものではありません。
            </p>
          </div>
        </section>

        <section aria-label="2D心電図波形" className="flex min-h-0">
          <EcgRevealGraph progress={progress} />
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
              ※ 現段階では12誘導波形ではなく、誘導方向を模した視点切り替えです。
            </p>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold">Conduction progress</h2>
              <p className="font-mono text-xs text-muted-foreground">
                {Math.round(progress)}% / {Math.round(currentPoint.ms)}ms /{" "}
                {currentPoint.mv.toFixed(3)}mV
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted px-3 py-1 font-mono text-xs">
              NSR Lead II
            </div>
          </div>
          <Slider
            min={0}
            max={100}
            step={0.5}
            value={[progress]}
            onValueChange={(value) => setProgress(sliderValue(value))}
            aria-label="刺激伝導マップとLead II波形の同期進行度"
          />
        </div>
      </section>
    </main>
  );
}
