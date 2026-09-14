import { useCallback, useRef, useState } from 'react';
import { Chips, EmptyState, Loader, Snackbar, Typography } from '@bfi-finance/frontend-ui/components';
import { useMetered } from './hooks/useMetered';
import type { LogEntry, LogSource } from './types/log';
import IpvPanel from './components/IpvPanel';
import IpvCaptureDialog from './components/IpvCaptureDialog';
import MeteredPanel from './components/MeteredPanel';
import RemoteVideo from './components/RemoteVideo';
import FileOverlay from './components/FileOverlay';
import StatusLog from './components/StatusLog';
import Toolbar from './components/Toolbar';

type Mode = 'idle' | 'metered' | 'ipv';
type Variant = 'full' | 'pip' | 'hidden';

const ROOM_URL = (import.meta.env.VITE_METERED_ROOM_URL as string | undefined) ?? '';
const NAME = (import.meta.env.VITE_METERED_NAME as string | undefined) ?? 'POC User';

function App() {
  const [mode, setMode] = useState<Mode>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [joining, setJoining] = useState(false);
  const [ipvCapture, setIpvCapture] = useState<string | null>(null);
  const [sendingIpv, setSendingIpv] = useState(false);
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

  const { videoRef, joined, videoOn, audioOn, error, remote, files, join, stopVideo, startVideo, toggleMic, sendFile, clearFiles } =
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
    if (mode === 'ipv') await toggleToMetered();
    else await toggleToIpv();
  }, [mode, toggleToIpv, toggleToMetered]);

  const handleSendFiles = useCallback(
    (selected: File[]) => {
      selected.forEach((file) => sendFile(file));
    },
    [sendFile]
  );

  const handleSendIpvCapture = useCallback(async () => {
    if (!ipvCapture) return;
    setSendingIpv(true);
    try {
      const blob = await (await fetch(ipvCapture)).blob();
      const ext = blob.type === 'image/png' ? 'png' : 'jpg';
      const file = new File([blob], `ipv-capture.${ext}`, { type: blob.type });
      await sendFile(file);
    } catch (e) {
      log('app', `IPV capture send error: ${String(e)}`);
    } finally {
      setSendingIpv(false);
      setIpvCapture(null);
    }
    toggleToMetered();
  }, [ipvCapture, sendFile, log, toggleToMetered]);

  const hasRemote = remote !== null;

  let localVariant: Variant;
  let remoteVariant: Variant;

  if (mode === 'metered') {
    localVariant = 'full';
    remoteVariant = 'full';
  } else if (mode === 'ipv') {
    localVariant = 'hidden';
    remoteVariant = 'pip';
  } else {
    localVariant = 'hidden';
    remoteVariant = 'hidden';
  }

  const modeLabel = mode === 'ipv' ? 'IPV' : mode === 'metered' ? 'VIDEO' : 'IDLE';
  const modeChipVariant = mode === 'ipv' ? 'success' : mode === 'metered' ? 'selected' : 'unselected';

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

      <div className={`stage ${mode === 'idle' ? 'is-idle' : ''} ${mode === 'metered' ? 'is-grid' : ''}`}>
        <MeteredPanel videoRef={videoRef} variant={localVariant} />
        {remote && <RemoteVideo remote={remote} variant={remoteVariant} />}
        {mode === 'idle' && (
          <div className="idle-hint">
            <EmptyState
              title="Start the video call"
              description="Tap Join below to connect to the Metered room and switch between the Metered camera and the BFI IPV SDK."
            />
          </div>
        )}
        {mode === 'ipv' && <IpvPanel log={log} onCaptureImage={setIpvCapture} />}
        {files.length > 0 && <FileOverlay files={files} onClear={clearFiles} />}
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
        onSendFiles={handleSendFiles}
      />

      <StatusLog open={showLog} logs={logs} onClose={() => setShowLog(false)} />

      <IpvCaptureDialog
        image={ipvCapture}
        sending={sendingIpv}
        onSend={handleSendIpvCapture}
        onCancel={() => setIpvCapture(null)}
      />

      {joining && <Loader isFullScreen />}
    </div>
  );
}

export default App;
