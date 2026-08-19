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
}

const INITIAL: PresenterState = {
  live: false,
  busy: false,
  status: "Ready to go live",
  error: null,
  stream: null,
  settings: DEFAULT_FX,
};

let state: PresenterState = INITIAL;
let session: JanusInstance | null = null;
let stopFn: (() => void) | null = null;
// The FX pipeline lives here too so filters survive navigation with the stream.
let fx: VideoFx | null = null;
let rawStream: MediaStream | null = null;

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

/** Go live (no-op if already live or mid-connect). */
export async function startPresenter(): Promise<void> {
  if (state.live || state.busy) return;
  setState({ busy: true, error: null, status: "Requesting camera…" });
  try {
    const raw = await navigator.mediaDevices.getUserMedia({
      video: { frameRate: { ideal: 30 }, width: { ideal: 1280 } },
      audio: true,
    });
    rawStream = raw;

    // Run the raw camera through the FX pipeline and publish the processed
    // canvas stream instead of the camera itself.
    fx = new VideoFx(raw, state.settings, (m) => setState({ error: m }));
    const processed = await fx.start();
    setState({ stream: processed, status: "Connecting to Janus…" });

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

/** Tear down the live broadcast. Safe to call when idle. */
export function stopPresenter(): void {
  teardown();
  setState({ live: false, stream: null, status: "Stopped" });
}

/** Update the live FX settings; pushes into the running pipeline if any. */
export function setPresenterFx(settings: FxSettings): void {
  fx?.update(settings);
  setState({ settings });
}

// Release the Janus session, FX pipeline and camera. Idempotent.
function teardown(): void {
  stopFn?.();
  stopFn = null;
  session?.destroy();
  session = null;
  fx?.stop();
  fx = null;
  rawStream?.getTracks().forEach((t) => t.stop());
  rawStream = null;
}
