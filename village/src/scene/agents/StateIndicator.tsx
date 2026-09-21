import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function StateIndicator({ color, state }: { color: string; state: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const spin = state === 'working' || state === 'earning';

  useFrame(({ clock }) => {
    if (!ref.current) return;
    if (spin) ref.current.rotation.y = clock.elapsedTime * 1.6;
    const m = ref.current.material as THREE.MeshBasicMaterial;
    m.opacity = 0.55 + Math.sin(clock.elapsedTime * 3) * 0.25;
  });

  return (
    <mesh ref={ref} position={[0, 2.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.22, 0.34, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.7} side={THREE.DoubleSide} />
    </mesh>
  );
}