import { useState, useEffect } from 'react';
import { AppShell } from './components/AppShell';
import { CeoOnboarding } from './components/CeoOnboarding';
import { Splash } from './components/Splash';
import { api } from './lib/api';
import { useUi } from './store/ui';

export function App() {
  const [booted, setBooted] = useState(false);
  const [ceoReady, setCeoReady] = useState<boolean | null>(null);
  const [bootError, setBootError] = useState('');
  const theme = useUi((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const t = setTimeout(() => setBooted(true), 900);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!booted) return;
    let active = true;

    api.getCeoProfile()
      .then((profile) => {
        if (active) setCeoReady(profile.setupComplete);
      })
      .catch((err) => {
        if (active) {
          setBootError(err instanceof Error ? err.message : 'Unable to connect to TJ-Cortex.');
          setCeoReady(false);
        }
      });

    return () => {
      active = false;
    };
  }, [booted]);

  if (!booted || ceoReady === null) return <Splash />;

  if (bootError) {
    return (
      <div className="h-full w-full grid place-items-center bg-gradient-dusk p-6">
        <div className="max-w-lg text-center glass-panel p-8">
          <div className="text-xs uppercase tracking-[0.3em] text-cortex-cyan">TJ-CORTEX</div>
          <h1 className="mt-3 text-2xl font-display font-bold">Runtime connection required</h1>
          <p className="mt-3 text-sm text-white/60">{bootError}</p>
          <button
            className="mt-6 rounded-xl bg-cortex-cyan px-5 py-3 font-semibold text-black"
            onClick={() => {
              setBootError('');
              setCeoReady(null);
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return ceoReady
    ? <AppShell />
    : <CeoOnboarding onComplete={() => setCeoReady(true)} />;
}
