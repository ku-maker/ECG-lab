"use client";

import { Line, OrbitControls, Text } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useId, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { Slider } from "@/components/ui/slider";
import nsrTemplate from "@/src/data/ecg/templates/nsr-lead2.json";

const GRAPH_WIDTH = 900;
const GRAPH_HEIGHT = 360;
const GRAPH_PADDING_X = 36;
const GRAPH_BASELINE_Y = 205;
const GRAPH_MV_SCALE = 128;
const PLOT_WIDTH = GRAPH_WIDTH - GRAPH_PADDING_X * 2;

type VectorPoint = [number, number, number];
type PulseDirection = "forward" | "reverse";

type PulseState = {
  active: boolean;
  value: number;
  color: string;
  direction: PulseDirection;
};

type LeadId =
  | "I"
  | "II"
  | "III"
  | "aVR"
  | "aVL"
  | "aVF"
  | "V1"
  | "V2"
  | "V3"
  | "V4"
  | "V5"
  | "V6";

const LEADS: LeadId[] = [
  "I",
  "II",
  "III",
  "aVR",
  "aVL",
  "aVF",
  "V1",
  "V2",
  "V3",
  "V4",
  "V5",
  "V6",
];

const SCENE_TARGET: VectorPoint = [-0.08, -0.28, 0.02];

const LEAD_CAMERA_POSITIONS: Record<LeadId, VectorPoint> = {
  I: [-3.9, 0.05, 3.9],
  II: [0.05, -4.35, 4.55],
  III: [3.0, -3.45, 3.9],
  aVR: [4.1, 1.05, 3.45],
  aVL: [-4.0, 1.05, 3.45],
  aVF: [0.05, -4.7, 3.85],
  V1: [3.35, -0.02, 4.65],
  V2: [2.35, -0.04, 5.0],
  V3: [1.1, -0.08, 5.22],
  V4: [-0.25, -0.08, 5.22],
  V5: [-2.45, -0.06, 4.55],
  V6: [-4.4, -0.02, 2.85],
};

const CONDUCTION_POINTS = {
  sa: [-0.62, 0.88, -0.28],
  internodal: [-0.42, 0.42, -0.22],
  av: [-0.16, 0.02, -0.14],
  his: [-0.07, -0.2, -0.05],
  rbbMid: [-0.32, -0.66, 0.1],
  rbbEnd: [-0.5, -1.08, 0.24],
  lbbTrunk: [0.06, -0.38, -0.02],
  lafMid: [0.36, -0.74, 0.08],
  lafEnd: [0.62, -1.04, 0.14],
  lpfMid: [0.12, -0.94, -0.2],
  lpfEnd: [0.26, -1.24, -0.22],
  septalApex: [-0.34, -1.22, 0.04],
  purkinjeApex: [-0.76, -1.54, 0.16],
} satisfies Record<string, VectorPoint>;

const CONDUCTION_PATHS = {
  internodalTract: [
    CONDUCTION_POINTS.sa,
    CONDUCTION_POINTS.internodal,
    CONDUCTION_POINTS.av,
  ],
  avHisBundle: [
    CONDUCTION_POINTS.av,
    CONDUCTION_POINTS.his,
  ],
  rightBundleBranch: [
    CONDUCTION_POINTS.his,
    CONDUCTION_POINTS.rbbMid,
    CONDUCTION_POINTS.rbbEnd,
  ],
  leftAnteriorFascicle: [
    CONDUCTION_POINTS.his,
    CONDUCTION_POINTS.lbbTrunk,
    CONDUCTION_POINTS.lafMid,
    CONDUCTION_POINTS.lafEnd,
  ],
  leftPosteriorFascicle: [
    CONDUCTION_POINTS.his,
    CONDUCTION_POINTS.lbbTrunk,
    CONDUCTION_POINTS.lpfMid,
    CONDUCTION_POINTS.lpfEnd,
  ],
  septalPurkinje: [
    CONDUCTION_POINTS.his,
    CONDUCTION_POINTS.lbbTrunk,
    CONDUCTION_POINTS.septalApex,
    CONDUCTION_POINTS.purkinjeApex,
  ],
} satisfies Record<string, VectorPoint[]>;

