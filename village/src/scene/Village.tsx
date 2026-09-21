import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { Sky } from './Sky';
import { Weather } from './Weather';
import { Terrain } from './Terrain';
import { SomaPlaza } from './buildings/SomaPlaza';
import { SynapseHall } from './buildings/SynapseHall';
import { DendriteDiner } from './buildings/DendriteDiner';
import { NodeBuilding } from './buildings/Node';
import { AxonDesk } from './buildings/AxonDesk';
import { OutboxVault } from './buildings/Outbox';
import { TradeExchange } from './buildings/TradeExchange';
import { GuildHall } from './buildings/GuildHall';
import { MyelinBank } from './buildings/MyelinBank';
import { Agent } from './agents/Agent';
import { useVillage } from '../state/villageStore';
import { useVillageEconomy } from '../state/economyStore';

/**
 * The Cortex Village — a scene whose geometry and agent positions mirror
 * runtime state from the sidecar. Working → Node. Idle → Dendrite Diner.
 * Meeting → Synapse Hall. Trading → Trade Exchange.
 */
export function Village({ canvasHeight = 640 }: { canvasHeight?: number }) {
  const agents = useVillage((s) => s.agents);
  const time = useVillage((s) => s.time);
  const weather = useVillage((s) => s.weather);
  const selectedId = useVillage((s) => s.selectedAgentId);
  const select = useVillage((s) => s.select);
  const econ = useVillageEconomy();

  useEffect(() => {
    const off = econ.bind();
    return off;
  }, [econ.bind]);

  // Camera follow hint for selected agent.
  useEffect(() => {
    /* Reserved for a follow-cam in a later turn; OrbitControls is default. */
  }, [selectedId]);

  const anyWorking = agents.some((a) => a.state === 'working' || a.state === 'sleeping');
  const anyIdle = agents.some((a) => a.state === 'idle');
  const anyMeeting = agents.some((a) => a.state === 'meeting');
  const anyTrading = agents.some((a) => a.state === 'trading' || a.state === 'earning');

  // Derive a light "notice" for the plaza.
  const notice =
    anyMeeting ? 'Synapse Hall is in session.' :
    anyTrading ? 'Two agents are negotiating in the Trade Exchange.' :
    undefined;

  return (
    <div style={{ width: '100%', height: canvasHeight, position: 'relative' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [22, 20, 32], fov: 42 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        style={{ background: '#0B0B14' }}
      >
        <Sky dayFraction={time.dayFraction} />
        <Weather weather={weather} />
        <Environment preset={time.isNight ? 'night' : 'city'} background={false} />
        <ContactShadows position={[0, 0.02, 0]} scale={80} blur={2.4} opacity={0.5} />

        <Terrain />

        <SomaPlaza notice={notice} />
        <SynapseHall inSession={anyMeeting} />
        <DendriteDiner hasIdle={anyIdle} />
        <NodeBuilding working={anyWorking} />
        <AxonDesk active={agents.filter((a) => a.state === 'working').length} />
        <OutboxVault lastDeliveryAt={econ.lastDeliveryAt} />
        <TradeExchange lastLedgerAt={econ.lastLedgerAt} />
        <GuildHall guildCount={econ.guildCount} />
        <MyelinBank totalBalanceCC={econ.totalBalanceCC} />

        {agents.map((a, i) => (
          <Agent key={a.id} agent={a} index={i} selected={a.id === selectedId} onClick={() => select(a.id)} />
        ))}

        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={10}
          maxDistance={90}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}