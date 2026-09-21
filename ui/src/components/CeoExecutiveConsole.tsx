import { useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { Agent } from '@tj-cortex/shared';

interface Props {
  ceo: Agent;
  agents: Agent[];
  onClose: () => void;
  onNotice: (message: string) => void;
}

export function CeoExecutiveConsole({ ceo, agents, onClose, onNotice }: Props) {
  const [targetId, setTargetId] = useState('');
  const [command, setCommand] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState('');

  const targets = useMemo(() => agents.filter((agent) => agent.id !== ceo.id), [agents]);

  const execute = async () => {
    const input = command.trim();
    if (!input || running) return;
    setRunning(true);
    setResult('');
    try {
      const target = targets.find((agent) => agent.id === targetId);
      const routed = target
        ? `Executive directive for ${target.name} (agentId: ${target.id}): ${input}`
        : `Executive directive for the TJ-CORTEX crew: ${input}`;
      const response = await api.runTurn({ agentId: ceo.id, input: routed });
      setResult(response.text);
      onNotice(`${ceo.name} · executive directive processed`);
      setCommand('');
    } catch (error) {
      setResult(error instanceof Error ? error.message : 'Executive command failed.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="open-world__ceo-console" role="dialog" aria-modal="true" aria-label="CEO Executive Console">
      <div className="open-world__ceo-console-card">
        <header className="open-world__ceo-console-header">
          <div>
            <span className="open-world__panel-label">CEO COMMAND // EXECUTIVE LAYER</span>
            <h2>{ceo.name}</h2>
            <p>Main AI executive · delegate work through the existing runtime, permissions and agent system.</p>
          </div>
          <button type="button" className="open-world__ceo-close" onClick={onClose}>ESC · CLOSE</button>
        </header>

        <div className="open-world__ceo-command-grid">
          <label>
            <span>DIRECT TO</span>
            <select value={targetId} onChange={(event) => setTargetId(event.target.value)}>
              <option value="">Entire crew</option>
              {targets.map((agent) => (
                <option key={agent.id} value={agent.id}>{agent.name} · {String(agent.role)}</option>
              ))}
            </select>
          </label>
          <div className="open-world__ceo-runtime">
            <span>RUNTIME</span>
            <strong>{agents.length} agents online</strong>
            <small>CEO identity verified</small>
          </div>
        </div>

        <label className="open-world__ceo-command">
          <span>EXECUTIVE DIRECTIVE</span>
          <textarea
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault();
                void execute();
              }
            }}
            placeholder="Example: Review the active workload and identify the next three priorities."
            rows={4}
            disabled={running}
          />
        </label>

        <div className="open-world__ceo-actions">
          <button type="button" className="open-world__ceo-execute" onClick={() => void execute()} disabled={running || !command.trim()}>
            {running ? 'PROCESSING…' : 'EXECUTE DIRECTIVE'}
          </button>
          <span>CTRL / CMD + ENTER</span>
        </div>

        {result && (
          <div className="open-world__ceo-result">
            <span>CEO RESPONSE</span>
            <p>{result}</p>
          </div>
        )}
      </div>
    </div>
  );
}
