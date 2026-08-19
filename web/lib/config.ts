// Runtime configuration, read from NEXT_PUBLIC_* env vars with sane defaults
// so the demo works out-of-the-box against the docker-compose stack.

export const JANUS_WS =
  process.env.NEXT_PUBLIC_JANUS_WS ?? "ws://localhost:8188";

export const JANUS_ROOM = Number(
  process.env.NEXT_PUBLIC_JANUS_ROOM ?? "1234"
);

// --- Buffered path (MediaMTX WHIP ingest -> LL-HLS egress) ---

// Stream name/path shared by the WHIP publisher and the HLS viewer.
export const MEDIAMTX_STREAM =
  process.env.NEXT_PUBLIC_MEDIAMTX_STREAM ?? "live";

const MEDIAMTX_WHIP_BASE =
  process.env.NEXT_PUBLIC_MEDIAMTX_WHIP_BASE ?? "http://localhost:8889";
const MEDIAMTX_HLS_BASE =
  process.env.NEXT_PUBLIC_MEDIAMTX_HLS_BASE ?? "http://localhost:8888";

/** WHIP ingest endpoint for the configured stream. */
export const whipEndpoint = () =>
  `${MEDIAMTX_WHIP_BASE}/${MEDIAMTX_STREAM}/whip`;

/**
 * WHEP playback endpoint — MediaMTX serves the SAME stream over WebRTC for
 * sub-second latency, alongside the buffered LL-HLS egress and recording.
 */
export const whepEndpoint = () =>
  `${MEDIAMTX_WHIP_BASE}/${MEDIAMTX_STREAM}/whep`;

/** LL-HLS playlist URL for the configured stream. */
export const hlsPlaylist = () =>
  `${MEDIAMTX_HLS_BASE}/${MEDIAMTX_STREAM}/index.m3u8`;

const TURN_URL = process.env.NEXT_PUBLIC_TURN_URL ?? "";
const TURN_USER = process.env.NEXT_PUBLIC_TURN_USER ?? "";
const TURN_PASS = process.env.NEXT_PUBLIC_TURN_PASS ?? "";

// ICE servers handed to janus.js. Always include a public STUN server; add the
// configured TURN server only when NEXT_PUBLIC_TURN_URL is set.
export function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
  ];
  if (TURN_URL) {
    servers.push({
      urls: TURN_URL,
      username: TURN_USER,
      credential: TURN_PASS,
    });
  }
  return servers;
}
