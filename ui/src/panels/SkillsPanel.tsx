import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import type { Skill } from '@tj-cortex/shared';
import { EmptyState } from '../components/EmptyState';

export function SkillsPanel() {
  const [items, setItems] = useState<Skill[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<Skill['kind']>('prompt');
  const [prompt, setPrompt] = useState('');
  const [tool, setTool] = useState('');

  async function load() { setItems(await api.listSkills()); }
  useEffect(() => { void load(); }, []);

  async function create() {
    if (!name.trim()) return;
    await api.createSkill({
      name,
      kind,
      description,
      promptTemplate: kind === 'prompt' ? prompt : undefined,
      toolName: kind === 'tool' ? tool : undefined,
    });
    setName(''); setDescription(''); setPrompt(''); setTool('');
    await load();
  }

  return (
    <div className="h-full grid grid-rows-[auto,1fr]">
      <div className="p-4 border-b border-glia-gray/15">
        <div className="text-h1 font-semibold">Skills</div>
        <div className="text-body-s text-glia-gray">Reusable abilities your agents can draw on.</div>
      </div>

      <div className="overflow-y-auto p-4 space-y-4">
        <div className="rounded-xl border border-glia-gray/25 p-4 bg-black/20 space-y-2">
          <div className="grid grid-cols-[1fr,140px] gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Skill name"
              className="bg-black/30 border border-glia-gray/25 rounded-md px-3 py-2 text-body-m outline-none focus:border-cortex-violet/60" />
            <select value={kind} onChange={(e) => setKind(e.target.value as any)}
              className="bg-black/30 border border-glia-gray/25 rounded-md px-3 py-2 text-body-m outline-none focus:border-cortex-violet/60">
              <option value="prompt">Prompt</option>
              <option value="tool">Tool</option>
              <option value="composite">Composite</option>
            </select>
          </div>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description"
            className="w-full bg-black/30 border border-glia-gray/25 rounded-md px-3 py-2 text-body-m outline-none focus:border-cortex-violet/60" />
          {kind === 'prompt' && (
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="Prompt template"
              className="w-full bg-black/30 border border-glia-gray/25 rounded-md px-3 py-2 text-body-m outline-none focus:border-cortex-violet/60 font-mono" />
          )}
          {kind === 'tool' && (
            <input value={tool} onChange={(e) => setTool(e.target.value)} placeholder="Tool name"
              className="w-full bg-black/30 border border-glia-gray/25 rounded-md px-3 py-2 text-body-m outline-none focus:border-cortex-violet/60 font-mono" />
          )}
          <div className="flex justify-end">
            <button className="btn-primary flex items-center gap-2" onClick={create}><Plus size={16} /> Add skill</button>
          </div>
        </div>

        {items.length === 0 ? (
          <EmptyState title="No skills yet." body="Skills turn repeated prompts into one-click abilities." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map((s) => (
              <div key={s.id} className="rounded-xl border border-glia-gray/25 p-4 bg-black/20">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-h3 font-semibold">{s.name}</div>
                    <div className="text-body-s text-glia-gray">{s.description}</div>
                    <span className="mt-2 inline-block state-chip" style={{ background: 'rgba(34,211,238,0.12)', color: '#22D3EE' }}>{s.kind}</span>
                  </div>
                  <button className="text-glia-gray hover:text-soma-rose" onClick={() => api.deleteSkill(s.id).then(load)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}