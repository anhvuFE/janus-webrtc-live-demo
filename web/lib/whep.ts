// Minimal WHEP (WebRTC-HTTP Egress Protocol) player — the read counterpart of
// whip.ts. Pulls a MediaMTX stream over WebRTC for sub-second latency, from the
// same ingest that also serves LL-HLS + recording.
// Spec: https://datatracker.ietf.org/doc/draft-ietf-wish-whep/

import { iceServers } from "./config";

export interface WhepSession {
  stop: () => Promise<void>;
  /** The live peer connection, for reading getStats(). */
  pc: RTCPeerConnection;
  /** The received media stream — bind it to a <video>. */
  stream: MediaStream;
}

/** Wait until ICE gathering finishes (WHEP is non-trickle by default). */
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
    timer = setTimeout(done, timeoutMs);
  });
}

/**
 * Subscribe to a WHEP endpoint. Returns a session whose stop() sends the WHEP
 * DELETE and closes the peer connection. Tracks are added to `stream` as they
 * arrive, so bind it to a <video> right away.
 */
export async function whepPlay(endpoint: string): Promise<WhepSession> {
  const pc = new RTCPeerConnection({ iceServers: iceServers() });
  const stream = new MediaStream();

  pc.ontrack = (e) => {
    // Avoid duplicate tracks of the same kind on renegotiation.
    stream
      .getTracks()
      .filter((t) => t.kind === e.track.kind && t.id !== e.track.id)
      .forEach((t) => stream.removeTrack(t));
    stream.addTrack(e.track);
  };

  // Recvonly: we only pull media down from the egress server.
  pc.addTransceiver("video", { direction: "recvonly" });
  pc.addTransceiver("audio", { direction: "recvonly" });

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
      `WHEP playback failed: ${res.status} ${res.statusText}. ` +
        `Is the stream live on ${new URL(endpoint).host}? Start /broadcast first.`
    );
  }

  const answerSdp = await res.text();
  await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

  // The server returns a resource URL in Location for teardown (WHEP DELETE).
  const location = res.headers.get("Location");
  const resourceUrl = location ? new URL(location, endpoint).toString() : null;

  return {
    pc,
    stream,
    stop: async () => {
      try {
        if (resourceUrl) await fetch(resourceUrl, { method: "DELETE" });
      } catch {
        /* best-effort teardown */
      }
      pc.close();
    },
  };
}
