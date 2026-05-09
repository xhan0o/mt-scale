import { useState } from 'react';
// For local dev: useScaleBridge (needs `node bridge.js` running)
// For production: swap back to useScaleSerial (WebSerial, Chrome/Edge only)
import { useScaleSerial } from './hooks/useScaleSerial';
import ConnectPanel from './components/ConnectPanel';
import WeightDisplay from './components/WeightDisplay';
import CaptureLog from './components/CaptureLog';
import RawDebug from './components/RawDebug';
import SetupInfoModal from './components/SetupInfoModal';
import './App.css';

export default function App() {
  const scale = useScaleSerial();
  const [captures, setCaptures] = useState([]);
  const [debugOpen, setDebugOpen] = useState(false);

  const capture = () => {
    if (scale.reading?.value == null) return;
    const entry = {
      id: Date.now(),
      value: scale.reading.value,
      unit: scale.reading.unit,
      stable: scale.reading.status === 'stable',
      timestamp: new Date().toLocaleTimeString(),
    };
    setCaptures(prev => [entry, ...prev]);

    // Stub: replace with real API call
    console.log('[scale capture]', entry);
    // fetch('/api/weight', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(entry),
    // });
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title-group">
          <h1>Scale Reader</h1>
          <SetupInfoModal />
        </div>
        <ConnectPanel
          connected={scale.connected}
          onConnect={scale.connect}
          onDisconnect={scale.disconnect}
        />
      </header>

      {scale.error && <div className="error-banner">{scale.error}</div>}

      <main className="app-main">
        <WeightDisplay reading={scale.reading} connected={scale.connected} />

        <div className="controls">
          <button
            className="btn btn-secondary"
            onClick={scale.tare}
            disabled={!scale.connected}
          >
            Tare
          </button>
          <button
            className="btn btn-secondary"
            onClick={scale.zero}
            disabled={!scale.connected}
          >
            Zero
          </button>
          <button
            className="btn btn-primary"
            onClick={capture}
            disabled={!scale.connected || scale.reading?.value == null}
          >
            Capture
          </button>
        </div>

        <CaptureLog captures={captures} onClear={() => setCaptures([])} />

        <RawDebug
          lines={scale.rawLines}
          open={debugOpen}
          onToggle={() => setDebugOpen(v => !v)}
        />
      </main>
    </div>
  );
}
