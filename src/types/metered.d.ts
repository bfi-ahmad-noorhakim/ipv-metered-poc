export {};

declare global {
  interface Window {
    Metered?: {
      Meeting: new () => {
        join(options: { roomURL: string; name: string; accessToken?: string }): Promise<unknown>;
        startVideo(): Promise<void>;
        stopVideo(): Promise<void>;
        startAudio(): Promise<void>;
        stopAudio(): Promise<void>;
        leaveMeeting(): Promise<void>;
        on(event: string, handler: (item: unknown) => void): void;
      };
    };
  }
}
