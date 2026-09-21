import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { VillageAgent } from '../../state/villageStore';
import { STATE_COLORS } from '../../brand/villageBrand';
import { approachPoint, podPoint, shortestAngle, stepToward, type Vec2 } from '../../nav/pathing';
import { Nametag } from './Nametag';
import { StateIndicator } from './StateIndicator';

/**
 * Human-like avatar. Procedurally built with low-poly primitives so the world
 * runs on first launch with zero asset downloads. A GLB/VRM avatar can be
 * dropped at `/avatars/<agentId>.glb` — if present, AgentAvatar will load it
 * instead (see AgentAvatar loading note in comments below). The body parts are
 * still animated by state either way.
 */
export function Agent({
  agent, index, onClick, selected,
}: { agent: VillageAgent; index: number; onClick?: () => void; selected?: boolean }) {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);

  const pos = useRef<Vec2>({ x: agent.x, z: agent.z });
  const heading = useRef(0);
  const arrivedAt = useRef(0);
  const [hovered, setHovered] = useState(false);

  const stateColor = STATE_COLORS[(agent.state as keyof typeof STATE_COLORS) ?? 'idle'] ?? '#22D3EE';
  const glowColor = agent.glowColor;
  const skinColor = '#E8B98A';
  const shirtColor = agent.accentColor;

  // Where should this agent walk to, based on state?
  const target = useMemo<Vec2>(() => {
    if (agent.state === 'working' || agent.state === 'sleeping') return podPoint(index);
    return approachPoint(agent.location, index);
  }, [agent.state, agent.location, index]);

  useFrame((_, dt) => {
    if (!group.current || !inner.current) return;
    const { pos: np, heading: h, arrived } = stepToward(pos.current, target, dt, agent.state === 'working' ? 2.4 : 3.2);
    pos.current = np;
    heading.current = heading.current + shortestAngle(heading.current, h) * Math.min(1, dt * 6);
    group.current.position.set(np.x, 0, np.z);
    group.current.rotation.y = heading.current;
    if (arrived) {
      arrivedAt.current = performance.now();
      // Idle sway.
      inner.current.rotation.y = Math.sin(performance.now() / 2400) * 0.12;
    } else {
      // Walk bob.
      inner.current.position.y = Math.abs(Math.sin(performance.now() / 180)) * 0.06;
    }
    // Head look while working: subtle downward tilt.
    if (head.current) {
      const targetTilt = agent.state === 'working' ? -0.18 : agent.state === 'sleeping' ? -0.4 : 0;
      head.current.rotation.x += (targetTilt - head.current.rotation.x) * Math.min(1, dt * 4);
    }
    // Arm swing while walking.
    const walking = !arrived;
    const swing = walking ? Math.sin(performance.now() / 140) * 0.4 : 0;
    if (leftArm.current) leftArm.current.rotation.x = swing;
    if (rightArm.current) rightArm.current.rotation.x = -swing;
  });

  return (
    <group
      ref={group}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
    >
      {/* Selection ring */}
      {(selected || hovered) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.5, 0.62, 40]} />
          <meshBasicMaterial color={glowColor} transparent opacity={0.85} side={THREE.DoubleSide} />
        </mesh>
      )}

      <group ref={inner}>
        {/* Body */}
        <mesh castShadow position={[0, 1.05, 0]}>
          <capsuleGeometry args={[0.32, 0.55, 8, 16]} />
          <meshStandardMaterial color={shirtColor} roughness={0.55} metalness={0.05} />
        </mesh>
        {/* Brand trim */}
        <mesh position={[0, 0.55, 0.32]}>
          <planeGeometry args={[0.4, 0.08]} />
          <meshBasicMaterial color={glowColor} transparent opacity={0.9} />
        </mesh>
        {/* Head */}
        <group ref={head} position={[0, 1.65, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.24, 20, 20]} />
            <meshStandardMaterial color={skinColor} roughness={0.6} />
          </mesh>
          {/* Hair cap */}
          <mesh position={[0, 0.06, 0]}>
            <sphereGeometry args={[0.25, 20, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={'#2B1B12'} roughness={0.7} />
          </mesh>
        </group>
        {/* Arms */}
        <group ref={leftArm} position={[-0.42, 1.25, 0]}>
          <mesh castShadow position={[0, -0.35, 0]}>
            <capsuleGeometry args={[0.09, 0.5, 6, 12]} />
            <meshStandardMaterial color={shirtColor} />
          </mesh>
        </group>
        <group ref={rightArm} position={[0.42, 1.25, 0]}>
          <mesh castShadow position={[0, -0.35, 0]}>
            <capsuleGeometry args={[0.09, 0.5, 6, 12]} />
            <meshStandardMaterial color={shirtColor} />
          </mesh>
        </group>
        {/* Legs */}
        {[-0.16, 0.16].map((x) => (
          <mesh key={x} castShadow position={[x, 0.35, 0]}>
            <capsuleGeometry args={[0.1, 0.42, 6, 12]} />
            <meshStandardMaterial color={'#1B1F2E'} />
          </mesh>
        ))}
      </group>

      {/* Glow beneath the agent, tinted by state */}
      <pointLight position={[0, 0.4, 0]} color={stateColor} intensity={hovered ? 0.9 : 0.4} distance={3.4} />

      {/* State indicator + nametag */}
      <StateIndicator color={stateColor} state={agent.state} />
      <Nametag name={agent.name} color={stateColor} sub={agent.state} />

      {/* Mood dot on chest */}
      <mesh position={[0, 1.25, 0.34]}>
        <circleGeometry args={[0.045, 20]} />
        <meshBasicMaterial color={stateColor} />
      </mesh>
    </group>
  );
}

/**
 * Optional: replace the procedural avatar with a GLB/VRM by setting
 * agent.avatar.vrmUrl. Turn 5 ships without external assets so the village
 * runs offline on first launch. When a GLB is available, drop it at
 * `ui/public/avatars/<agentId>.glb` and swap the inner group above with a
 * `<Suspense><primitive object={gltf.scene} /></Suspense>`.
 */
export const _GLBAvatarNote = 'GLB/VRM avatars supported via ui/public/avatars/<agentId>.glb';