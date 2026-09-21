import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BUILDINGS, VILLAGE_COLORS } from '../../brand/villageBrand';
import { BuildingShell } from './Base';

/**
 * Myelin Bank — wallets, escrow, ledger, payouts. Teal and synapse-cyan trim,
 * with a rotating vault ring on the roof.
 */
export function MyelinBank({ totalBalanceCC }: { totalBalanceCC: number }) {
  const b = BUILDINGS.find((x) => x.id === 'myelin_bank')!;
  const vaultRing = useRef<THREE.Mesh>(null);
  const vaultRing2 = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (vaultRing.current) vaultRing.current.rotation.y = clock.elapsedTime * 0.4;
    if (vaultRing2.current) vaultRing2.current.rotation.x = clock.elapsedTime * -0.3;
  });

  return (
    <BuildingShell building={b} height={5.6} roof="flat">
      {/* Vault ring stack */}
      <mesh ref={vaultRing} position={[0, 6.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.4, 0.12, 12, 40]} />
        <meshBasicMaterial color={VILLAGE_COLORS.tradeTeal} transparent opacity={0.75} />
      </mesh>
      <mesh ref={vaultRing2} position={[0, 6.1, 0]}>
        <torusGeometry args={[1.0, 0.1, 12, 40]} />
        <meshBasicMaterial color={VILLAGE_COLORS.synapseCyan} transparent opacity={0.75} />
      </mesh>
      <mesh position={[0, 5.7, b.sz * 0.55 / 2 + 0.02]}>
        <planeGeometry args={[2.2, 1.2]} />
        <meshBasicMaterial color={VILLAGE_COLORS.tradeTeal} transparent opacity={0.5} />
      </mesh>
      <pointLight position={[0, 6, 0]} color={VILLAGE_COLORS.tradeTeal} intensity={1.4} distance={16} />
    </BuildingShell>
  );
}