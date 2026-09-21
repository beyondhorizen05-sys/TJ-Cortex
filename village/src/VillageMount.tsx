import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Village } from './scene/Village';
import { bindVillageEvents, useVillage } from './state/villageStore';
import { installWsBridge } from './lib/wsBridge';

/**
 * Public entry for the UI. The UI installs a `{ on }` WebSocket bridge on
 * mount; the village then binds to sidecar events itself and renders the
 * world. Nothing here is coupled to the ui package — the bridge is the seam.
 */
export function VillageMount() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If the host UI already started a WebSocket, it will install the bridge
    // here; otherwise the world still renders with an empty roster.
    try {
      // The host sets `window.__tj_cortex_ws__` for us.
      const bridge = (window as any).__tj_cortex_ws__;
      if (bridge) installWsBridge(bridge);
    } catch (e) {
      setError((e as Error).message);
    }
    const off = bindVillageEvents();
    return off;
  }, []);

  // Center on the plaza at load.
  useEffect(() => {
    // Center the map at (0,0). No-op placeholder — the camera defaults are set
    // in the Canvas props and the user can orbit freely.
    const st = useVillage.getState();
    st.setTime(0.5);
  }, []);

  if (error) {
    return (
      <div className="h-full grid place-items-center">
        <div className="text-body-m text-soma-rose">Village failed to initialize: {error}</div>
      </div>
    );
  }

  return <Village canvasHeight={window.innerHeight - 90} />;
}