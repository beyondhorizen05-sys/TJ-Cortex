import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import './index.css';
import { App } from './App';
import { startWs, onStatus } from './lib/ws';
import { useUi } from './store/ui';

startWs();

function RuntimeBridge() {
  const setConnected = useUi((s) => s.setConnected);
  useEffect(() => onStatus(setConnected), [setConnected]);
  return null;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RuntimeBridge />
    <App />
  </React.StrictMode>,
);