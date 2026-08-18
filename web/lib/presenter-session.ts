// Module-level presenter session so a live broadcast survives client-side
// navigation. The Janus publish used to live inside the /present page component
// and was torn down on unmount — so switching to another in-app tab killed the
// stream. Holding it here (outside React) keeps it alive until the user hits
// Stop or the tab is actually closed/reloaded (janus.js destroyOnUnload).

"use client";

import { createSession, ensureJanus, startPublishing } from "./janus-client";
import type { JanusInstance } from "./janus-types";

export interface PresenterState {
  live: boolean;
  busy: boolean;
  status: string;
  error: string | null;
  stream: MediaStream | null;
}

const INITIAL: PresenterState = {
  live: false,
  busy: false,
  status: "Ready to go live",
  error: null,
  stream: null,
};

let state: PresenterState = INITIAL;
let session: JanusInstance | null = null;
let stopFn: (() => void) | null = null;

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
  setState({ busy: true, error: null, status: "Connecting to Janus…" });
  try {
    await ensureJanus();
    const s = await createSession();
    session = s;
    stopFn = await startPublishing(
      s,
      `Presenter-${Math.floor(Math.random() * 1000)}`,
      {
        onLocalStream: (stream) => setState({ stream }),
        onStatus: (status) => setState({ status }),
        onError: (error) => setState({ error }),
      }
    );
    setState({ live: true, busy: false });
  } catch (e) {
    // Roll back any partial session so we don't leak a handle.
    stopFn?.();
    stopFn = null;
    session?.destroy();
    session = null;
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
  stopFn?.();
  stopFn = null;
  session?.destroy();
  session = null;
  setState({ live: false, stream: null, status: "Stopped" });
}
