# AGENTS.md

Vite + React 18 + TypeScript SPA. POC that toggles camera ownership between the BFI IPV SDK and a Metered.ca video call. No tests, no linter, no CI, no build pipeline beyond Vite.

## Verify

```sh
npm run typecheck   # tsc --noEmit (only type gate; run this before claiming done)
npm run build       # vite build -> dist/
```

No test framework exists. There is no `lint` script.

## Run

```sh
npm run dev          # http://localhost:5173 (desktop; camera works on localhost)
npm run dev:mobile   # HTTPS via @vitejs/plugin-basic-ssl (--mode mobile), host exposed for real devices
```

Camera (`getUserMedia`) requires a secure context: localhost on desktop, or the `dev:mobile` self-signed HTTPS URL on a phone.

## Environment

- `.env` (gitignored; copy `.env.example`) provides `VITE_METERED_ROOM_URL` and `VITE_METERED_NAME`.
- Read via `import.meta.env.VITE_*` (see `src/App.tsx`). No other env vars are used.

## Dependencies & SDK quirks

- **Both `@bfi-finance/*` packages are private** (`bravo-image-validation-web-sdk` + `frontend-ui`), installed from the GitHub Package Registry (`npm.pkg.github.com`). `npm install` fails without a per-user PAT + registry auth. There is no `.npmrc` committed; setup is manual (see README).
- **Metered SDK is NOT an npm dep.** It is loaded at runtime from a CDN script tag (`https://cdn.metered.ca/sdk/video/1.5.0/sdk.min.js`) in `src/hooks/useMetered.ts`. Its types are hand-written in `src/types/metered.d.ts` and the local `MeteredMeeting` type in `useMetered.ts`; keep them in sync with the CDN version.
- **Pin the SDK to `1.5.0` or newer.** The in-meeting chat/file methods (`getChatAccessToken`, `sendChatFileMessage`, `chatMessageReceived`, `chatMessageError`) do **not** exist in `1.4.6` — only text `sendChatMessage` does. Metered's own docs/llms.txt still reference `1.4.6`, so don't trust them for the version; `1.5.0` is the version that ships file chat.
- **IPV blocks virtual cameras** (OBS, emulator webcams). Test the IPV side with a real camera.
- **UI is not hand-rolled MUI.** App components come from `@bfi-finance/frontend-ui/components` (`Chips`, `EmptyState`, `Loader`, `Snackbar`, `Typography`); only a thin MUI `ThemeProvider` + `CssBaseline` wraps the app in `src/main.tsx`. Don't reach for raw MUI components to build UI without checking `frontend-ui` first.

## Non-obvious behavior to preserve

- **No React `StrictMode`** in `src/main.tsx` — intentional. It double-invokes effects in dev, which double-mounts/unmounts IPV and muddies the camera acquire/release logs. Do not add it.
- **Mic-before-camera ordering in `join()`** (`src/hooks/useMetered.ts`) is a deliberate Chrome 143 workaround. Starting audio first makes video MID=1, avoiding an `InvalidAccessError` (simulcast/RID) on stop→start renegotiation. Do not reorder `startAudio()`/`startVideo()`.
- **Switch back to Metered** (`App.tsx` `toggleToMetered`) unmounts IPV, then waits a fixed ~200ms before `startVideo()` to let the IPV stream release. Don't remove the delay without a reason.

## Architecture

- `src/App.tsx` — single state machine `mode: 'idle' | 'metered' | 'ipv'`; owns camera-switch orchestration, the metered grid layout, and file-send wiring.
- `src/hooks/useMetered.ts` — all Metered meeting lifecycle (join/start/stop/toggle, remote track handling, `leave` with timeout) plus the chat file upload/send/receive flow (`sendFile`, `files` state).
- `src/components/IpvPanel.tsx` — mounts/unmounts the `<ImageValidationSDK>`; unmount is what releases the IPV camera.
- `src/components/FileOverlay.tsx` — bottom-right overlay of sent/received image files (`ChatFile[]`).
- `src/types/metered.d.ts` + `src/types/log.ts` — global `Window.Metered` typing, the `ChatMessage`/`ChatUploadResponse` shapes, and `LogEntry`/`LogSource`.

## File sharing (Metered in-meeting chat)

- Requires the room to have **`enableChat: true`** (dashboard or Update Room API). Chat/file methods no-op until it's on.
- Flow in `useMetered.ts`: `getChatAccessToken()` → `POST https://<host>/api/v1/chat/upload` (Bearer token, `FormData` `file`) → `sendChatFileMessage(fileS3Key, fileName, fileMimeType, fileSizeBytes)`. Host is derived from the joined `roomURL`.
- Inbound files arrive on the `chatMessageReceived` event (`type: 'file' | 'image'`); download URL is `https://<host>/api/v1/chat/file/<_id>?dl=<downloadToken>`. Errors arrive on `chatMessageError` (logged, not thrown).
- Limits: 10 MB/file, image/allowlisted MIME only, 10 uploads/min. Local previews use `URL.createObjectURL` and are revoked in `clearFiles()`.
