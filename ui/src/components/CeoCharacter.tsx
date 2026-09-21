import { useEffect, useMemo, useState } from 'react';

type CeoVisualState = 'idle' | 'walking' | 'working' | 'meeting' | 'command' | 'speaking' | 'offline';

interface CeoCharacterProps {
  name: string;
  state?: string;
  x?: number;
  y?: number;
  selected?: boolean;
  onClick?: () => void;
  isCommandOpen?: boolean;
}

function resolveVisualState(state: string, commandOpen: boolean): CeoVisualState {
  if (commandOpen) return 'command';
  const value = state.toLowerCase();
  if (value.includes('speak') || value.includes('voice')) return 'speaking';
  if (value.includes('meet')) return 'meeting';
  if (value.includes('work')) return 'working';
  if (value.includes('offline')) return 'offline';
  if (value.includes('walk') || value.includes('move')) return 'walking';
  return 'idle';
}

export function CeoCharacter({
  name,
  state = 'idle',
  x = 50,
  y = 52,
  selected = false,
  onClick,
  isCommandOpen = false,
}: CeoCharacterProps) {
  const [assetFailed, setAssetFailed] = useState(false);
  const visualState = useMemo(() => resolveVisualState(state, isCommandOpen), [state, isCommandOpen]);

  useEffect(() => {
    setAssetFailed(false);
  }, [name]);

  return (
    <button
      type="button"
      className={`open-world__ceo-character open-world__ceo-character--${visualState} ${selected ? 'is-selected' : ''}`}
      style={{ left: `${x}%`, top: `${y}%` }}
      onClick={onClick}
      title={`${name} · CEO Agent · ${visualState}`}
      aria-label={`${name}, CEO Agent, ${visualState}`}
    >
      {!assetFailed ? (
        <model-viewer
          className="open-world__ceo-character-model"
          src="/assets/ceo-character.glb"
          alt={`${name} · CEO Agent`}
          camera-controls={false}
          disable-zoom
          interaction-prompt="none"
          autoplay
          animation-name="*"
          shadow-intensity="0.8"
          exposure="1.05"
          onError={() => setAssetFailed(true)}
        />
      ) : (
        <span className="open-world__ceo-character-fallback" aria-hidden="true">
          <span className="open-world__ceo-character-hair" />
          <span className="open-world__ceo-character-face" />
          <span className="open-world__ceo-character-body" />
        </span>
      )}
      <span className="open-world__ceo-character-state">
        CEO · {visualState}
      </span>
      <span className="open-world__ceo-character-name">{name}</span>
    </button>
  );
}
