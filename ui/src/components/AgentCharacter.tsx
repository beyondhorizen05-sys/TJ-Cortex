import { useEffect, useState } from 'react';
import { AGENT_CHARACTERS, type AgentArchetype, resolveAgentVisualState } from '../data/agentCharacters';

interface AgentCharacterProps {
  name: string;
  archetype: AgentArchetype;
  state?: string;
  x?: number;
  y?: number;
  selected?: boolean;
  onClick?: () => void;
}

export function AgentCharacter({ name, archetype, state = 'idle', x = 50, y = 50, selected = false, onClick }: AgentCharacterProps) {
  const definition = AGENT_CHARACTERS[archetype];
  const visualState = resolveAgentVisualState(state);
  const [assetFailed, setAssetFailed] = useState(false);

  useEffect(() => setAssetFailed(false), [definition.modelPath]);

  return (
    <button
      type="button"
      className={`open-world__agent open-world__agent--${definition.fallbackClass} open-world__agent--${visualState} ${selected ? 'is-selected' : ''}`}
      style={{ left: `${x}%`, top: `${y}%` }}
      onClick={onClick}
      title={`${name} · ${definition.label} · ${visualState}`}
      aria-label={`${name}, ${definition.label}, ${visualState}`}
    >
      {!assetFailed ? (
        <model-viewer
          className="open-world__agent-model"
          src={definition.modelPath}
          alt={`${name} · ${definition.label}`}
          camera-controls={false}
          disable-zoom
          interaction-prompt="none"
          autoplay
          animation-name={definition.animations[visualState]}
          shadow-intensity="0.65"
          exposure="1.05"
          onError={() => setAssetFailed(true)}
        />
      ) : (
        <span className="open-world__agent-avatar" aria-hidden="true">
          <span className="open-world__agent-head" />
          <span className="open-world__agent-body" />
          <span className="open-world__agent-role">{definition.shortLabel}</span>
        </span>
      )}
      <span className="open-world__agent-label">{name} · {definition.label}</span>
    </button>
  );
}
