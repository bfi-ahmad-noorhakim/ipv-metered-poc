import { useEffect } from 'react';
import ImageValidationSDK from '@bfi-finance/bravo-image-validation-web-sdk';
import type { LogSource } from '../types/log';

type Props = {
  log: (source: LogSource, message: string) => void;
  onCameraError?: (error: unknown) => void;
};

function IpvPanel({ log, onCameraError }: Props) {
  useEffect(() => {
    log('ipv', 'IPV panel mounted');
    return () => log('ipv', 'IPV panel unmounted (stream released)');
  }, [log]);

  return (
    <div className="ipv-overlay">
      <ImageValidationSDK
        className="ipv-sdk"
        state="manual"
        facingMode="environment"
        onUserMediaError={(e) => {
          log('ipv', `onUserMediaError: ${String(e)}`);
          onCameraError?.(e);
        }}
        onExceptionHandlerError={(e) => log('ipv', `onExceptionHandlerError: ${String(e)}`)}
        onEvent={(event) => log('ipv', `event: ${event}`)}
        onCapture={(res) => log('ipv', `captured image (${res.data.image.length} chars)`)}
        debug={false}
      />
    </div>
  );
}

export default IpvPanel;
