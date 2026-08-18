"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createSession,
  ensureJanus,
  startPublishing,
} from "@/lib/janus-client";
import type { JanusInstance } from "@/lib/janus-types";
import { AppHeader } from "@/components/AppHeader";

export default function PresentPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<JanusInstance | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Ready to go live");
  const [error, setError] = useState<string | null>(null);

  const goLive = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      await ensureJanus();
      setStatus("Connecting to Janus…");
      const session = await createSession();
      sessionRef.current = session;

      stopRef.current = await startPublishing(
        session,
        `Presenter-${Math.floor(Math.random() * 1000)}`,
        {
          onLocalStream: (stream) => {
            if (videoRef.current) videoRef.current.srcObject = stream;
          },
          onStatus: setStatus,
          onError: setError,
        }
      );
      setLive(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("Failed to go live");
    } finally {
      setBusy(false);
    }
  }, []);

  const stop = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    sessionRef.current?.destroy();
    sessionRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setLive(false);
    setStatus("Stopped");
  }, []);

  // Tear down on unmount.
  useEffect(() => () => stop(), [stop]);

  return (
    <main className="container">
      <AppHeader
        badge={
          <span className={`badge ${live ? "live" : ""}`}>
            {live ? "● Live" : "Offline"}
          </span>
        }
      />

      <h1 className="page-head">Presenter</h1>
      <p className="page-sub">
        Publish your camera to the Janus room — viewers watch on /watch.
      </p>

      <div className="video-wrap">
        <video ref={videoRef} autoPlay playsInline muted />
        {!live && (
          <div className="video-placeholder">
            <svg
              className="video-placeholder-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="2.5" y="6.5" width="12" height="11" rx="2.5" />
              <path d="M14.5 10.5l6-3v10l-6-3" />
            </svg>
            <strong>Your camera preview goes here</strong>
            <span>Hit “Go live” to publish to the Janus room — viewers watch on /watch.</span>
          </div>
        )}
      </div>

      <div className="status">
        <span>{status}</span>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="controls">
        {!live ? (
          <button className="primary" onClick={goLive} disabled={busy}>
            {busy ? "Starting…" : "Go live"}
          </button>
        ) : (
          <button className="danger" onClick={stop}>
            Stop streaming
          </button>
        )}
      </div>
    </main>
  );
}
