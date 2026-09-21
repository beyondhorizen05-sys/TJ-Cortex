import { FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Sparkles } from 'lucide-react';
import { api } from '../lib/api';

interface CeoOnboardingProps {
  onComplete: () => void;
}

export function CeoOnboarding({ onComplete }: CeoOnboardingProps) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a name for your CEO Agent.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await api.setupCeo(trimmed);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save the CEO identity.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-full w-full grid place-items-center bg-gradient-dusk p-6">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-xl glass-panel p-8 border border-white/10 shadow-2xl"
      >
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-black/30 border border-cortex-cyan/30">
          <Crown className="h-9 w-9 text-cortex-cyan" />
        </div>

        <div className="mt-6 text-center">
          <div className="text-xs uppercase tracking-[0.35em] text-cortex-cyan">
            TJ-CORTEX · CEO AGENT
          </div>
          <h1 className="mt-3 text-3xl font-display font-bold">
            Give your CEO Agent a name
          </h1>
          <p className="mt-3 text-sm text-white/60 leading-6">
            This identity will be used by the CEO character, conversations,
            delegation, notifications, HQ, history, and the open-world roster.
          </p>
        </div>

        <label className="mt-8 block text-sm font-medium text-white/80">
          CEO Agent name
          <div className="relative mt-2">
            <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cortex-cyan" />
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              placeholder="Enter a name"
              disabled={saving}
              className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-10 pr-4 outline-none transition focus:border-cortex-cyan/60"
            />
          </div>
        </label>

        {error && (
          <div className="mt-3 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="mt-6 w-full rounded-xl bg-cortex-cyan px-4 py-3 font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? 'Creating CEO Agent…' : 'Create CEO Agent'}
        </button>
      </motion.form>
    </div>
  );
}
