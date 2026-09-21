import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BUILDINGS, VILLAGE_COLORS } from '../../brand/villageBrand';
import { BuildingShell } from './Base';

/**
 * Axon Desk — focused work. Slim tower with amber trim, a few desks visible
 * through the glass, and a live "focus" pulse per active desk.
 */
export function AxonDesk({ active }: { active: number }) {
  const b = BUILDINGS.find((x) => x.id === 'axon_desk')!;
  const glow = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (glow.current) {
      const m = glow.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.3 + Math.min(1, active) * 0.3 + Math.sin(clock.elapsedTime * 4) * 0.06;
    }
  });

  return (
    <BuildingShell building={b} height={6.2} roof="flat">
      <mesh ref={glow} position={[0, 6.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.4, 2.8, 48]} />
        <meshBasicMaterial color={VILLAGE_COLORS.axonAmber} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
      {/* Interior desks */}
      {[-1.4, 1.4].map((x) =>
        [-1, 1].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 1, z * 1.4]} castShadow>
            <boxGeometry args={[1.6, 0.1, 0.8]} />
            <meshStandardMaterial color={'#1B1F2E'} />
          </mesh>
        )),
      )}
    </BuildingShell>
  );
}