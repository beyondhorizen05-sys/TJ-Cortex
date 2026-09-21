import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Weather } from '../state/villageStore';
import { VILLAGE_COLORS } from '../brand/villageBrand';

/**
 * Weather overlay. Rain is a GPU-instanced particle cloud; fog is a
 * THREE.FogExp2 that slowly breathes in and out. Clear removes both.
 */
export function Weather({ weather }: { weather: Weather }) {
  const fogRef = useRef<THREE.FogExp2 | null>(null);
  const density = weather === 'fog' ? 0.035 : weather === 'rain' ? 0.012 : 0.0;

  useFrame(({ scene }) => {
    if (!fogRef.current) {
      fogRef.current = new THREE.FogExp2(VILLAGE_COLORS.fog, 0.0);
      scene.fog = fogRef.current;
    }
    // Ease toward target density.
    fogRef.current.density += (density - fogRef.current.density) * 0.05;
  });

  return weather === 'rain' ? <Rain /> : null;
}

function Rain() {
  const points = useRef<THREE.Points>(null);
  const count = 2400;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 160;
      arr[i * 3 + 1] = Math.random() * 40 + 4;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 160;
    }
    return arr;
  }, []);

  useFrame((_, dt) => {
    if (!points.current) return;
    const pos = points.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] -= dt * 22;
      if (arr[i * 3 + 1] < 0.5) {
        arr[i * 3 + 1] = 40 + Math.random() * 8;
        arr[i * 3] = (Math.random() - 0.5) * 160;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 160;
      }
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={points} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={VILLAGE_COLORS.synapseCyan}
        size={0.12}
        transparent
        opacity={0.6}
        depthWrite={false}
      />
    </points>
  );
}