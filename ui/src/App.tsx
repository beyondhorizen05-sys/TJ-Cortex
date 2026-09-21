import { useState, useEffect } from 'react';
import { AppShell } from './components/AppShell';
import { Splash } from './components/Splash';
import { useUi } from './store/ui';

export function App() {
  const [booted, setBooted] = useState(false);
  const theme = useUi((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const t = setTimeout(() => setBooted(true), 900);
    return () => clearTimeout(t);
  }, []);

  return booted ? <AppShell /> : <Splash />;
}