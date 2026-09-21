import { useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Building } from '@tj-cortex/shared';
import { VILLAGE_COLORS } from '../../brand/villageBrand';

/**
 * Shared building shell: low-poly, warm, with a glowing neural trim in the
 * building's accent color. Name tag is a Drei `Html` billboard so it renders
 * crisply with Space Grotesk regardless of zoom.
 */
export function BuildingShell({
  building, children, height = 4, roof = 'flat', onClick,
}: {
  building: Building;
  children?: ReactNode;
  height?: number;
  roof?: 'flat' | 'gable';
  onClick?: () => void;
}) {
  const trim = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (trim.current) {
      const m = trim.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.45 + Math.sin(clock.elapsedTime * 1.6) * 0.2 + (hovered ? 0.25 : 0);
    }
  });

  const color = building.accentColor;
  const w = building.sx * 0.55;
  const d = building.sz * 0.55;

  return (
    <group position={[building.cx, 0, building.cz]}>
      {/* Base slab */}
      <mesh
        receiveShadow
        position={[0, 0.06, 0]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={onClick}
      >
        <boxGeometry args={[building.sx, 0.12, building.sz]} />
        <meshStandardMaterial color={'#0E1018'} roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Body */}
      <mesh castShadow receiveShadow position={[0, height / 2 + 0.12, 0]}>
        <boxGeometry args={[w, height, d]} />
        <meshStandardMaterial color={'#141828'} roughness={0.75} metalness={0.15} />
      </mesh>

      {/* Roof */}
      {roof === 'gable' ? (
        <mesh castShadow position={[0, height + 0.12 + 0.6, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[Math.max(w, d) * 0.8, 1.6, 4]} />
          <meshStandardMaterial color={'#1B1F2E'} roughness={0.8} />
        </mesh>
      ) : (
        <mesh castShadow position={[0, height + 0.2, 0]}>
          <boxGeometry args={[w + 0.4, 0.3, d + 0.4]} />
          <meshStandardMaterial color={'#1B1F2E'} roughness={0.8} />
        </mesh>
      )}

      {/* Neural trim ring */}
      <mesh ref={trim} position={[0, height + 0.42, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.max(w, d) * 0.58, Math.max(w, d) * 0.66, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>

      {/* Brand name */}
      <Html position={[0, height + 1.4, 0]} center distanceFactor={26} occlude={false}>
        <div
          style={{
            fontFamily: "'Space Grotesk', Inter, sans-serif",
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#F8FAFC',
            textShadow: `0 0 12px ${color}`,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {building.brandName}
        </div>
      </Html>

      {/* Contents (interior details, props, etc.) */}
      <group>{children}</group>

      {/* Subtle point light matching the accent */}
      <pointLight color={color} intensity={hovered ? 1.4 : 0.6} distance={12} position={[0, height, 0]} />
    </group>
  );
}

export function Window({ x, y, z, color = VILLAGE_COLORS.axonAmber }: { x: number; y: number; z: number; color?: string }) {
  return (
    <mesh position={[x, y, z]}>
      <planeGeometry args={[0.6, 0.9]} />
      <meshBasicMaterial color={color} transparent opacity={0.85} />
    </mesh>
  );
}