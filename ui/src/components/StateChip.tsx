import { stateColor } from '../lib/format';

export function StateChip({ state }: { state: string }) {
  const color = stateColor(state);
  return (
    <span
      className="state-chip"
      style={{ background: `${color}26`, color }}
      title={state}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {state}
    </span>
  );
}