"use client";

// Presenter-side recorder for the /stage room. Captures the current spotlight
// video (via a canvas, so switching the spotlight is followed seamlessly) and a
// WebAudio mix of every participant's audio, then uploads the webm to
// /recordings on stop. No-op where MediaRecorder/webm is unsupported.

export interface StageRecorder {
  /** Keep the audio mix in sync with the current participant streams. */
  syncAudio: (streams: MediaStream[]) => void;
  /** Stop and upload (fire-and-forget). */
  stop: () => void;
}

function pickMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? null;
}

async function upload(blob: Blob): Promise<void> {
  try {
    await fetch("/api/recordings/upload?stream=stage", {
      method: "POST",
      headers: { "Content-Type": blob.type || "video/webm" },
      body: blob,
    });
  } catch {
    /* best-effort */
  }
}

export function startStageRecorder(
  getVideo: () => HTMLVideoElement | null
): StageRecorder | null {
  const mime = pickMime();
  if (!mime) return null;

  // --- video: draw the live spotlight into a canvas (letterboxed) ---
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  let raf = 0;
  const draw = () => {
    const v = getVideo();
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (v && v.videoWidth && v.videoHeight) {
      const vr = v.videoWidth / v.videoHeight;
      const cr = canvas.width / canvas.height;
      let w = canvas.width;
      let h = canvas.height;
      if (vr > cr) h = canvas.width / vr;
      else w = canvas.height * vr;
      ctx.drawImage(v, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    }
    raf = requestAnimationFrame(draw);
  };
  draw();

  // --- audio: mix every participant stream down to one track ---
  const ac = new AudioContext();
  void ac.resume();
  const dest = ac.createMediaStreamDestination();
  const sources = new Map<MediaStream, MediaStreamAudioSourceNode>();

  // --- combine + record ---
  const out = new MediaStream();
  canvas.captureStream(30).getVideoTracks().forEach((t) => out.addTrack(t));
  dest.stream.getAudioTracks().forEach((t) => out.addTrack(t));

  const chunks: Blob[] = [];
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(out, { mimeType: mime });
  } catch {
    cancelAnimationFrame(raf);
    void ac.close();
    return null;
  }
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };
  recorder.onstop = () => {
    cancelAnimationFrame(raf);
    sources.forEach((n) => n.disconnect());
    sources.clear();
    void ac.close();
    const blob = new Blob(chunks, { type: mime });
    if (blob.size) void upload(blob);
  };
  recorder.start(1000);

  return {
    syncAudio(streams) {
      const withAudio = streams.filter((s) => s.getAudioTracks().length > 0);
      // add newcomers
      for (const s of withAudio) {
        if (!sources.has(s)) {
          try {
            const node = ac.createMediaStreamSource(s);
            node.connect(dest);
            sources.set(s, node);
          } catch {
            /* stream may have no live audio track yet */
          }
        }
      }
      // drop those that left
      for (const [s, node] of sources) {
        if (!withAudio.includes(s)) {
          node.disconnect();
          sources.delete(s);
        }
      }
    },
    stop() {
      if (recorder.state !== "inactive") recorder.stop();
    },
  };
}
