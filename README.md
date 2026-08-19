# Janus WebRTC Live Demo

A minimal, runnable slice of a live-streaming platform showing **two egress
paths** side by side:

- **Low-latency path** — [Janus Gateway](https://janus.conf.meetecho.com/)
  VideoRoom over **WebRTC**: sub-second 1-to-many live and a multi-presenter
  stage with data-channel chat.
- **Buffered path** — [MediaMTX](https://github.com/bluenviron/mediamtx)
  **WHIP** ingest remuxed to **Low-Latency HLS**, plus server-side recording.

```
  ── Low-latency (Janus) ─────────────────────────────────────────
  Presenter ─WebRTC─▶ ┌───────────────┐ ─WebRTC─▶ Viewer(s)
                      │ Janus         │            /watch, /stage
   /present, /stage   │ VideoRoom +   │
                      │ TextRoom chat │  ws://:8188  http://:8088
                      └───────┬───────┘
                              │ ICE (STUN/TURN)
                        ┌─────▼─────┐
                        │  coturn   │ :3478
                        └───────────┘

  ── Buffered (MediaMTX) ─────────────────────────────────────────
  Broadcaster ─WHIP─▶ ┌───────────────┐ ─LL-HLS─▶ Player  /hls
    /broadcast        │  MediaMTX     │  http://:8888
                      │  remux+record │
                      └───────┬───────┘
                              │ fMP4
                        ┌─────▼──────┐
                        │ recordings │ ──▶ /recordings
                        └────────────┘
```

## Pages

| Route | Path | What it does |
| --- | --- | --- |
| `/present` | Janus | Publish your camera to the Janus room (1-to-many). |
| `/watch` | Janus | Subscribe to the active presenter's live WebRTC feed. |
| `/stage` | Janus | Multi-presenter grid (VideoRoom multistream) + live chat (TextRoom). |
| `/broadcast` | MediaMTX | Ingest your camera via WHIP; MediaMTX remuxes to LL-HLS. |
| `/hls` | MediaMTX | Play the buffered Low-Latency HLS stream (hls.js). |
| `/recordings` | MediaMTX | Browse & play sessions recorded server-side as fMP4. |

## Layout

```
janus-webrtc-live-demo/
├── docker-compose.yml       # janus + coturn + mediamtx
├── janus/                   # Janus image + config
│   ├── Dockerfile
│   ├── janus.jcfg
│   ├── janus.plugin.videoroom.jcfg
│   ├── janus.plugin.textroom.jcfg
│   └── janus.transport.{websockets,http}.jcfg
├── coturn/turnserver.conf
├── mediamtx/mediamtx.yml     # WHIP ingest + LL-HLS + recording
├── recordings/              # fMP4 recordings land here (gitignored)
└── web/                     # Next.js + TypeScript client
    ├── app/                 # /, /present, /watch, /stage, /broadcast, /hls, /recordings, /api
    ├── lib/                 # janus-client, stage-client, textroom, whip, config, recordings
    └── public/              # vendored janus.js + webrtc-adapter
```

---

## Prerequisites

- Docker + Docker Compose
- Node.js 18+ (Node 22 recommended)
- A browser with camera/mic access (Chrome/Edge/Safari)

## Quick start

**1. Start the media infrastructure**

```bash
docker compose up --build
```

Builds Janus (works on Intel and Apple Silicon) and starts coturn + MediaMTX.
Quick health checks:

```bash
curl http://localhost:8088/janus/info          # Janus
curl -I http://localhost:8888/live/index.m3u8   # MediaMTX HLS (302 until a stream exists)
```

**2. Start the web client**

```bash
cd web
cp .env.example .env.local     # defaults already point at localhost
npm install
npm run dev
```

Open http://localhost:3000.

**3. Try each path**

- **Low-latency:** `/present` (Go live) in one tab, `/watch` in another.
- **Multi-presenter:** open `/stage` in several tabs, join with different names,
  chat in the sidebar.
- **Buffered + recording:** `/broadcast` (Start ingest), watch on `/hls`, stop,
  then find the file under `/recordings`.

---

## Ports

| Port | Service | Purpose |
| --- | --- | --- |
| 8088 | Janus | HTTP API |
| 8188 | Janus | WebSocket API (client) |
| 10000–10200/udp | Janus | RTP/RTCP media |
| 3478 (+udp) | coturn | STUN/TURN |
| 49160–49200/udp | coturn | TURN relay range |
| 8888 | MediaMTX | LL-HLS egress |
| 8889 | MediaMTX | WHIP ingest (signaling) |
| 8189/udp | MediaMTX | WebRTC ICE media (mux) |

## Configuration

Client env vars (`web/.env.local`):

| Var | Default | Meaning |
| --- | --- | --- |
| `NEXT_PUBLIC_JANUS_WS` | `ws://localhost:8188` | Janus WebSocket endpoint |
| `NEXT_PUBLIC_JANUS_ROOM` | `1234` | VideoRoom / TextRoom id |
| `NEXT_PUBLIC_TURN_URL` | _(empty)_ | e.g. `turn:localhost:3478` — enable TURN |
| `NEXT_PUBLIC_TURN_USER` / `_PASS` | `januswebrtc` / `demo-turn-secret` | TURN creds |
| `NEXT_PUBLIC_MEDIAMTX_STREAM` | `live` | Stream name shared by WHIP + HLS |
| `NEXT_PUBLIC_MEDIAMTX_WHIP_BASE` | `http://localhost:8889` | WHIP ingest base |
| `NEXT_PUBLIC_MEDIAMTX_HLS_BASE` | `http://localhost:8888` | HLS egress base |
| `RECORDINGS_DIR` (server) | `../recordings` | Where the API reads recordings |

## Recordings

Two sources land in the same `/recordings` browser:

- **Buffered path:** MediaMTX records every WHIP broadcast to
  `recordings/<stream>/<timestamp>.mp4` (fragmented MP4, directly playable).
  Disable or auto-prune via `record` / `recordDeleteAfter` in `mediamtx/mediamtx.yml`.
- **WebRTC path:** the `/present` broadcast is captured presenter-side with
  `MediaRecorder` and uploaded on Stop to `recordings/present/<timestamp>.webm`
  via `POST /api/recordings/upload`.

The Next.js API (`/api/recordings`) lists both `.mp4` and `.webm` and streams
them with HTTP Range support to the `/recordings` player.

## Networking notes

WebRTC media is UDP and ICE is picky about the advertised IP.

- **Local, single machine (default):** Janus advertises `127.0.0.1`
  (`nat_1_1_mapping`) and MediaMTX advertises `127.0.0.1`
  (`webrtcAdditionalHosts`) — everything works on loopback with the published
  UDP ports.
- **macOS / Docker Desktop:** host networking is limited, so UDP ports are
  published explicitly. Single-machine testing works; cross-device on the LAN
  may not.
- **LAN / multiple devices:** set `nat_1_1_mapping` (Janus) and add your LAN IP
  to `webrtcAdditionalHosts` (MediaMTX), enable the coturn TURN block and set
  `NEXT_PUBLIC_TURN_URL`.
- **Linux / production-like:** prefer `network_mode: host` for Janus.

## Security note

This is a **demo**: `admin_secret`, TURN credentials, open MediaMTX paths and
room settings are hard-coded and insecure. Rotate/secure everything and put TLS
(WSS/HTTPS) in front before any real use.

## License

MIT — see [LICENSE](LICENSE).
