// Minimal WHIP (WebRTC-HTTP Ingestion Protocol) publisher.
// Spec: https://datatracker.ietf.org/doc/draft-ietf-wish-whip/
//
// Used to push the local camera/mic straight into MediaMTX, which then remuxes
// the stream to LL-HLS. No Janus involved on this path.

import { iceServers } from "./config";

export interface WhipSession {
  stop: () => Promise<void>;
}

/** Wait until ICE gathering finishes (WHIP is non-trickle by default). */
function waitIceGatheringComplete(
  pc: RTCPeerConnection,
  timeoutMs = 3000
): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      pc.removeEventListener("icegatheringstatechange", check);
      resolve();
    };
    const check = () => {
      if (pc.iceGatheringState === "complete") done();
    };
    pc.addEventListener("icegatheringstatechange", check);
    // Fallback: don't block forever if a candidate stalls.
    setTimeout(done, timeoutMs);
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
  pc.getTransceivers().forEach((t) => (t.direction = "sendonly"));

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
