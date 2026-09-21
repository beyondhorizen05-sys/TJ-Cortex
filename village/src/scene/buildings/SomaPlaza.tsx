import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { BUILDINGS, VILLAGE_COLORS } from '../../brand/villageBrand';

/**
 * Soma Plaza — the open gathering place at the center of the village.
 * A monolith of light with a notice board. Any broadcast (announcements,
 * permission pending, night shift) lands here first.
 */
export function SomaPlaza({ notice }: { notice?: string }) {
  const b = BUILDINGS.find((x) => x.id === 'soma_plaza')!;
  const beacon = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (beacon.current) {
      const m = beacon.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.55 + Math.sin(clock.elapsedTime * 1.2) * 0.25;
      beacon.current.rotation.y = clock.elapsedTime * 0.15;
    }
  });

  return (
    <group position={[b.cx, 0, b.cz]}>
      {/* Central monolith */}
      <mesh castShadow position={[0, 4, 0]}>
        <boxGeometry args={[1.2, 8, 1.2]} />
        <meshStandardMaterial color={'#141828'} roughness={0.4} metalness={0.4} />
      </mesh>
      {/* Beacon */}
      <mesh ref={beacon} position={[0, 8.2, 0]} rotation={[0, 0, Math.PI / 4]}>
        <octahedronGeometry args={[0.9, 0]} />
        <meshBasicMaterial color={VILLAGE_COLORS.synapseCyan} transparent opacity={0.7} />
      </mesh>
      <pointLight position={[0, 8, 0]} color={VILLAGE_COLORS.synapseCyan} intensity={1.4} distance={18} />

      {/* Notice board */}
      <group position={[0, 0, 5]}>
        <mesh position={[0, 1.4, 0]}>
          <boxGeometry args={[3, 2.2, 0.2]} />
          <meshStandardMaterial color={'#1B1F2E'} roughness={0.7} />
        </mesh>
        {notice && (
          <Html position={[0, 3, 0]} center distanceFactor={22}>
            <div
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 13,
                color: '#22D3EE',
                background: 'rgba(11,11,20,0.85)',
                border: '1px solid rgba(34,211,238,0.5)',
                padding: '6px 10px',
                borderRadius: 8,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                userSelect: 'none',
                boxShadow: '0 0 24px rgba(34,211,238,0.4)',
              }}
            >
              {notice}
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}