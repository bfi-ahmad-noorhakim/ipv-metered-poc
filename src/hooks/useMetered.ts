import { useCallback, useRef, useState } from 'react';
import type { LogSource } from '../types/log';
import type { ChatMessage, ChatUploadResponse } from '../types/metered';

type MeteredMeeting = {
  join(options: { roomURL: string; name: string; accessToken?: string }): Promise<unknown>;
  startVideo(): Promise<void>;
  stopVideo(): Promise<void>;
  startAudio(): Promise<void>;
  stopAudio(): Promise<void>;
  leaveMeeting(): Promise<void>;
  getChatAccessToken(): string;
  sendChatFileMessage(
    fileS3Key: string,
    fileName: string,
    fileMimeType: string,
    fileSizeBytes: number
  ): void;
  on(event: string, handler: (item: unknown) => void): void;
};

type TrackItem = { type?: string; track?: MediaStreamTrack; name?: string };
type ParticipantInfo = { name?: string };

export type RemoteParticipant = { name: string; stream: MediaStream };

export type ChatFile = {
  id: string;
  url: string;
  fileName: string;
  senderName: string;
  local: boolean;
};

const METERED_SDK_URL = 'https://cdn.metered.ca/sdk/video/1.5.0/sdk.min.js';

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
  const hostRef = useRef<string | null>(null);
  const nameRef = useRef<string>('');
  const [joined, setJoined] = useState(false);
  const [videoOn, setVideoOn] = useState(false);
  const [audioOn, setAudioOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remote, setRemote] = useState<RemoteParticipant | null>(null);
  const [files, setFiles] = useState<ChatFile[]>([]);

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

        meeting.on('chatMessageReceived', (item) => {
          const msg = item as ChatMessage;
          log('metered', `chatMessageReceived (${msg.type}) — ${msg.fileName ?? msg.content ?? ''}`);
          if (msg.type !== 'file' && msg.type !== 'image') return;
          if (!msg._id || !msg.downloadToken) return;
          const host = hostRef.current;
          if (!host) return;
          setFiles((prev) => {
            const existing = prev.find(
              (f) => f.fileName === msg.fileName && f.senderName === (msg.senderName ?? '')
            );
            if (existing) return prev;
            return [
              ...prev,
              {
                id: msg._id as string,
                url: `https://${host}/api/v1/chat/file/${msg._id}?dl=${msg.downloadToken}`,
                fileName: msg.fileName ?? 'file',
                senderName: msg.senderName ?? 'Peer',
                local: false
              }
            ];
          });
        });

        meeting.on('chatMessageError', (item) => {
          const err = item as { context?: string; message?: string };
          log('metered', `chatMessageError (${err.context ?? ''}): ${err.message ?? ''}`);
        });

        await meeting.join({ roomURL, name });
        meetingRef.current = meeting;
        hostRef.current = roomURL.includes('/')
          ? new URL(`https://${roomURL}`).host
          : roomURL;
        nameRef.current = name;
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

  const sendFile = useCallback(
    async (file: File) => {
      const meeting = meetingRef.current;
      const host = hostRef.current;
      if (!meeting || !host) {
        log('metered', 'sendFile(): no active meeting');
        return;
      }
      try {
        const token = meeting.getChatAccessToken();
        const res = await fetch(`https://${host}/api/v1/chat/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: (() => {
            const form = new FormData();
            form.append('file', file);
            return form;
          })()
        });
        if (!res.ok) throw new Error(`upload failed: ${res.status} ${res.statusText}`);
        const data = (await res.json()) as ChatUploadResponse;
        meeting.sendChatFileMessage(
          data.fileS3Key,
          data.fileName,
          data.fileMimeType,
          data.fileSizeBytes
        );
        setFiles((prev) => [
          ...prev,
          {
            id: `${data.fileName}-${data.fileSizeBytes}-${Date.now()}`,
            url: URL.createObjectURL(file),
            fileName: data.fileName || file.name,
            senderName: nameRef.current,
            local: true
          }
        ]);
        log('metered', `sendFile(): sent ${data.fileName} (${data.fileSizeBytes} bytes)`);
      } catch (e) {
        log('metered', `sendFile() error: ${String(e)}`);
      }
    },
    [log]
  );

  const clearFiles = useCallback(() => {
    setFiles((prev) => {
      prev.forEach((f) => {
        if (f.local && f.url.startsWith('blob:')) URL.revokeObjectURL(f.url);
      });
      return [];
    });
  }, []);

  return {
    videoRef,
    joined,
    videoOn,
    audioOn,
    error,
    remote,
    files,
    join,
    startVideo,
    stopVideo,
    startAudio,
    stopAudio,
    toggleMic,
    renegTest,
    leave,
    sendFile,
    clearFiles
  };
}
