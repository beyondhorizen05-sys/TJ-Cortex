import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BUILDINGS, VILLAGE_COLORS } from '../../brand/villageBrand';
import { BuildingShell } from './Base';

/**
 * Trade Exchange — contracts, bounties, negotiations, payouts. Teal accents,
 * coin glyphs woven into the architecture. Every ledger entry hits this
 * building's beacon with a short pulse.
 */
export function TradeExchange({ lastLedgerAt }: { lastLedgerAt: number | null }) {
  const b = BUILDINGS.find((x) => x.id === 'trade_exchange')!;
  const beacon = useRef<THREE.Mesh>(null);
  const coinRing = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const since = lastLedgerAt ? Date.now() - lastLedgerAt : Infinity;
    const pulse = since < 2000 ? 1 : 0;
    if (beacon.current) {
      const m = beacon.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.4 + pulse * 0.5 + Math.sin(clock.elapsedTime * 2.5) * 0.1;
    }
    if (coinRing.current) {
      coinRing.current.rotation.z = clock.elapsedTime * 0.6;
    }
  });

  return (
    <BuildingShell building={b} height={5.4} roof="flat">
      {/* Coin ring above the doorway */}
      <mesh ref={coinRing} position={[0, 4.2, b.sz * 0.55 / 2 + 0.05]} rotation={[0, 0, 0]}>
        <ringGeometry args={[0.9, 1.1, 40]} />
        <meshBasicMaterial color={VILLAGE_COLORS.tradeTeal} transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 4.2, b.sz * 0.55 / 2 + 0.06]}>
        <ringGeometry args={[0.55, 0.7, 40]} />
        <meshBasicMaterial color={VILLAGE_COLORS.axonAmber} transparent opacity={0.65} side={THREE.DoubleSide} />
      </mesh>
      {/* Central negotiation table */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[2, 2, 0.14, 24]} />
        <meshStandardMaterial color={'#1B1F2E'} roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh ref={beacon} position={[0, 6.3, 0]}>
        <sphereGeometry args={[0.34, 16, 16]} />
        <meshBasicMaterial color={VILLAGE_COLORS.tradeTeal} transparent opacity={0.5} />
      </mesh>
      <pointLight position={[0, 5.4, 0]} color={VILLAGE_COLORS.tradeTeal} intensity={1.2} distance={14} />
    </BuildingShell>
  );
}