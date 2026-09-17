"use client";

import { Html } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

type Point = [number, number, number];

export function AnatomyLabel({ position, children, color = "#b7cadb" }: {
  position: Point; children: React.ReactNode; color?: string;
}) {
  return <Html position={position} center style={{ pointerEvents: "none", whiteSpace: "nowrap" }} zIndexRange={[10, 0]}>
    <span className="rounded border border-white/10 bg-slate-950/80 px-2 py-1 text-[11px] shadow-sm" style={{ color }}>{children}</span>
  </Html>;
}

/** Four chambers, deliberately schematic: transparent walls keep conduction pathways visible. */
export function AnatomicalHeart({
  atrialGlow,
  ventricularGlow,
  rightVentricularGlow = ventricularGlow,
  leftVentricularGlow = ventricularGlow,
  recovery,
  showLabels,
  visible,
}: {
  atrialGlow: number;
  ventricularGlow: number;
  rightVentricularGlow?: number;
  leftVentricularGlow?: number;
  recovery: boolean;
  showLabels: boolean;
  visible: boolean;
}) {
  const profile = useMemo(() => new THREE.SplineCurve([
    [0.015, -1], [0.18, -0.88], [0.42, -0.62], [0.65, -0.28],
    [0.77, 0.1], [0.75, 0.42], [0.58, 0.73], [0.28, 0.93], [0.01, 1],
  ].map(([radius, y]) => new THREE.Vector2(radius, y))).getPoints(64), []);
  const ventColor = recovery ? "#67e8f9" : "#fb7185";
  return <group visible={visible}>
    {([
      { position: [-0.56, 0.48, -0.18], scale: [0.58, 0.63, 0.48], color: "#438dae" },
      { position: [0.44, 0.42, -0.25], scale: [0.57, 0.56, 0.44], color: "#87628d" },
    ] as { position: Point; scale: Point; color: string }[]).map((chamber, index) =>
      <mesh key={index} position={chamber.position} scale={chamber.scale}>
        <sphereGeometry args={[1, 40, 32]} />
        <meshPhysicalMaterial color={chamber.color} transparent opacity={0.2 + atrialGlow * 0.12}
          emissive="#fbbf24" emissiveIntensity={atrialGlow * 0.65} roughness={0.4} metalness={0.08} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    )}
    {([
      { position: [-0.48, -0.65, 0.08], scale: [0.93, 1.04, 0.76], rotation: [0, 0, -0.12], color: "#356784", glow: rightVentricularGlow },
      { position: [0.39, -0.79, -0.06], scale: [0.97, 1.2, 0.85], rotation: [0, 0, 0.18], color: "#82455f", glow: leftVentricularGlow },
    ] as { position: Point; scale: Point; rotation: Point; color: string; glow: number }[]).map((chamber, index) =>
      <mesh key={index} position={chamber.position} scale={chamber.scale} rotation={chamber.rotation}>
        <latheGeometry args={[profile, 56]} />
        <meshPhysicalMaterial color={chamber.color} transparent opacity={0.16 + chamber.glow * 0.06}
          emissive={ventColor} emissiveIntensity={chamber.glow * 0.28} roughness={0.3} metalness={0.12} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    )}
    {/* Simplified superior vena cava marks the superior right atrial region. */}
    <mesh position={[-0.64, 1.1, -0.2]}>
      <cylinderGeometry args={[0.14, 0.18, 0.62, 28, 1, true]} />
      <meshStandardMaterial color="#5ba7bb" transparent opacity={0.22} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    {showLabels ? <>
      <AnatomyLabel position={[-1.1, 0.6, 0.1]}>右心房</AnatomyLabel>
      <AnatomyLabel position={[1.03, 0.55, 0.1]}>左心房</AnatomyLabel>
      <AnatomyLabel position={[-1.40, -0.9, 0.2]}>右心室</AnatomyLabel>
      <AnatomyLabel position={[1.36, -1.0, 0.2]}>左心室</AnatomyLabel>
    </> : null}
  </group>;
}
