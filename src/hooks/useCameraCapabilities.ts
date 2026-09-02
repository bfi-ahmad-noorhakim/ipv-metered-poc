import { useCallback, useRef } from 'react';

export type CameraCapability = 'split' | 'single' | 'none';

const IS_MOBILE_RE = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;

function isMobileDevice(): boolean {
  return typeof navigator !== 'undefined' && IS_MOBILE_RE.test(navigator.userAgent);
}

/**
 * Classifies the device's camera situation so the IPV switch can adapt:
 * - 'split'  : mobile with >= 2 cameras -> assume front + back (Metered keeps front, IPV uses back)
 * - 'single' : desktop webcam or a single camera -> must stop/start to share
 * - 'none'   : no camera / no enumerate support
 *
 * Kept intentionally lightweight for the POC: it infers front/back from
 * "mobile + camera count" rather than opening every device to read facingMode,
 * which would conflict with the camera Metered already holds.
 */
export function useCameraCapabilities() {
  const isMobile = useRef(isMobileDevice()).current;

  const detect = useCallback(async (): Promise<CameraCapability> => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return 'none';

      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameraCount = devices.filter((d) => d.kind === 'videoinput').length;

      if (cameraCount === 0) return 'none';
      if (isMobile && cameraCount >= 2) return 'split';
      return 'single';
    } catch {
      return 'none';
    }
  }, [isMobile]);

  return { isMobile, detect };
}
