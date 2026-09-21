import { BUILDINGS, VILLAGE_COLORS } from '../../brand/villageBrand';
import { BuildingShell } from './Base';

/**
 * Guild Hall — guilds, rankings, certifications. Violet accented, with banner
 * poles at the corners.
 */
export function GuildHall({ guildCount }: { guildCount: number }) {
  const b = BUILDINGS.find((x) => x.id === 'guild_hall')!;

  return (
    <BuildingShell building={b} height={5} roof="gable">
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * (b.sx * 0.25), 2.6, sz * (b.sz * 0.25)]}>
            <cylinderGeometry args={[0.08, 0.08, 5.2, 8]} />
            <meshStandardMaterial color={'#1B1F2E'} />
          </mesh>
        )),
      )}
      {Array.from({ length: Math.min(guildCount, 4) }).map((_, i) => (
        <mesh key={i} position={[-2 + i * 1.3, 2.4, b.sz * 0.55 / 2 + 0.05]}>
          <planeGeometry args={[0.9, 1.6]} />
          <meshBasicMaterial color={VILLAGE_COLORS.cortexViolet} transparent opacity={0.7} />
        </mesh>
      ))}
    </BuildingShell>
  );
}