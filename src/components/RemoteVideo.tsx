import { useEffect, useRef } from 'react';
import type { RemoteParticipant } from '../hooks/useMetered';

type Variant = 'full' | 'pip' | 'hidden';

type Props = {
  remote: RemoteParticipant;
  variant: Variant;
};

function RemoteVideo({ remote, variant }: Props) {
  const videoEl = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoEl.current) {
      videoEl.current.srcObject = remote.stream;
      videoEl.current.play().catch(() => {});
    }
  }, [remote.stream]);

  return (
    <div className={`tile remote ${variant}`}>
      <video ref={videoEl} autoPlay playsInline />
      <span className="tile-label">{remote.name}</span>
    </div>
  );
}

export default RemoteVideo;
