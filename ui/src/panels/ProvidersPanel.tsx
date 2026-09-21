import { useEffect, useState } from 'react';
import { LogIn, LogOut, KeyRound, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { useProviders } from '../store/providers';
import type { ProviderStatus } from '@tj-cortex/shared';

/**
 * Providers. Google Gemini is primary and supports free-tier via **Google
 * Sign-In**. DeepSeek is first-class and uses an API key only — paste your key
 * and both `deepseek-chat` (V3) and `deepseek-reasoner` (R1) become available.
 */
export function ProvidersPanel() {
  const statuses = useProviders((s) => s.statuses);
  const google = useProviders((s) => s.google);
  const load = useProviders((s) => s.load);
  const signIn = useProviders((s) => s.signInGoogle);
  const signOut = useProviders((s) => s.signOutGoogle);
  const setKey = useProviders((s) => s.setKey);
  const clearKey = useProviders((s) => s.clearKey);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <header>
        <div className="text-h1 font-semibold">Providers</div>
        <div className="text-body-s text-glia-gray">
          Sign in with Google to use Gemini for free. Or bring your own keys. Keys live in your OS keychain and never reach the interface.
        </div>
      </header>

      {/* Google Sign-In card */}
      <section className="rounded-xl border border-cortex-violet/30 bg-cortex-violet/5 p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-h2 font-semibold">Google Sign-In</div>
            <div className="text-body-m text-glia-gray">
              {google.configured
                ? `Signed in as ${google.email ?? '(unknown email)'}. Free tier active.`
                : 'Sign in with Google to use Gemini for free.'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {google.configured ? (
              <button className="btn-secondary flex items-center gap-2" onClick={() => void signOut()}>
                <LogOut size={16} /> Sign out
              </button>
            ) : (
              <button className="btn-primary flex items-center gap-2" onClick={() => void signIn().catch(alert)}>
                <LogIn size={16} /> Sign in with Google
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Provider list */}
      <section className="space-y-3">
        {statuses.map((p) => (
          <ProviderCard
            key={p.providerId}
            status={p}
            onSetKey={setKey}
            onClearKey={clearKey}
          />
        ))}
      </section>
    </div>
  );
}

function ProviderCard({
  status, onSetKey, onClearKey,
}: {
  status: ProviderStatus;
  onSetKey: (id: string, key: string) => Promise<void>;
  onClearKey: (id: string) => Promise<void>;
}) {
  const [key, setKey] = useState('');
  const [saving, setSaving] = useState(false);

  const isGoogle = status.providerId === 'gemini';
  const isOllama = status.providerId === 'ollama';
  const isCompat = status.providerId === 'openai-compat';
  const authLabel =
    status.authMode === 'oauth_google' ? 'Google Sign-In' :
    status.authMode === 'none' ? 'No key required' :
    'API key';

  async function save() {
    if (!key.trim()) return;
    setSaving(true);
    try { await onSetKey(status.providerId, key.trim()); setKey(''); }
    finally { setSaving(false); }
  }

  return (
    <div className="rounded-xl border border-glia-gray/25 p-5 bg-black/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-h3 font-semibold capitalize">{status.providerId}</span>
            {status.configured ? (
              <CheckCircle2 size={16} className="text-dendrite-green" />
            ) : (
              <AlertCircle size={16} className="text-glia-gray" />
            )}
            <span className="state-chip" style={{ background: 'rgba(100,116,139,0.15)', color: '#94A3B8' }}>
              {authLabel}
            </span>
            {status.accountEmail && (
              <span className="text-body-s text-cortex-cyan">{status.accountEmail}</span>
            )}
          </div>
          {status.lastError && (
            <div className="mt-1 text-body-s text-soma-rose">{status.lastError}</div>
          )}
        </div>
        <div className="text-body-s text-glia-gray">
          {status.health === 'ok' ? 'Reachable' : status.health === 'error' ? 'Error' : 'Unknown'}
        </div>
      </div>

      {!isGoogle && !isOllama && (
        <div className="mt-4 flex items-center gap-2">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={
              isCompat ? 'Optional API key' :
              status.providerId === 'deepseek'
                ? 'Paste your DeepSeek API key'
                : 'Paste your API key'
            }
            className="flex-1 bg-black/40 border border-glia-gray/25 rounded-md px-3 py-2 text-body-m outline-none focus:border-cortex-violet/60 font-mono"
          />
          <button className="btn-primary flex items-center gap-2" onClick={save} disabled={saving}>
            <Save size={16} /> Save
          </button>
          {status.configured && (
            <button className="btn-secondary" onClick={() => void onClearKey(status.providerId)}>
              Clear
            </button>
          )}
        </div>
      )}

      {isGoogle && (
        <div className="mt-4 text-body-s text-glia-gray flex items-center gap-2">
          <KeyRound size={14} /> Prefer an API key? Paste it here:
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Gemini API key"
            className="flex-1 bg-black/40 border border-glia-gray/25 rounded-md px-2 py-1 text-body-s outline-none focus:border-cortex-violet/60 font-mono"
          />
          <button className="btn-secondary" onClick={save} disabled={!key || saving}>Save</button>
        </div>
      )}

      {status.providerId === 'deepseek' && (
        <div className="mt-2 text-body-s text-cortex-cyan">
          DeepSeek uses API keys only. Paste your key to enable deepseek-chat and deepseek-reasoner.
          Reasoning content from deepseek-reasoner streams into the Thinking panel.
        </div>
      )}

      {isOllama && (
        <div className="mt-2 text-body-s text-glia-gray">
          Ollama runs locally at http://127.0.0.1:11434 by default.
        </div>
      )}

      {isCompat && (
        <div className="mt-2 text-body-s text-glia-gray">
          Any OpenAI-compatible endpoint. Set your base URL in Settings.
        </div>
      )}
    </div>
  );
}