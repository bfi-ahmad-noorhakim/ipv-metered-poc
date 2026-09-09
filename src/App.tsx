import { useCallback, useRef, useState } from 'react';
import { Chips, EmptyState, Loader, Snackbar, Typography } from '@bfi-finance/frontend-ui/components';
import { useMetered } from './hooks/useMetered';
import type { LogEntry, LogSource } from './types/log';
import type { Persona } from './types/persona';
import IpvPanel from './components/IpvPanel';
import MeteredPanel from './components/MeteredPanel';
import PersonaSelect from './components/PersonaSelect';
import RemoteVideo from './components/RemoteVideo';
import StatusLog from './components/StatusLog';
import Toolbar from './components/Toolbar';

type Mode = 'idle' | 'metered' | 'ipv';
type FullWho = 'local' | 'remote';
type Variant = 'full' | 'pip' | 'hidden';

const ROOM_URL = (import.meta.env.VITE_METERED_ROOM_URL as string | undefined) ?? '';
const NAME = (import.meta.env.VITE_METERED_NAME as string | undefined) ?? 'POC User';

function App() {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [mode, setMode] = useState<Mode>('idle');
  const [fullWho, setFullWho] = useState<FullWho>('remote');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [joining, setJoining] = useState(false);
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
    setJoining(true);
    try {
      const normalized = ROOM_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const ok = await join(normalized, NAME);
      if (ok) setMode('metered');
    } finally {
      setJoining(false);
    }
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
    if (persona !== 'user') return;
    if (mode === 'ipv') await toggleToMetered();
    else await toggleToIpv();
  }, [persona, mode, toggleToIpv, toggleToMetered]);

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
  const modeChipVariant = mode === 'ipv' ? 'success' : mode === 'metered' ? 'selected' : 'unselected';

  if (persona === null) {
    return <PersonaSelect onSelect={setPersona} />;
  }

  return (
    <div className="app">
      <header className="statusbar">
        <Chips label={modeLabel} variant={modeChipVariant} />
        <div className="status-indicators">
          <Typography
            component="span"
            size="xs"
            style="semi_bold"
            color={videoOn ? 'success' : 'neutral70'}
          >
            cam {videoOn ? '●' : '○'}
          </Typography>
          <Typography
            component="span"
            size="xs"
            style="semi_bold"
            color={audioOn ? 'success' : 'neutral70'}
          >
            mic {audioOn ? '●' : '○'}
          </Typography>
        </div>
      </header>

      {error && (
        <div className="error-snackbar">
          <Snackbar variant="danger" message={error} isFullWidth />
        </div>
      )}

      <div className={`stage ${mode === 'idle' ? 'is-idle' : ''}`}>
        <MeteredPanel videoRef={videoRef} variant={localVariant} onSwap={swapToLocal} />
        {remote && <RemoteVideo remote={remote} variant={remoteVariant} onSwap={swapToRemote} />}
        {mode === 'idle' && (
          <div className="idle-hint">
            <EmptyState
              title="Start the video call"
              description="Tap Join below to connect to the Metered room and switch between the Metered camera and the BFI IPV SDK."
            />
          </div>
        )}
        {mode === 'ipv' && <IpvPanel log={log} />}
      </div>

      <Toolbar
        joined={joined}
        inIpv={mode === 'ipv'}
        showIpv={persona === 'user'}
        audioOn={audioOn}
        showLog={showLog}
        onJoin={handleJoin}
        onToggleMic={toggleMic}
        onToggleCamera={toggleCameraMode}
        onToggleLog={() => setShowLog((v) => !v)}
      />

      <StatusLog open={showLog} logs={logs} onClose={() => setShowLog(false)} />

      {joining && <Loader isFullScreen />}
    </div>
  );
}

export default App;
