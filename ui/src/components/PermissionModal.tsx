import { AnimatePresence, motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import { usePermissions } from '../store/permissions';

export function PermissionModal() {
  const pending = usePermissions((s) => s.pending);
  const resolve = usePermissions((s) => s.resolve);
  const req = pending[0];

  return (
    <AnimatePresence>
      {req && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: 8, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 8, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-[520px] max-w-[92vw] rounded-xl border border-glia-gray/25 bg-[#101020]/95 p-6 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-soma-rose">
                <ShieldAlert size={20} />
              </div>
              <div className="flex-1">
                <div className="text-h2 font-semibold">Consent required</div>
                <p className="mt-1 text-body-m text-glia-gray">
                  This action needs your consent. Nothing was executed.
                </p>
                <div className="mt-4 rounded-md border border-glia-gray/20 bg-black/30 p-3 font-mono text-mono">
                  <div><span className="text-glia-gray">kind:   </span>{req.kind}</div>
                  <div className="break-all"><span className="text-glia-gray">scope:  </span>{req.scope}</div>
                  <div><span className="text-glia-gray">risk:   </span>{req.risk}</div>
                  <div className="mt-2 text-glia-gray">{req.reason}</div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button className="btn-secondary" onClick={() => resolve(req.id, 'deny')}>
                    Deny
                  </button>
                  <button className="btn-secondary" onClick={() => resolve(req.id, 'allow_once')}>
                    Allow once
                  </button>
                  <button className="btn-primary" onClick={() => resolve(req.id, 'allow_always')}>
                    Allow always
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}