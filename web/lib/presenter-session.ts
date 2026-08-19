// Module-level presenter session so a live broadcast survives client-side
// navigation. The Janus publish used to live inside the /present page component
// and was torn down on unmount — so switching to another in-app tab killed the
// stream. Holding it here (outside React) keeps it alive until the user hits
// Stop or the tab is actually closed/reloaded (janus.js destroyOnUnload).

"use client";

import { createSession, ensureJanus, startPublishing } from "./janus-client";
import type { JanusInstance } from "./janus-types";
import { DEFAULT_FX, type FxSettings } from "./fx-presets";
import { VideoFx } from "./video-fx";

export interface PresenterState {
  live: boolean;
  busy: boolean;
  status: string;
  error: string | null;
  stream: MediaStream | null;
  settings: FxSettings;
  recording: boolean;
}

const INITIAL: PresenterState = {
  live: false,
  busy: false,
  status: "Ready to go live",
  error: null,
  stream: null,
  settings: DEFAULT_FX,
  recording: false,
};

let state: PresenterState = INITIAL;
let session: JanusInstance | null = null;
let stopFn: (() => void) | null = null;
// The FX pipeline lives here too so filters survive navigation with the stream.
let fx: VideoFx | null = null;
let rawStream: MediaStream | null = null;
// The FX-processed canvas stream — used for both the local preview and the
// Janus publish, so "Go live" reuses the camera already running in preview.
let processedStream: MediaStream | null = null;
// Presenter-side recording of the published stream (uploaded to /recordings).
let recorder: MediaRecorder | null = null;
let recChunks: Blob[] = [];

const listeners = new Set<() => void>();

// A fresh object each time so useSyncExternalStore detects the change; the same
// reference is returned between emits so getSnapshot stays stable across renders.
function setState(patch: Partial<PresenterState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function getPresenterState(): PresenterState {
  return state;
}

export function subscribePresenter(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Open the camera and start the FX pipeline once; the processed stream is cached
// so preview and Go-live share the same camera. Idempotent.
async function ensureCamera(): Promise<MediaStream> {
  if (processedStream) return processedStream;
  const raw = await navigator.mediaDevices.getUserMedia({
    video: { frameRate: { ideal: 30 }, width: { ideal: 1280 } },
    audio: true,
  });
  rawStream = raw;
  fx = new VideoFx(raw, state.settings, (m) => setState({ error: m }));
  processedStream = await fx.start();
  setState({ stream: processedStream });
  return processedStream;
}

/**
 * Start the local camera preview (with FX) without publishing to Janus, so the
 * presenter can frame the shot and try filters before going live. No-op if the
 * camera is already running (preview or live).
 */
export async function startPreview(): Promise<void> {
  if (processedStream || state.busy) return;
  try {
    await ensureCamera();
    if (!state.live) setState({ status: "Camera ready — go live when set" });
  } catch (e) {
    setState({
      error: e instanceof Error ? e.message : String(e),
      status: "Camera unavailable",
    });
  }
}

/** Stop a preview-only camera. No-op while live (keeps the broadcast running). */
export function stopPreview(): void {
  if (state.live) return;
  teardown();
  setState({ stream: null, status: "Ready to go live" });
}

/** Go live (no-op if already live or mid-connect). Reuses the preview camera. */
export async function startPresenter(): Promise<void> {
  if (state.live || state.busy) return;
  setState({ busy: true, error: null, status: "Requesting camera…" });
  try {
    // Reuse the preview camera/FX if running, otherwise open it now. Publish the
    // processed canvas stream instead of the raw camera.
    const processed = await ensureCamera();
    setState({ status: "Connecting to Janus…" });

    await ensureJanus();
    const s = await createSession();
    session = s;
    stopFn = await startPublishing(
      s,
      `Presenter-${Math.floor(Math.random() * 1000)}`,
      {
        onStatus: (status) => setState({ status }),
        onError: (error) => setState({ error }),
      },
      processed
    );
    setState({ live: true, busy: false });
    startRecording(processed);
  } catch (e) {
    // Roll back any partial session so we don't leak a handle or camera.
    teardown();
    setState({
      busy: false,
      live: false,
      stream: null,
      error: e instanceof Error ? e.message : String(e),
      status: "Failed to go live",
    });
  }
}

/** Stop publishing but keep the local camera preview running. */
export function stopPresenter(): void {
  stopFn?.();
  stopFn = null;
  session?.destroy();
  session = null;
  // Finalise the recording (its onstop uploads it to /recordings).
  stopRecording();
  setState({ live: false, status: "Stopped — preview only" });
}

// ---- presenter-side recording ----

function pickRecMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? null;
}

// Record the published (FX-processed) stream. No-op where MediaRecorder/webm is
// unsupported (e.g. some Safari builds) — the broadcast still runs.
function startRecording(stream: MediaStream): void {
  const mime = pickRecMime();
  if (!mime || recorder) return;
  recChunks = [];
  try {
    recorder = new MediaRecorder(stream, { mimeType: mime });
  } catch {
    recorder = null;
    return;
  }
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size) recChunks.push(e.data);
  };
  recorder.onstop = () => {
    const blob = new Blob(recChunks, { type: mime });
    recChunks = [];
    recorder = null;
    setState({ recording: false });
    if (blob.size) void uploadRecording(blob);
  };
  recorder.start(1000); // flush data every second so long sessions don't buffer
  setState({ recording: true });
}

// Stop and upload (onstop handles the upload).
function stopRecording(): void {
  if (recorder && recorder.state !== "inactive") recorder.stop();
}

// Stop and discard without uploading (used on error rollback / teardown).
function discardRecording(): void {
  if (recorder) {
    recorder.onstop = null;
    try {
      if (recorder.state !== "inactive") recorder.stop();
    } catch {
      /* ignore */
    }
    recorder = null;
  }
  recChunks = [];
  if (state.recording) setState({ recording: false });
}

async function uploadRecording(blob: Blob): Promise<void> {
  setState({ status: "Uploading recording…" });
  try {
    const res = await fetch("/api/recordings/upload?stream=present", {
      method: "POST",
      headers: { "Content-Type": blob.type || "video/webm" },
      body: blob,
    });
    if (!res.ok) throw new Error(`upload failed (${res.status})`);
    setState({ status: "Recording saved — see /recordings" });
  } catch (e) {
    setState({
      error: `Recording upload failed: ${
        e instanceof Error ? e.message : String(e)
      }`,
    });
  }
}

/** Update the live FX settings; pushes into the running pipeline if any. */
export function setPresenterFx(settings: FxSettings): void {
  fx?.update(settings);
  setState({ settings });
}

// Release the Janus session, FX pipeline and camera. Idempotent.
function teardown(): void {
  discardRecording();
  stopFn?.();
  stopFn = null;
  session?.destroy();
  session = null;
  fx?.stop();
  fx = null;
  rawStream?.getTracks().forEach((t) => t.stop());
  rawStream = null;
  processedStream = null;
}
