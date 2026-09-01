import { useCallback, useRef, useState } from 'react';
import { useMetered } from './hooks/useMetered';
import type { LogEntry, LogSource } from './types/log';
import IpvPanel from './components/IpvPanel';
import MeteredPanel from './components/MeteredPanel';
import RemoteVideo from './components/RemoteVideo';
import StatusLog from './components/StatusLog';
import Toolbar from './components/Toolbar';

type Mode = 'idle' | 'metered' | 'ipv';
type FullWho = 'local' | 'remote';
type Variant = 'full' | 'pip' | 'hidden';

const ROOM_URL = (import.meta.env.VITE_METERED_ROOM_URL as string | undefined) ?? '';
const NAME = (import.meta.env.VITE_METERED_NAME as string | undefined) ?? 'POC User';

function App() {
  const [mode, setMode] = useState<Mode>('idle');
  const [fullWho, setFullWho] = useState<FullWho>('remote');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLog, setShowLog] = useState(false);
  const idRef = useRef(0);

  const log = useCallback((source: LogSource, message: string) => {
    const entry: LogEntry = {
      id: ++idRef.current,
      time: new Date().toISOString().slice(11, 23),
      source,
      message
    };
    setLogs((prev) => [...prev.slice(-199), entry]);
  }, []);

  const { videoRef, joined, videoOn, audioOn, error, remote, join, stopVideo, startVideo, toggleMic } =
    useMetered(log);

  const handleJoin = useCallback(async () => {
    if (!ROOM_URL) {
      log('app', 'No VITE_METERED_ROOM_URL set. Copy .env.example -> .env and fill it in.');
      return;
    }
    const normalized = ROOM_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const ok = await join(normalized, NAME);
    if (ok) setMode('metered');
  }, [join, log]);

  const toggleToIpv = useCallback(async () => {
    log('app', 'switch -> IPV: stopVideo() to release camera, then mounting IPV');
    await stopVideo();
    setMode('ipv');
  }, [stopVideo, log]);

  const toggleToMetered = useCallback(async () => {
    log('app', 'switch -> Metered: unmount IPV (releases stream), then startVideo()');
    setMode('metered');
    await new Promise((resolve) => setTimeout(resolve, 200));
    await startVideo();
  }, [startVideo, log]);

  const toggleCameraMode = useCallback(async () => {
    if (mode === 'ipv') await toggleToMetered();
    else await toggleToIpv();
  }, [mode, toggleToIpv, toggleToMetered]);

  const hasRemote = remote !== null;

  let localVariant: Variant;
  let remoteVariant: Variant;

  if (mode === 'metered') {
    const fullIsRemote = hasRemote && fullWho === 'remote';
    localVariant = fullIsRemote ? 'pip' : 'full';
    remoteVariant = fullIsRemote ? 'full' : 'pip';
  } else if (mode === 'ipv') {
    localVariant = 'hidden';
    remoteVariant = 'pip';
  } else {
    localVariant = 'hidden';
    remoteVariant = 'hidden';
  }

  const swapToLocal = mode === 'metered' && localVariant === 'pip' ? () => setFullWho('local') : undefined;
  const swapToRemote =
    mode === 'metered' && remoteVariant === 'pip' ? () => setFullWho('remote') : undefined;

  const modeLabel = mode === 'ipv' ? 'IPV' : mode === 'metered' ? 'VIDEO' : 'IDLE';

  return (
    <div className="app">
      <div className="statusbar">
        <span className="mode-pill">{modeLabel}</span>
        <span className={videoOn ? 'dot-on' : 'dot-off'}>cam {videoOn ? '●' : '○'}</span>
        <span className={audioOn ? 'dot-on' : 'dot-off'}>mic {audioOn ? '●' : '○'}</span>
        {error && <span className="error">{error}</span>}
      </div>

      <div className="stage">
        <MeteredPanel videoRef={videoRef} variant={localVariant} onSwap={swapToLocal} />
        {remote && <RemoteVideo remote={remote} variant={remoteVariant} onSwap={swapToRemote} />}
        {mode === 'idle' && <div className="idle-hint">Tap Join to start the video call</div>}
        {mode === 'ipv' && <IpvPanel log={log} />}
        {showLog && <StatusLog logs={logs} />}
      </div>

      <Toolbar
        joined={joined}
        inIpv={mode === 'ipv'}
        audioOn={audioOn}
        showLog={showLog}
        onJoin={handleJoin}
        onToggleMic={toggleMic}
        onToggleCamera={toggleCameraMode}
        onToggleLog={() => setShowLog((v) => !v)}
      />
    </div>
  );
}

export default App;
