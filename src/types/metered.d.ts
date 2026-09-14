export {};

export type ChatMessage = {
  _id?: string;
  senderName?: string;
  type?: 'text' | 'file' | 'image';
  content?: string;
  fileName?: string | null;
  fileMimeType?: string | null;
  fileSizeBytes?: number | null;
  downloadToken?: string | null;
};

export type ChatUploadResponse = {
  fileS3Key: string;
  fileName: string;
  fileMimeType: string;
  fileSizeBytes: number;
};

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
        getChatAccessToken(): string;
        sendChatFileMessage(
          fileS3Key: string,
          fileName: string,
          fileMimeType: string,
          fileSizeBytes: number
        ): void;
        on(event: string, handler: (item: unknown) => void): void;
      };
    };
  }
}
