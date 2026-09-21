import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { api } from '../lib/api';
import { useUi } from '../store/ui';

export function SettingsPanel() {
  const theme = useUi((s) => s.theme);
  const setTheme = useUi((s) => s.setTheme);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [baseUrls, setBaseUrls] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    api.googleStatus().then(() => { /* presence check */ }).catch(() => {});
  }, []);

  async function saveGoogleClient() {
    if (!clientId.trim()) return;
    await api.googleSetClient(clientId.trim(), clientSecret.trim() || undefined);
    setSaved('google');
    setClientId(''); setClientSecret('');
    setTimeout(() => setSaved(null), 1500);
  }

  async function saveBaseUrl(providerId: string) {
    if (!baseUrls[providerId]?.trim()) return;
    await api.setProviderBaseUrl(providerId, baseUrls[providerId]!.trim());
    setSaved(providerId);
    setTimeout(() => setSaved(null), 1500);
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 max-w-3xl">
      <header>
        <div className="text-h1 font-semibold">Settings</div>
        <div className="text-body-s text-glia-gray">Local-first. No telemetry. Ever.</div>
      </header>

      <section className="rounded-xl border border-glia-gray/25 p-5 bg-black/20 space-y-3">
        <div className="text-h2 font-semibold">Appearance</div>
        <div className="flex items-center gap-2">
          <span className="text-body-m text-glia-gray">Theme</span>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as 'dark' | 'light')}
            className="bg-black/30 border border-glia-gray/25 rounded-md px-3 py-1.5 text-body-m outline-none focus:border-cortex-violet/60"
          >
            <option value="dark">Dark (default)</option>
            <option value="light">Light</option>
          </select>
        </div>
      </section>

      <section className="rounded-xl border border-glia-gray/25 p-5 bg-black/20 space-y-3">
        <div className="text-h2 font-semibold">Google Sign-In</div>
        <p className="text-body-s text-glia-gray">
          To use Gemini free tier via Google, register an OAuth client for a desktop app with loopback redirect and paste its client ID here. It is stored in your OS keychain.
        </p>
        <input
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          placeholder="OAuth client ID (…apps.googleusercontent.com)"
          className="w-full bg-black/30 border border-glia-gray/25 rounded-md px-3 py-2 text-body-m outline-none focus:border-cortex-violet/60 font-mono"
        />
        <input
          type="password"
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
          placeholder="Client secret (optional)"
          className="w-full bg-black/30 border border-glia-gray/25 rounded-md px-3 py-2 text-body-m outline-none focus:border-cortex-violet/60 font-mono"
        />
        <div className="flex justify-end">
          <button className="btn-primary flex items-center gap-2" onClick={saveGoogleClient}>
            <Save size={16} /> Save client
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-glia-gray/25 p-5 bg-black/20 space-y-3">
        <div className="text-h2 font-semibold">OpenAI-compatible base URLs</div>
        <p className="text-body-s text-glia-gray">
          Set a base URL for <span className="font-mono">openai-compat</span> (vLLM, LM Studio, Groq, Together, local proxies) or <span className="font-mono">ollama</span>.
        </p>
        {['openai-compat', 'ollama'].map((id) => (
          <div key={id} className="flex items-center gap-2">
            <span className="font-mono text-body-s text-glia-gray w-32">{id}</span>
            <input
              value={baseUrls[id] ?? ''}
              onChange={(e) => setBaseUrls((s) => ({ ...s, [id]: e.target.value }))}
              placeholder={id === 'ollama' ? 'http://127.0.0.1:11434' : 'https://api.example.com/v1'}
              className="flex-1 bg-black/30 border border-glia-gray/25 rounded-md px-3 py-2 text-body-m outline-none focus:border-cortex-violet/60 font-mono"
            />
            <button className="btn-secondary" onClick={() => saveBaseUrl(id)}>
              {saved === id ? 'Saved' : 'Save'}
            </button>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-glia-gray/25 p-5 bg-black/20 space-y-2">
        <div className="text-h2 font-semibold">Night Shift</div>
        <p className="text-body-s text-glia-gray">
          Night Shift active. Agents will work and trade within their limits while you sleep.
        </p>
        <p className="text-body-s text-glia-gray">
          Default window: 22:00 to 06:00 local time. Override with the environment variables <span className="font-mono">TJ_CORTEX_NIGHTSHIFT_START</span> and <span className="font-mono">TJ_CORTEX_NIGHTSHIFT_END</span>.
        </p>
      </section>

      <section className="rounded-xl border border-glia-gray/25 p-5 bg-black/20 space-y-2">
        <div className="text-h2 font-semibold">Privacy</div>
        <p className="text-body-s text-glia-gray">
          TJ-Cortex is local-first. Your data never leaves your machine unless you explicitly configure a provider. No analytics, no crash reporting, no hidden network calls.
        </p>
      </section>
    </div>
  );
}