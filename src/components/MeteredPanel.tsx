import type { RefObject } from 'react';

type Variant = 'full' | 'pip' | 'hidden';

type Props = {
  videoRef: RefObject<HTMLVideoElement>;
  variant: Variant;
};

function MeteredPanel({ videoRef, variant }: Props) {
  return (
    <div className={`tile local ${variant}`}>
      <video ref={videoRef} autoPlay muted playsInline />
      <span className="tile-label">You</span>
    </div>
  );
}

export default MeteredPanel;
