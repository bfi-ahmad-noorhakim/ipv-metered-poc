import { useCallback, useRef, useState } from 'react';
import type { LogSource } from '../types/log';

type MeteredMeeting = {
  join(options: { roomURL: string; name: string; accessToken?: string }): Promise<unknown>;
  startVideo(): Promise<void>;
  stopVideo(): Promise<void>;
  startAudio(): Promise<void>;
  stopAudio(): Promise<void>;
  leaveMeeting(): Promise<void>;
  on(event: string, handler: (item: unknown) => void): void;
};

type TrackItem = { type?: string; track?: MediaStreamTrack; name?: string };
type ParticipantInfo = { name?: string };

export type RemoteParticipant = { name: string; stream: MediaStream };

const METERED_SDK_URL = 'https://cdn.metered.ca/sdk/video/1.4.6/sdk.min.js';

let sdkPromise: Promise<void> | null = null;

function loadSdk(): Promise<void> {
  if (window.Metered) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = METERED_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error('Failed to load Metered SDK from CDN'));
    };
    document.head.appendChild(script);
  });

  return sdkPromise;
}

export function useMetered(log: (source: LogSource, message: string) => void) {
  const meetingRef = useRef<MeteredMeeting | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [joined, setJoined] = useState(false);
  const [videoOn, setVideoOn] = useState(false);
  const [audioOn, setAudioOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remote, setRemote] = useState<RemoteParticipant | null>(null);

  const join = useCallback(
    async (roomURL: string, name: string): Promise<boolean> => {
      try {
        await loadSdk();
        if (!window.Metered) throw new Error('Metered SDK unavailable on window');

        const meeting = new window.Metered.Meeting() as MeteredMeeting;

        meeting.on('localTrackStarted', (item) => {
          const it = item as TrackItem;
          log('metered', `localTrackStarted (${it.type})`);
          if (it.type === 'video' && it.track && videoRef.current) {
            videoRef.current.srcObject = new MediaStream([it.track]);
            videoRef.current.play().catch(() => {});
          }
        });

        meeting.on('localTrackStopped', (item) => {
          const it = item as TrackItem;
          log('metered', `localTrackStopped (${it.type})`);
          if (it.type === 'video' && videoRef.current) {
            videoRef.current.srcObject = null;
          }
        });

        meeting.on('remoteTrackStarted', (item) => {
          const it = item as TrackItem;
          log('metered', `remoteTrackStarted (${it.type}) — ${it.name ?? 'peer'}`);
          if (!it.track) return;
          setRemote((prev) => {
            const stream = prev?.stream ?? new MediaStream();
            stream.addTrack(it.track as MediaStreamTrack);
            return { name: it.name ?? prev?.name ?? 'Peer', stream };
          });
        });

        meeting.on('remoteTrackStopped', (item) => {
          const it = item as TrackItem;
          log('metered', `remoteTrackStopped (${it.type})`);
          if (!it.track) return;
          setRemote((prev) => {
            if (!prev) return prev;
            prev.stream.removeTrack(it.track as MediaStreamTrack);
            if (prev.stream.getTracks().length === 0) return null;
            return { ...prev, stream: prev.stream };
          });
        });

        meeting.on('participantJoined', (item) => {
          const info = item as ParticipantInfo;
          log('metered', `participantJoined — ${info.name ?? ''}`);
        });

        meeting.on('participantLeft', (item) => {
          const info = item as ParticipantInfo;
          log('metered', `participantLeft — ${info.name ?? ''}`);
          setRemote(null);
        });

        await meeting.join({ roomURL, name });
        meetingRef.current = meeting;
        setJoined(true);
        setError(null);
        log('metered', `joined room ${roomURL} — auto-starting mic + camera`);

        // Start audio first so the mic becomes MID=0 and video MID=1.
        // Chrome 143 regression (simulcast/RID) only breaks stop->start
        // renegotiation when the video section is MID=0.
        try {
          await meeting.startAudio();
          setAudioOn(true);
          log('metered', 'startAudio() -> mic acquired');
        } catch (e) {
          setError(String(e));
          log('metered', `startAudio() error: ${String(e)}`);
        }

        try {
          await meeting.startVideo();
          setVideoOn(true);
          log('metered', 'startVideo() -> camera acquired');
        } catch (e) {
          setError(String(e));
          log('metered', `startVideo() error: ${String(e)}`);
        }

        return true;
      } catch (e) {
        setError(String(e));
        log('metered', `join error: ${String(e)}`);
        return false;
      }
    },
    [log]
  );

  const startVideo = useCallback(async () => {
    const meeting = meetingRef.current;
    if (!meeting) return;
    try {
      await meeting.startVideo();
      setVideoOn(true);
      log('metered', 'startVideo() -> camera acquired');
    } catch (e) {
      setError(String(e));
      log('metered', `startVideo() error: ${String(e)}`);
    }
  }, [log]);

  const stopVideo = useCallback(async () => {
    const meeting = meetingRef.current;
    if (!meeting) return;
    try {
      await meeting.stopVideo();
      setVideoOn(false);
      log('metered', 'stopVideo() -> camera released');
    } catch (e) {
      log('metered', `stopVideo() error: ${String(e)}`);
    }
  }, [log]);

  const startAudio = useCallback(async () => {
    const meeting = meetingRef.current;
    if (!meeting) return;
    try {
      await meeting.startAudio();
      setAudioOn(true);
      log('metered', 'startAudio() -> mic acquired');
    } catch (e) {
      setError(String(e));
      log('metered', `startAudio() error: ${String(e)}`);
    }
  }, [log]);

  const stopAudio = useCallback(async () => {
    const meeting = meetingRef.current;
    if (!meeting) return;
    try {
      await meeting.stopAudio();
      setAudioOn(false);
      log('metered', 'stopAudio() -> mic released');
    } catch (e) {
      log('metered', `stopAudio() error: ${String(e)}`);
    }
  }, [log]);

  const renegTest = useCallback(async () => {
    log('metered', 'DIAG start: stopVideo() -> startVideo() (renegotiation test)');
    await stopVideo();
    await startVideo();
    log('metered', 'DIAG end');
  }, [stopVideo, startVideo, log]);

  const toggleMic = useCallback(async () => {
    if (audioOn) await stopAudio();
    else await startAudio();
  }, [audioOn, startAudio, stopAudio]);

  const leave = useCallback(async () => {
    const meeting = meetingRef.current;
    if (!meeting) {
      log('metered', 'leave(): no active meeting');
      return;
    }
    meetingRef.current = null;
    setJoined(false);
    setVideoOn(false);
    setAudioOn(false);
    setRemote(null);

    try {
      await Promise.race([
        Promise.resolve(meeting.leaveMeeting()),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('leaveMeeting timeout')), 3000)
        )
      ]);
      log('metered', 'left meeting');
    } catch (e) {
      log('metered', `leaveMeeting() error: ${String(e)}`);
    }
  }, [log]);

  return {
    videoRef,
    joined,
    videoOn,
    audioOn,
    error,
    remote,
    join,
    startVideo,
    stopVideo,
    startAudio,
    stopAudio,
    toggleMic,
    renegTest,
    leave
  };
}
