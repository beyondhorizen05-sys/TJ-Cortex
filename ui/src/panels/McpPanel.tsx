import { useEffect, useState } from 'react';
import { Plus, Trash2, Plug } from 'lucide-react';
import { api } from '../lib/api';
import type { McpServerConfig } from '@tj-cortex/shared';
import { EmptyState } from '../components/EmptyState';

export function McpPanel() {
  const [items, setItems] = useState<McpServerConfig[]>([]);
  const [live, setLive] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [transport, setTransport] = useState<'stdio' | 'sse'>('stdio');
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState('');
  const [url, setUrl] = useState('');

  async function load() {
    setItems(await api.listMcp());
    setLive(await api.listMcpLive());
  }
  useEffect(() => { void load(); }, []);

  async function create() {
    if (!name.trim()) return;
    await api.createMcp({
      name,
      transport,
      command: transport === 'stdio' ? command : undefined,
      args: args ? args.split(/\s+/).filter(Boolean) : [],
      url: transport === 'sse' ? url : undefined,
    });
    setName(''); setCommand(''); setArgs(''); setUrl('');
    await load();
  }

  return (
    <div className="h-full grid grid-rows-[auto,1fr]">
      <div className="p-4 border-b border-glia-gray/15">
        <div className="text-h1 font-semibold">MCP</div>
        <div className="text-body-s text-glia-gray">
          Model Context Protocol connectors. Tools from MCP servers are exposed as <span className="font-mono">mcp.&lt;server&gt;.&lt;tool&gt;</span>.
        </div>
      </div>

      <div className="overflow-y-auto p-4 space-y-4">
        <div className="rounded-xl border border-glia-gray/25 p-4 bg-black/20 space-y-2">
          <div className="grid grid-cols-[1fr,140px] gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Server name"
              className="bg-black/30 border border-glia-gray/25 rounded-md px-3 py-2 text-body-m outline-none focus:border-cortex-violet/60" />
            <select value={transport} onChange={(e) => setTransport(e.target.value as any)}
              className="bg-black/30 border border-glia-gray/25 rounded-md px-3 py-2 text-body-m outline-none focus:border-cortex-violet/60">
              <option value="stdio">stdio</option>
              <option value="sse">SSE</option>
            </select>
          </div>
          {transport === 'stdio' ? (
            <>
              <input value={command} onChange={(e) => setCommand(e.target.value)} placeholder="command (e.g. npx)"
                className="w-full bg-black/30 border border-glia-gray/25 rounded-md px-3 py-2 text-body-m outline-none focus:border-cortex-violet/60 font-mono" />
              <input value={args} onChange={(e) => setArgs(e.target.value)} placeholder="args (space-separated)"
                className="w-full bg-black/30 border border-glia-gray/25 rounded-md px-3 py-2 text-body-m outline-none focus:border-cortex-violet/60 font-mono" />
            </>
          ) : (
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://mcp.example.com/sse"
              className="w-full bg-black/30 border border-glia-gray/25 rounded-md px-3 py-2 text-body-m outline-none focus:border-cortex-violet/60 font-mono" />
          )}
          <div className="flex justify-end">
            <button className="btn-primary flex items-center gap-2" onClick={create}><Plus size={16} /> Add MCP server</button>
          </div>
        </div>

        {items.length === 0 ? (
          <EmptyState icon={<Plug size={28} />} title="No MCP servers yet."
            body="Connect an MCP server to give your agents new tools." />
        ) : (
          <div className="space-y-3">
            {items.map((s) => {
              const isLive = live.find((l) => l.id === s.id);
              return (
                <div key={s.id} className="rounded-xl border border-glia-gray/25 p-4 bg-black/20">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-h3 font-semibold">{s.name}</span>
                        <span className="state-chip" style={{ background: 'rgba(20,184,166,0.15)', color: '#14B8A6' }}>{s.transport}</span>
                        {isLive && <span className="state-chip" style={{ background: 'rgba(52,211,153,0.15)', color: '#34D399' }}>connected · {isLive.toolNames.length} tools</span>}
                      </div>
                      <div className="mt-1 text-body-s text-glia-gray font-mono">
                        {s.command ? `${s.command} ${(s.args ?? []).join(' ')}` : s.url}
                      </div>
                      {isLive && isLive.toolNames.length ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {isLive.toolNames.map((t: string) => (
                            <span key={t} className="state-chip" style={{ background: 'rgba(100,116,139,0.15)', color: '#94A3B8' }}>{t}</span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <button className="text-glia-gray hover:text-soma-rose" onClick={() => api.deleteMcp(s.id).then(load)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}