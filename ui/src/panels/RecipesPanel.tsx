import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import type { Recipe } from '@tj-cortex/shared';
import { EmptyState } from '../components/EmptyState';

export function RecipesPanel() {
  const [items, setItems] = useState<Recipe[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  async function load() { setItems(await api.listRecipes()); }
  useEffect(() => { void load(); }, []);

  async function create() {
    if (!name.trim()) return;
    await api.createRecipe({ name, description });
    setName(''); setDescription(''); setCreating(false);
    await load();
  }

  return (
    <div className="h-full grid grid-rows-[auto,1fr]">
      <div className="flex items-center justify-between p-4 border-b border-glia-gray/15">
        <div>
          <div className="text-h1 font-semibold">Recipes</div>
          <div className="text-body-s text-glia-gray">Reusable task templates your agents can run.</div>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setCreating((v) => !v)}>
          <Plus size={16} /> New recipe
        </button>
      </div>

      {creating && (
        <div className="p-4 border-b border-glia-gray/15 flex flex-col gap-2">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Recipe name"
            className="bg-black/30 border border-glia-gray/25 rounded-md px-3 py-2 text-body-m outline-none focus:border-cortex-violet/60" />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description"
            className="bg-black/30 border border-glia-gray/25 rounded-md px-3 py-2 text-body-m outline-none focus:border-cortex-violet/60" />
          <div className="flex justify-end"><button className="btn-primary" onClick={create}>Create</button></div>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState title="No recipes yet." body="Create a recipe to give your agents a reusable playbook." />
      ) : (
        <div className="overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3 content-start">
          {items.map((r) => (
            <div key={r.id} className="rounded-xl border border-glia-gray/25 p-4 bg-black/20">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-h3 font-semibold">{r.name}</div>
                  <div className="text-body-s text-glia-gray">{r.description}</div>
                  {r.tags?.length ? (
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {r.tags.map((t) => (
                        <span key={t} className="state-chip" style={{ background: 'rgba(108,76,241,0.15)', color: '#A78BFA' }}>{t}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button className="text-glia-gray hover:text-soma-rose" onClick={() => api.deleteRecipe(r.id).then(load)}>
                  <Trash2 size={16} />
                </button>
              </div>
              {r.steps?.length ? (
                <ol className="mt-3 space-y-1 text-body-s text-glia-gray">
                  {r.steps.map((s, i) => (
                    <li key={s.id ?? i}>• {s.title}{s.tool ? ` (${s.tool})` : ''}</li>
                  ))}
                </ol>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}