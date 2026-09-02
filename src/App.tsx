import { useCallback, useRef, useState } from 'react';
import { useMetered } from './hooks/useMetered';
import { useCameraCapabilities } from './hooks/useCameraCapabilities';
import type { CameraCapability } from './hooks/useCameraCapabilities';
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
  const [capability, setCapability] = useState<CameraCapability>('single');
  const [ipvKey, setIpvKey] = useState(0);
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
  const { detect } = useCameraCapabilities();

  const handleJoin = useCallback(async () => {
    if (!ROOM_URL) {
      log('app', 'No VITE_METERED_ROOM_URL set. Copy .env.example -> .env and fill it in.');
      return;
    }
    const normalized = ROOM_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const ok = await join(normalized, NAME);
    if (ok) {
      setMode('metered');
      const cap = await detect();
      setCapability(cap);
      log('app', `camera capability detected: ${cap}`);
    }
  }, [join, detect, log]);

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

  const isSplit = capability === 'split';

  const toggleCameraMode = useCallback(async () => {
    if (capability === 'none') return;
    if (mode === 'ipv') {
      if (isSplit) {
        log('app', 'switch -> Metered (split): unmount IPV, front camera still live');
        setMode('metered');
      } else {
        await toggleToMetered();
      }
    } else {
      if (isSplit) {
        log('app', 'switch -> IPV (split): keep Metered on front, IPV uses back');
        setMode('ipv');
      } else {
        await toggleToIpv();
      }
    }
  }, [capability, isSplit, mode, toggleToIpv, toggleToMetered]);

  const handleIpvError = useCallback(async () => {
    if (capability !== 'split') return;
    log('app', 'IPV camera error in split mode, falling back to stop/start');
    setCapability('single');
    if (mode === 'ipv') {
      await stopVideo();
      setIpvKey((k) => k + 1);
    }
  }, [capability, mode, stopVideo, log]);

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
        <span className="cap">detect: {capability}</span>
        {error && <span className="error">{error}</span>}
      </div>

      <div className="stage">
        <MeteredPanel videoRef={videoRef} variant={localVariant} onSwap={swapToLocal} />
        {remote && <RemoteVideo remote={remote} variant={remoteVariant} onSwap={swapToRemote} />}
        {mode === 'idle' && <div className="idle-hint">Tap Join to start the video call</div>}
        {mode === 'ipv' && <IpvPanel key={ipvKey} log={log} onCameraError={handleIpvError} />}
        {showLog && <StatusLog logs={logs} />}
      </div>

      <Toolbar
        joined={joined}
        inIpv={mode === 'ipv'}
        audioOn={audioOn}
        showLog={showLog}
        cameraToggleDisabled={capability === 'none'}
        onJoin={handleJoin}
        onToggleMic={toggleMic}
        onToggleCamera={toggleCameraMode}
        onToggleLog={() => setShowLog((v) => !v)}
      />
    </div>
  );
}

export default App;
