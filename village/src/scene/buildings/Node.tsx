import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BUILDINGS, RESIDENTIAL_PODS, VILLAGE_COLORS } from '../../brand/villageBrand';
import { BuildingShell, Window } from './Base';

/**
 * Node — the agent's private home. One central tower plus a residential ring
 * of small pods. The ring pulses gently when any agent is "working" here.
 */
export function NodeBuilding({ working }: { working: boolean }) {
  const building = BUILDINGS.find((b) => b.id === 'node')!;
  const ring = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ring.current) {
      const m = ring.current.material as THREE.MeshBasicMaterial;
      m.opacity = working ? 0.35 + Math.sin(clock.elapsedTime * 3) * 0.25 : 0.15;
    }
  });

  return (
    <>
      <BuildingShell building={building} height={5} roof="gable">
        <Window x={-1.4} y={2.4} z={2.4} color={VILLAGE_COLORS.axonAmber} />
        <Window x={1.4} y={2.4} z={2.4} color={VILLAGE_COLORS.axonAmber} />
        <Window x={0} y={4} z={2.4} color={VILLAGE_COLORS.synapseCyan} />
        <mesh ref={ring} position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.2, 3.5, 64]} />
          <meshBasicMaterial color={VILLAGE_COLORS.axonAmber} transparent opacity={0.2} side={THREE.DoubleSide} />
        </mesh>
      </BuildingShell>

      {/* Residential pods fanning out behind the Node */}
      {Array.from({ length: RESIDENTIAL_PODS }).map((_, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const x = -9 + col * 6;
        const z = -32 - row * 6;
        return (
          <group key={i} position={[x, 0, z]}>
            <mesh castShadow receiveShadow position={[0, 1.1, 0]}>
              <boxGeometry args={[3, 2.2, 3]} />
              <meshStandardMaterial color={'#141828'} roughness={0.8} />
            </mesh>
            <mesh castShadow position={[0, 2.6, 0]} rotation={[0, Math.PI / 4, 0]}>
              <coneGeometry args={[2.4, 1.2, 4]} />
              <meshStandardMaterial color={'#1B1F2E'} roughness={0.85} />
            </mesh>
            <mesh position={[0, 1.4, 1.51]}>
              <planeGeometry args={[0.7, 0.9]} />
              <meshBasicMaterial color={VILLAGE_COLORS.synapseCyan} transparent opacity={0.7} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}