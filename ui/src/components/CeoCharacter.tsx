import { useState } from 'react';

interface CeoCharacterProps {
  name: string;
  state?: string;
  x?: number;
  y?: number;
  selected?: boolean;
  onClick?: () => void;
}

export function CeoCharacter({
  name,
  state = 'idle',
  x = 50,
  y = 52,
  selected = false,
  onClick,
}: CeoCharacterProps) {
  const [assetFailed, setAssetFailed] = useState(false);

  return (
    <button
      type="button"
      className={`open-world__ceo-character ${selected ? 'is-selected' : ''}`}
      style={{ left: `${x}%`, top: `${y}%` }}
      onClick={onClick}
      title={`${name} · CEO Agent`}
      aria-label={`${name}, CEO Agent`}
    >
      {!assetFailed ? (
        <img
          className="open-world__ceo-character-image"
          src="/assets/ceo-character.webp"
          alt=""
          onError={() => setAssetFailed(true)}
        />
      ) : (
        <span className="open-world__ceo-character-fallback" aria-hidden="true">
          <span className="open-world__ceo-character-hair" />
          <span className="open-world__ceo-character-face" />
          <span className="open-world__ceo-character-body" />
        </span>
      )}
      <span className={`open-world__ceo-character-state open-world__ceo-character-state--${state.toLowerCase()}`}>
        CEO · {state}
      </span>
      <span className="open-world__ceo-character-name">{name}</span>
    </button>
  );
}
