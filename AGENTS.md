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

- **IPV SDK** (`@bfi-finance/bravo-image-validation-web-sdk`) is private, installed from the GitHub Package Registry. It needs a per-user PAT + registry auth — `npm install` fails without it. There is no `.npmrc` committed; setup is manual (see README).
- **Metered SDK is NOT an npm dep.** It is loaded at runtime from a CDN script tag (`https://cdn.metered.ca/sdk/video/1.4.6/sdk.min.js`) in `src/hooks/useMetered.ts`. Its types are hand-written in `src/types/metered.d.ts` and the local `MeteredMeeting` type in `useMetered.ts`; keep them in sync with the CDN version.
- **IPV blocks virtual cameras** (OBS, emulator webcams). Test the IPV side with a real camera.

## Non-obvious behavior to preserve

- **No React `StrictMode`** in `src/main.tsx` — intentional. It double-invokes effects in dev, which double-mounts/unmounts IPV and muddies the camera acquire/release logs. Do not add it.
- **Mic-before-camera ordering in `join()`** (`src/hooks/useMetered.ts`) is a deliberate Chrome 143 workaround. Starting audio first makes video MID=1, avoiding an `InvalidAccessError` (simulcast/RID) on stop→start renegotiation. Do not reorder `startAudio()`/`startVideo()`.
- **Switch back to Metered** (`App.tsx` `toggleToMetered`) unmounts IPV, then waits a fixed ~200ms before `startVideo()` to let the IPV stream release. Don't remove the delay without a reason.

## Architecture

- `src/App.tsx` — single state machine `persona: 'user' | 'admin' | null` then `mode: 'idle' | 'metered' | 'ipv'`; owns all camera-switch orchestration and logging.
- **Persona gating**: app starts at a persona chooser (`src/components/PersonaSelect.tsx`). `user` gets video call + IPV; `admin` gets video call only (no IPV toggle — `showIpv={persona === 'user'}` on `Toolbar`, and `toggleCameraMode` no-ops unless persona is `user`). Persona is in-memory only (resets on reload) and fixed until reload — there is no switch control.
- `src/hooks/useMetered.ts` — all Metered meeting lifecycle (join/start/stop/toggle, remote track handling, `leave` with timeout).
- `src/components/IpvPanel.tsx` — mounts/unmounts the `<ImageValidationSDK>`; unmount is what releases the IPV camera.
- `src/types/metered.d.ts`, `src/types/log.ts`, `src/types/persona.ts` — global `Window.Metered` typing, the `LogEntry`/`LogSource` shapes, and the `Persona` union.

## UI

- Built on `@bfi-finance/frontend-ui` (BFI design system, MUI v5). Import components from `@bfi-finance/frontend-ui/components` and tokens from `@bfi-finance/frontend-ui/foundations` (`Color`, `Spacing`). It ships no font — Inter is loaded via Google Fonts in `index.html`.
- The camera `stage` stays dark; the surrounding chrome is the light design-system theme.
