import { useEffect } from 'react';
import { Package, Download, Trash2 } from 'lucide-react';
import { useOutbox } from '../store/outbox';
import { api } from '../lib/api';
import { EmptyState } from '../components/EmptyState';
import { fmtAgo } from '../lib/format';

export function OutboxPanel() {
  const items = useOutbox((s) => s.items);
  const load = useOutbox((s) => s.load);
  const remove = useOutbox((s) => s.remove);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="h-full grid grid-rows-[auto,1fr]">
      <div className="p-4 border-b border-glia-gray/15">
        <div className="text-h1 font-semibold">OUTBOX</div>
        <div className="text-body-s text-glia-gray">Deliverables ready. Open the OUTBOX to review.</div>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={<Package size={28} />} title="No deliverables yet."
          body="When an agent produces a file, it lands here." />
      ) : (
        <div className="overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3 content-start">
          {items.map((it) => (
            <div key={it.id} className="rounded-xl border border-glia-gray/25 p-4 bg-black/20">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-h3 font-semibold truncate">{it.title}</div>
                  <div className="text-body-s text-glia-gray truncate">{it.path}</div>
                  <div className="mt-1 text-body-s text-glia-gray">
                    {it.mimeType} · {it.sizeBytes} B · {fmtAgo(it.createdAt)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <a className="btn-secondary p-1.5" href={api.outboxRawUrl(it.id)} target="_blank" rel="noreferrer" title="Open">
                    <Download size={16} />
                  </a>
                  <button className="btn-secondary p-1.5" onClick={() => void remove(it.id)} title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}