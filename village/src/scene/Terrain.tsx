import { useMemo } from 'react';
import * as THREE from 'three';
import { VILLAGE_COLORS } from '../brand/villageBrand';

/**
 * The ground plane and pathways. Everything is procedural so first launch
 * requires zero downloads. The neural grid on the ground is the same pattern
 * used behind the UI, tying 2D and 3D together.
 */
export function Terrain() {
  const gridTexture = useMemo(() => {
    const size = 512;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = VILLAGE_COLORS.ground;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(34,211,238,0.10)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 16; i++) {
      const p = (i / 16) * size;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
    }
    // Cross-highlight at cell centers
    ctx.fillStyle = 'rgba(108,76,241,0.08)';
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 16; j++) {
        ctx.fillRect((i / 16) * size + 4, (j / 16) * size + 4, 2, 2);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(12, 12);
    tex.anisotropy = 4;
    return tex;
  }, []);

  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[400, 400, 1, 1]} />
        <meshStandardMaterial map={gridTexture} color={'#ffffff'} roughness={1} metalness={0} />
      </mesh>
      {/* Circular plaza tint under the Soma Plaza */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[7.5, 8.5, 64]} />
        <meshBasicMaterial color={VILLAGE_COLORS.synapseCyan} transparent opacity={0.35} />
      </mesh>
      {/* Cross paths */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.011, 0]}>
        <planeGeometry args={[3, 96]} />
        <meshBasicMaterial color={VILLAGE_COLORS.path} transparent opacity={0.75} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.011, 0]}>
        <planeGeometry args={[96, 3]} />
        <meshBasicMaterial color={VILLAGE_COLORS.path} transparent opacity={0.75} />
      </mesh>
    </group>
  );
}