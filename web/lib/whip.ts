// Minimal WHIP (WebRTC-HTTP Ingestion Protocol) publisher.
// Spec: https://datatracker.ietf.org/doc/draft-ietf-wish-whip/
//
// Used to push the local camera/mic straight into MediaMTX, which then remuxes
// the stream to LL-HLS. No Janus involved on this path.

import { iceServers } from "./config";

export interface WhipSession {
  stop: () => Promise<void>;
  /** The live peer connection, for reading getStats() in the Quality HUD. */
  pc: RTCPeerConnection;
}

/**
 * Prefer H264 for the video transceiver.
 *
 * MediaMTX records fragmented MP4 and muxes LL-HLS, both of which only support
 * H264/H265/AV1 video — they silently drop VP8/VP9 (you get audio-only files
 * and audio-only HLS). Chrome offers VP8 first by default, so without this the
 * recordings and the buffered player have no picture. Keep the other codecs as
 * a fallback so publishing still works where H264 send isn't available.
 */
function preferH264(t: RTCRtpTransceiver): void {
  if (t.sender.track?.kind !== "video") return;
  if (typeof t.setCodecPreferences !== "function") return;
  const caps = RTCRtpSender.getCapabilities("video");
  if (!caps) return;
  const isH264 = (c: RTCRtpCodec) => c.mimeType.toLowerCase() === "video/h264";
  const h264 = caps.codecs.filter(isH264);
  if (!h264.length) return;
  const others = caps.codecs.filter((c) => !isH264(c));
  t.setCodecPreferences([...h264, ...others]);
}

/** Wait until ICE gathering finishes (WHIP is non-trickle by default). */
function waitIceGatheringComplete(
  pc: RTCPeerConnection,
  timeoutMs = 3000
): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout>;
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      pc.removeEventListener("icegatheringstatechange", check);
      resolve();
    };
    const check = () => {
      if (pc.iceGatheringState === "complete") done();
    };
    pc.addEventListener("icegatheringstatechange", check);
    // Fallback: don't block forever if a candidate stalls.
    timer = setTimeout(done, timeoutMs);
  });
}

/**
 * Publish a MediaStream to a WHIP endpoint. Returns a session whose stop()
 * sends the WHIP DELETE and closes the peer connection.
 */
export async function whipPublish(
  endpoint: string,
  stream: MediaStream
): Promise<WhipSession> {
  const pc = new RTCPeerConnection({ iceServers: iceServers() });

  // Sendonly: we only push media up to the ingest server.
  stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  pc.getTransceivers().forEach((t) => {
    t.direction = "sendonly";
    preferH264(t);
  });

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitIceGatheringComplete(pc);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/sdp" },
    body: pc.localDescription?.sdp ?? "",
  });

  if (!res.ok) {
    pc.close();
    throw new Error(
      `WHIP ingest failed: ${res.status} ${res.statusText}. ` +
        `Is MediaMTX running on ${new URL(endpoint).host}?`
    );
  }

  const answerSdp = await res.text();
  await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

  // The server returns a resource URL in Location for teardown (WHIP DELETE).
  const location = res.headers.get("Location");
  const resourceUrl = location ? new URL(location, endpoint).toString() : null;

  return {
    pc,
    stop: async () => {
      try {
        if (resourceUrl) await fetch(resourceUrl, { method: "DELETE" });
      } catch {
        /* best-effort teardown */
      }
      stream.getTracks().forEach((t) => t.stop());
      pc.close();
    },
  };
}
