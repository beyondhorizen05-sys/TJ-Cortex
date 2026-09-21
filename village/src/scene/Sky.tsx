import { useMemo } from 'react';
import { Sky as DreiSky, Stars } from '@react-three/drei';
import { VILLAGE_COLORS } from '../brand/villageBrand';

/**
 * Day/night. We compute sun position from the store's `dayFraction` and
 * smoothly interpolate the sky and lighting. At dusk the world transitions
 * to `Village Dusk` (#0B0B14 → #1E1B4B) and village lamps fade in.
 */
export function Sky({ dayFraction }: { dayFraction: number }) {
  const sunY = Math.sin((dayFraction - 0.25) * Math.PI * 2);
  const sunX = Math.cos((dayFraction - 0.25) * Math.PI * 2);
  const isNight = dayFraction < 0.22 || dayFraction > 0.78;

  const sunPosition = useMemo(
    () => [sunX * 90, Math.max(-20, sunY * 90), sunY * 40] as [number, number, number],
    [sunX, sunY],
  );

  // Fade directional intensity to zero at night.
  const sunIntensity = Math.max(0, sunY) * 1.4 + 0.05;

  return (
    <>
      <DreiSky
        distance={450000}
        sunPosition={sunPosition}
        inclination={0.6}
        azimuth={0.25}
        turbidity={isNight ? 12 : 6}
        rayleigh={isNight ? 3 : 1}
      />
      {isNight && <Stars radius={220} depth={60} count={1800} factor={5} fade />}
      <ambientLight intensity={isNight ? 0.15 : 0.45} color={VILLAGE_COLORS.synapseCyan} />
      <hemisphereLight
        args={[VILLAGE_COLORS.synapseCyan, VILLAGE_COLORS.ground, isNight ? 0.15 : 0.5]}
      />
      <directionalLight
        position={sunPosition}
        intensity={sunIntensity}
        color={isNight ? VILLAGE_COLORS.dusk : '#FFF3D6'}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
    </>
  );
}