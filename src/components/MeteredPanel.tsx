import type { RefObject } from 'react';

type Variant = 'full' | 'pip' | 'hidden';

type Props = {
  videoRef: RefObject<HTMLVideoElement>;
  variant: Variant;
  onSwap?: () => void;
};

function MeteredPanel({ videoRef, variant, onSwap }: Props) {
  return (
    <div className={`tile local ${variant}`} onClick={onSwap}>
      <video ref={videoRef} autoPlay muted playsInline />
      <span className="tile-label">You</span>
    </div>
  );
}

export default MeteredPanel;
