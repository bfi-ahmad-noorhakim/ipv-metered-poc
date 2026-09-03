import { useCallback, useEffect, useState } from 'react';
import ImageValidationSDK from '@bfi-finance/bravo-image-validation-web-sdk';
import type { LogSource } from '../types/log';

type Props = {
  log: (source: LogSource, message: string) => void;
};

type FacingMode = 'user' | 'environment';

function IpvPanel({ log }: Props) {
  const [facingMode, setFacingMode] = useState<FacingMode>('environment');
  const [canSwitch, setCanSwitch] = useState(false);

  useEffect(() => {
    log('ipv', 'IPV panel mounted');
    return () => log('ipv', 'IPV panel unmounted (stream released)');
  }, [log]);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        if (cancelled) return;
        const cameraCount = devices.filter((d) => d.kind === 'videoinput').length;
        setCanSwitch(cameraCount >= 2);
        log('ipv', `enumerateDevices: ${cameraCount} video input(s)`);
      })
      .catch((e) => log('ipv', `enumerateDevices error: ${String(e)}`));
    return () => {
      cancelled = true;
    };
  }, [log]);

  const toggleFacing = useCallback(() => {
    setFacingMode((prev) => {
      const next: FacingMode = prev === 'environment' ? 'user' : 'environment';
      log('ipv', `switch camera -> ${next}`);
      return next;
    });
  }, [log]);

  return (
    <div className="ipv-overlay">
      <ImageValidationSDK
        key={facingMode}
        className="ipv-sdk"
        state="manual"
        facingMode={facingMode}
        onUserMediaError={(e) => log('ipv', `onUserMediaError: ${String(e)}`)}
        onExceptionHandlerError={(e) => log('ipv', `onExceptionHandlerError: ${String(e)}`)}
        onEvent={(event) => log('ipv', `event: ${event}`)}
        onCapture={(res) => log('ipv', `captured image (${res.data.image.length} chars)`)}
        debug={false}
      />
      {canSwitch && (
        <button type="button" className="ipv-switch-btn" onClick={toggleFacing} title="Switch camera">
          Switch Camera
        </button>
      )}
    </div>
  );
}

export default IpvPanel;
