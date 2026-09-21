import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BUILDINGS, VILLAGE_COLORS } from '../../brand/villageBrand';
import { BuildingShell } from './Base';

/**
 * Dendrite Diner — idle socializing. Round pavilion with a warm green glow,
 * string lights, and outdoor tables. Idle agents drift between tables.
 */
export function DendriteDiner({ hasIdle }: { hasIdle: boolean }) {
  const b = BUILDINGS.find((x) => x.id === 'dendrite_diner')!;
  const stringLights = useRef<THREE.Points>(null);

  useFrame(({ clock }) => {
    if (stringLights.current) {
      const m = stringLights.current.material as THREE.PointsMaterial;
      m.opacity = hasIdle ? 0.85 : 0.5;
      stringLights.current.rotation.y = clock.elapsedTime * 0.08;
    }
  });

  const lights = new Float32Array(40 * 3);
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    lights[i * 3] = Math.cos(a) * 4;
    lights[i * 3 + 1] = 4.2 + Math.sin(i * 1.7) * 0.15;
    lights[i * 3 + 2] = Math.sin(a) * 4;
  }

  return (
    <BuildingShell building={b} height={4.2} roof="flat">
      {/* Central pavilion */}
      <mesh position={[0, 2.6, 0]} castShadow>
        <cylinderGeometry args={[3, 3, 0.15, 32]} />
        <meshStandardMaterial color={'#1B1F2E'} roughness={0.6} />
      </mesh>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * 2.5, 1.4, sz * 2.5]}>
            <cylinderGeometry args={[0.08, 0.08, 2.8, 8]} />
            <meshStandardMaterial color={'#1B1F2E'} />
          </mesh>
        )),
      )}
      {/* String lights */}
      <points ref={stringLights}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[lights, 3]} />
        </bufferGeometry>
        <pointsMaterial color={VILLAGE_COLORS.dendriteGreen} size={0.16} transparent opacity={0.6} depthWrite={false} />
      </points>
      {/* Outdoor tables */}
      {[-3, 3].map((x) =>
        [-2, 2].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.6, z]} castShadow>
            <cylinderGeometry args={[0.7, 0.7, 0.1, 12]} />
            <meshStandardMaterial color={'#141828'} roughness={0.7} />
          </mesh>
        )),
      )}
    </BuildingShell>
  );
}