const ECG_TIMELINE = {
  cycleStart: 0,
  pWaveEnd: 15,
  prSegmentEnd: 30,
  qrsEnd: 45,
  stSegmentEnd: 65,
  tWaveEnd: 90,
  cycleEnd: 100,
} as const;

const CONDUCTION_COLORS = {
  atrial: "#fef08a",
  avDelay: "#a7f3d0",
  ventricular: "#f472b6",
  septal: "#c4b5fd",
  recovery: "#67e8f9",
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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

function easeInOutCubic(value: number): number {
  const t = clamp(value, 0, 1);

  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutCubic(value: number): number {
  const t = clamp(value, 0, 1);

  return 1 - Math.pow(1 - t, 3);
}

function mapTimelineProgress(
  progress: number,
  start: number,
  end: number
): number {
  const p = clamp(progress, 0, 100);

  return clamp(THREE.MathUtils.mapLinear(p, start, end, 0, 1), 0, 1);
}

function createPulseState(
  active: boolean,
  value: number,
  color: string,
  direction: PulseDirection = "forward"
): PulseState {
  return {
    active,
    value: clamp(value, 0, 1),
    color,
    direction,
  };
}

function getConductionTimeline(progress: number) {
  const p = clamp(progress, ECG_TIMELINE.cycleStart, ECG_TIMELINE.cycleEnd);
  const isAtrial =
    p >= ECG_TIMELINE.cycleStart && p < ECG_TIMELINE.pWaveEnd;
  const isAvDelay =
    p >= ECG_TIMELINE.pWaveEnd && p < ECG_TIMELINE.prSegmentEnd;
  const isQrs =
    p >= ECG_TIMELINE.prSegmentEnd && p < ECG_TIMELINE.qrsEnd;
  const isStSegment =
    p >= ECG_TIMELINE.qrsEnd && p < ECG_TIMELINE.stSegmentEnd;
  const isRepolarizing =
    p >= ECG_TIMELINE.stSegmentEnd && p < ECG_TIMELINE.tWaveEnd;

  const atrialValue = easeInOutCubic(
    mapTimelineProgress(
      p,
      ECG_TIMELINE.cycleStart,
      ECG_TIMELINE.pWaveEnd
    )
  );
  const prValue = mapTimelineProgress(
    p,
    ECG_TIMELINE.pWaveEnd,
    ECG_TIMELINE.prSegmentEnd
  );
  const avHisValue =
    prValue < 0.68
      ? easeOutCubic(prValue / 0.68) * 0.18
      : THREE.MathUtils.mapLinear(prValue, 0.68, 1, 0.18, 1);
  const qrsValue = easeOutCubic(
    mapTimelineProgress(p, ECG_TIMELINE.prSegmentEnd, ECG_TIMELINE.qrsEnd)
  );
  const tWaveValue = easeInOutCubic(
    mapTimelineProgress(p, ECG_TIMELINE.stSegmentEnd, ECG_TIMELINE.tWaveEnd)
  );
  const terminalHold = isStSegment;
  const recoveryValue = 1 - tWaveValue;

  return {
    atrial: createPulseState(
      isAtrial,
      atrialValue,
      CONDUCTION_COLORS.atrial
    ),
    avHis: createPulseState(
      isAvDelay,
      avHisValue,
      CONDUCTION_COLORS.avDelay
    ),
    ventricularFast: createPulseState(
      isQrs,
      qrsValue,
      CONDUCTION_COLORS.ventricular
    ),
    septalFast: createPulseState(
      isQrs,
      qrsValue,
      CONDUCTION_COLORS.septal
    ),
    terminalHold: createPulseState(
      terminalHold,
      1,
      CONDUCTION_COLORS.ventricular
    ),
    repolarization: createPulseState(
      isRepolarizing,
      recoveryValue,
      CONDUCTION_COLORS.recovery,
      "reverse"
    ),
    terminalGlowActive: terminalHold || isRepolarizing,
    terminalGlowColor: isRepolarizing
      ? CONDUCTION_COLORS.recovery
      : CONDUCTION_COLORS.ventricular,
    terminalGlowIntensity: terminalHold ? 1 : 0.72,
  };
}

function getEcgPhaseLabel(progress: number): string {
  const p = clamp(progress, ECG_TIMELINE.cycleStart, ECG_TIMELINE.cycleEnd);

  if (p < ECG_TIMELINE.pWaveEnd) return "P wave";
  if (p < ECG_TIMELINE.prSegmentEnd) return "AV delay";
  if (p < ECG_TIMELINE.qrsEnd) return "QRS";
  if (p < ECG_TIMELINE.stSegmentEnd) return "ST segment";
  if (p < ECG_TIMELINE.tWaveEnd) return "T wave";
  return "TP reset";
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
  const targetPosition = useMemo(
    () => new THREE.Vector3(...LEAD_CAMERA_POSITIONS[selectedLead]),
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
  const timeline = getConductionTimeline(progress);
  const ventricularPulse = timeline.repolarization.active
    ? timeline.repolarization
    : timeline.terminalHold.active
      ? timeline.terminalHold
      : timeline.ventricularFast;
  const septalPulse = timeline.repolarization.active
    ? timeline.repolarization
    : timeline.terminalHold.active
      ? timeline.terminalHold
      : timeline.septalFast;

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
        points={CONDUCTION_PATHS.internodalTract}
        color={timeline.atrial.color}
        pulseProgress={timeline.atrial.value}
        active={timeline.atrial.active}
        direction={timeline.atrial.direction}
        radius={0.016}
      />
      <ConductionPathway
        points={CONDUCTION_PATHS.avHisBundle}
        color={timeline.avHis.color}
        pulseProgress={timeline.avHis.value}
        active={timeline.avHis.active}
        direction={timeline.avHis.direction}
        radius={0.018}
      />
      <ConductionPathway
        points={CONDUCTION_PATHS.rightBundleBranch}
        color={ventricularPulse.color}
        pulseProgress={ventricularPulse.value}
        active={ventricularPulse.active}
        direction={ventricularPulse.direction}
        radius={0.018}
      />
      <ConductionPathway
        points={CONDUCTION_PATHS.leftAnteriorFascicle}
        color={ventricularPulse.color}
        pulseProgress={ventricularPulse.value}
        active={ventricularPulse.active}
        direction={ventricularPulse.direction}
        radius={0.019}
      />
      <ConductionPathway
        points={CONDUCTION_PATHS.leftPosteriorFascicle}
        color={ventricularPulse.color}
        pulseProgress={ventricularPulse.value}
        active={ventricularPulse.active}
        direction={ventricularPulse.direction}
        radius={0.019}
      />
      <ConductionPathway
        points={CONDUCTION_PATHS.septalPurkinje}
        color={septalPulse.color}
        pulseProgress={septalPulse.value}
        active={septalPulse.active}
        direction={septalPulse.direction}
        radius={0.015}
      />
      <TerminalGlow
        active={timeline.terminalGlowActive}
        color={timeline.terminalGlowColor}
        intensity={timeline.terminalGlowIntensity}
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
          aria-label="3Dベクトル心電図"
          className="relative min-h-0 overflow-hidden border-b border-border bg-[#071018] lg:border-r lg:border-b-0"
        >
          <HeartVectorScene progress={progress} selectedLead={selectedLead} />
          <div className="pointer-events-none absolute top-4 left-4 text-cyan-100">
            <div className="text-xs font-semibold uppercase tracking-wider text-cyan-200/70">
              Conduction system
            </div>
            <h2 className="text-sm font-semibold md:text-base">
              SA node to bundle branches
            </h2>
            <div className="mt-2 inline-flex rounded-md border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 font-mono text-[10px] text-cyan-100">
              Camera Lead {selectedLead}
            </div>
          </div>
        </section>

        <section aria-label="2D心電図波形" className="flex min-h-0">
          <EcgRevealGraph progress={progress} />
        </section>
      </div>

      <section
        aria-label="ベクトル同期スライダー"
        className="shrink-0 border-t border-border bg-card px-4 py-4 md:px-6"
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">12 Lead camera</h2>
              <span className="font-mono text-xs text-muted-foreground">
                {selectedLead}
              </span>
            </div>
            <div
              className="grid grid-cols-6 gap-1.5 sm:grid-cols-12"
              role="group"
              aria-label="12誘導カメラ"
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
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold">Vector progress</h2>
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
            aria-label="心臓ベクトルと心電図波形の同期進行度"
          />
        </div>
      </section>
    </main>
  );
}
