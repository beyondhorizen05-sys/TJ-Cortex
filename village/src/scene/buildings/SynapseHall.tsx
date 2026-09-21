import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BUILDINGS, VILLAGE_COLORS } from '../../brand/villageBrand';
import { BuildingShell } from './Base';

/**
 * Synapse Hall — meetings, voting, decisions. Long hall with tall glass front,
 * myelin-blue accents. Pulses when a meeting is in session.
 */
export function SynapseHall({ inSession }: { inSession: boolean }) {
  const b = BUILDINGS.find((x) => x.id === 'synapse_hall')!;
  const glass = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (glass.current) {
      const m = glass.current.material as THREE.MeshBasicMaterial;
      m.opacity = inSession ? 0.55 + Math.sin(clock.elapsedTime * 2) * 0.2 : 0.35;
    }
  });

  return (
    <BuildingShell building={b} height={5.5} roof="flat">
      {/* Glass front */}
      <mesh ref={glass} position={[0, 2.9, b.sz * 0.55 / 2 + 0.01]}>
        <planeGeometry args={[b.sx * 0.55 - 0.4, 3.6]} />
        <meshBasicMaterial color={VILLAGE_COLORS.myelinBlue} transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
      {/* Columns */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (b.sx * 0.55 / 2 - 0.4), 1.8, b.sz * 0.55 / 2 + 0.4]} castShadow>
          <cylinderGeometry args={[0.18, 0.22, 3.6, 8]} />
          <meshStandardMaterial color={'#1B1F2E'} roughness={0.6} />
        </mesh>
      ))}
      {/* Interior table */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[2.2, 2.2, 0.14, 24]} />
        <meshStandardMaterial color={'#1B1F2E'} roughness={0.6} metalness={0.3} />
      </mesh>
    </BuildingShell>
  );
}