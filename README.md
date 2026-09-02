# IPV ↔ Metered Camera Toggle POC

A mobile-web proof of concept that toggles camera ownership between the
[BFI Image Validation (IPV) Web SDK](https://github.com/bfi-finance/bravo-image-validation-web-sdk)
and a [Metered.ca](https://www.metered.ca) video call, to prove the camera can be
cleanly released and recaptured between the two.

- Metered call (camera + mic) with **PiP + tap-to-swap** between you and the remote participant.
- **Switch to IPV** → Metered `stopVideo()` releases the camera, the IPV SDK captures it as an overlay.
- **Switch to Video** → IPV unmounts (releases its stream), Metered `startVideo()` recaptures.
- While in IPV mode, the remote participant stays visible as a top-right PiP (removed when they leave).

## Prerequisites

- **Node.js** 18+ and **npm**.
- **GitHub Package Registry access** for the IPV SDK
  (`@bfi-finance/bravo-image-validation-web-sdk`). See the
  [SDK's README](https://github.com/bfi-finance/bravo-image-validation-web-sdk#pre-installation)
  for the one-time PAT + registry setup.
- A **Metered account** (free $30 credit on signup — no card required) and a **public room** (see below).
- Camera + microphone. Camera requires a secure context: `http://localhost` on desktop, or HTTPS on a real device.

## Install

```sh
npm install
```

## Configure environment

Copy the example env file and fill in your room:

```sh
cp .env.example .env
```

`.env`:

```dotenv
# Room URL in the format: <your-app>.metered.live/<room-name>
# (https:// prefix is optional and stripped automatically)
VITE_METERED_ROOM_URL=yourapp.metered.live/your-room

# Display name of this participant
VITE_METERED_NAME=POC User
```

## Creating a Metered room

### Option A — Dashboard

1. Log in at https://dashboard.metered.ca.
2. Select your app → **Create Room**.
3. Enter a **Room name** (URL-friendly, unique within the app) and set **Privacy** to **Public**.
4. The room URL is `<your-app>.metered.live/<room-name>`.

### Option B — REST API

```sh
curl --request POST \
  --url 'https://<your-app>.metered.live/api/v1/room?secretKey=<YOUR_SECRET_KEY>' \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{ "roomName": "your-room", "privacy": "public" }'
```

> A **public** room can be joined with just the `roomURL` (no access token, no backend).
> A **private** room requires minting an access token server-side via
> `POST /api/v1/token?secretKey=<key>` and passing it to `join({ accessToken })`.

## Room properties

Key options accepted by `POST /api/v1/room` (and the dashboard):

| Property | Type | Description |
| --- | --- | --- |
| `roomName` | string | URL-friendly, unique per app; auto-generated when omitted |
| `privacy` | `public` \| `private` | Public rooms join with just the URL; private require an access token |
| `autoJoin` | boolean | Enable auto-join |
| `maxParticipants` | integer | Cap the number of participants |
| `expireUnixSec` | integer | Unix timestamp after which users cannot join |
| `ejectAtRoomExp` | boolean | Eject everyone when `expireUnixSec` is reached |
| `ejectAfterElapsedTimeInSec` | integer | Auto-eject each user after N seconds |
| `notBeforeUnixSec` | integer | Users cannot join before this time |
| `enableRequestToJoin` | boolean | Let users request approval to join a private room |
| `ownerOnlyBroadcast` | boolean | Only admins can share camera/mic/screen |
| `audioOnlyRoom` | boolean | Mic only (audio-only pricing) |
| `endMeetingAfterNoActivityInSec` | integer | End the meeting after N seconds of no media |

For the POC, a **public room** is sufficient and requires no backend.

## Run

```sh
npm run dev          # desktop: http://localhost:5173 (secure context, camera works)
npm run dev:mobile   # real device: HTTPS with self-signed cert + LAN IP
```

`dev:mobile` prints a `Network:` URL (e.g. `https://172.x.x.x:5173/`). Open it on your phone
(same Wi-Fi), accept the self-signed cert warning once, then camera/mic work.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server (HTTP) |
| `npm run dev:mobile` | Dev server (HTTPS, host exposed) for real devices |
| `npm run build` | Production build |
| `npm run typecheck` | Type-check only |

## Notes

- **Chrome 143 regression**: toggling the camera on/off within the same Metered session can throw
  `InvalidAccessError … negotiates simulcast but does not negotiate the RID RTP header extension`.
  This POC starts **mic before camera** on join so video becomes the second media section (MID=1),
  which avoids the bug. Reference:
  [mediasoup-client#353](https://github.com/versatica/mediasoup-client/issues/353),
  [Chromium issue](https://issues.chromium.org/issues/467164231).
- **IPV blocks virtual cameras** (emulator webcams, OBS, etc.) — use a real camera for the IPV side.
