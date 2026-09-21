import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BUILDINGS, VILLAGE_COLORS } from '../../brand/villageBrand';
import { BuildingShell } from './Base';

/**
 * OUTBOX — the deliverables vault. A small vault building with an amber
 * dossier glyph on the front. When a new deliverable lands, a beacon fires.
 */
export function OutboxVault({ lastDeliveryAt }: { lastDeliveryAt: number | null }) {
  const b = BUILDINGS.find((x) => x.id === 'outbox')!;
  const beacon = useRef<THREE.Mesh>(null);
  const [flash, setFlash] = [lastDeliveryAt && Date.now() - lastDeliveryAt < 4000, null] as const;

  useFrame(({ clock }) => {
    if (!beacon.current) return;
    const m = beacon.current.material as THREE.MeshBasicMaterial;
    const base = flash ? 0.8 : 0.35;
    m.opacity = base + Math.sin(clock.elapsedTime * 3.5) * 0.15;
  });

  return (
    <BuildingShell building={b} height={4} roof="gable">
      <mesh position={[0, 2.4, b.sz * 0.55 / 2 + 0.02]}>
        <planeGeometry args={[1.6, 1.1]} />
        <meshBasicMaterial color={VILLAGE_COLORS.axonAmber} transparent opacity={0.7} />
      </mesh>
      <mesh ref={beacon} position={[0, 5.2, 0]}>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshBasicMaterial color={VILLAGE_COLORS.axonAmber} transparent opacity={0.4} />
      </mesh>
    </BuildingShell>
  );
}