# Janus WebRTC Live Demo

A minimal, runnable **1-to-many live streaming** demo built on
[Janus Gateway](https://janus.conf.meetecho.com/) (VideoRoom plugin), **WebRTC**,
and **coturn** for STUN/TURN. It's a small, self-contained slice of a larger
streaming platform: a presenter goes live from their camera, and any number of
viewers subscribe and watch in near real time.

```
  Presenter (browser)                 Viewer(s) (browser)
   camera/mic ──WebRTC──┐        ┌──WebRTC── <video>
                        ▼        ▲
                 ┌──────────────────────┐
                 │   Janus VideoRoom     │  ws://localhost:8188
                 │   (media server)      │  http://localhost:8088
                 └──────────┬───────────┘
                            │ ICE (STUN/TURN)
                     ┌──────▼───────┐
                     │   coturn     │  :3478
                     └──────────────┘
```

- **`janus/`** — Janus Gateway Docker image + config (VideoRoom, WebSocket, HTTP).
- **`coturn/`** — coturn STUN/TURN config.
- **`web/`** — Next.js + TypeScript client (`/present` publisher, `/watch` viewer).
- **`docker-compose.yml`** — brings up Janus + coturn.

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

This builds Janus from the Debian package (works on Intel and Apple Silicon)
and starts coturn. Verify Janus is up:

```bash
curl http://localhost:8088/janus/info
```

**2. Start the web client**

```bash
cd web
cp .env.example .env.local     # defaults already point at localhost
npm install
npm run dev
```

Open http://localhost:3000.

**3. Try it**

- Open **`/present`** in one tab → **Go live** (allow camera/mic).
- Open **`/watch`** in another tab (or another browser) → **Watch live**.

The viewer polls the room until a presenter is publishing, then subscribes to
the feed.

---

## How it works

| Piece | Role |
| --- | --- |
| **Janus VideoRoom** | SFU-style room. The presenter joins as a `publisher` and pushes media; viewers join as `subscriber` and pull it. Room `1234` is pre-created in `janus/janus.plugin.videoroom.jcfg`. |
| **janus.js** (vendored in `web/public/`) | Official browser library that speaks the Janus API over WebSocket and manages the `RTCPeerConnection`. |
| **coturn** | STUN/TURN server for ICE. Needed once peers are on different networks/NATs. |
| **Next.js client** | `lib/janus-client.ts` wraps the publish/subscribe flows; `/present` and `/watch` are thin UIs over it. |

## Configuration

Client env vars (`web/.env.local`):

| Var | Default | Meaning |
| --- | --- | --- |
| `NEXT_PUBLIC_JANUS_WS` | `ws://localhost:8188` | Janus WebSocket endpoint |
| `NEXT_PUBLIC_JANUS_ROOM` | `1234` | VideoRoom id |
| `NEXT_PUBLIC_TURN_URL` | _(empty)_ | e.g. `turn:localhost:3478` — enable TURN |
| `NEXT_PUBLIC_TURN_USER` | `januswebrtc` | TURN username |
| `NEXT_PUBLIC_TURN_PASS` | `demo-turn-secret` | TURN credential |

## Networking notes (important)

WebRTC media is UDP and ICE is picky about which IP the server advertises.

- **Local, single machine (default):** `janus/janus.jcfg` sets
  `nat_1_1_mapping = "127.0.0.1"` so ICE uses loopback — presenter, Janus and
  viewer all live on your machine and it "just works" with the published UDP
  port range `10000-10200`.
- **macOS / Docker Desktop:** host networking is limited, so we publish the UDP
  media range explicitly. Single-machine testing works; cross-device on the LAN
  may not.
- **LAN / multiple devices:** set `nat_1_1_mapping` to your host's LAN IP (e.g.
  `192.168.1.x`) in `janus/janus.jcfg`, enable the TURN block there and set
  `NEXT_PUBLIC_TURN_URL` in the client.
- **Linux / production-like:** prefer `network_mode: host` for Janus (see the
  commented block in `docker-compose.yml`) — it removes the Docker NAT hop and
  gives the best media path.

## Security note

This is a **demo**: `admin_secret`, TURN credentials and room settings are
hard-coded and insecure. Rotate/secure everything before any real use, and put
TLS (WSS/HTTPS) in front of Janus.

## Project layout

```
janus-webrtc-live-demo/
├── docker-compose.yml
├── janus/                 # Janus image + config
│   ├── Dockerfile
│   ├── janus.jcfg
│   ├── janus.plugin.videoroom.jcfg
│   ├── janus.transport.websockets.jcfg
│   └── janus.transport.http.jcfg
├── coturn/
│   └── turnserver.conf
└── web/                   # Next.js + TypeScript client
    ├── app/               # /, /present, /watch
    ├── lib/               # janus-client wrapper + config
    └── public/            # vendored janus.js + webrtc-adapter
```

## License

MIT — see [LICENSE](LICENSE).
