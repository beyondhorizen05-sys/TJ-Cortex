import { useEffect } from 'react';
import { useUi } from '../store/ui';
import { usePermissions } from '../store/permissions';
import { onStatus } from '../lib/ws';
import { cn } from '../lib/format';
import { VoiceButton } from './VoiceButton';

export function TopBar() {
  const connected = useUi((s) => s.connected);
  const setConnected = useUi((s) => s.setConnected);
  const pending = usePermissions((s) => s.pending.length);

  useEffect(() => onStatus(setConnected), [setConnected]);

  return (
    <header className="h-12 mx-3 mt-3 glass-panel flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'inline-block h-2 w-2 rounded-full',
            connected ? 'bg-dendrite-green animate-pulse' : 'bg-soma-rose',
          )}
        />
        <span className="text-body-s text-glia-gray">
          {connected ? 'Sidecar connected' : 'Reconnecting…'}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <VoiceButton />
        {pending > 0 && (
          <span className="state-chip" style={{ background: 'rgba(251,113,133,0.15)', color: '#FB7185' }}>
            {pending} permission{pending > 1 ? 's' : ''} waiting
          </span>
        )}
        <span className="text-body-s text-glia-gray">v0.1.0</span>
      </div>
    </header>
  );
}