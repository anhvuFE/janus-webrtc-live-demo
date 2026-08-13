"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createSession,
  ensureJanus,
  startPublishing,
} from "@/lib/janus-client";
import type { JanusInstance } from "@/lib/janus-types";

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
      <div className="topbar">
        <Link className="back" href="/">
          ← Back
        </Link>
        <span className={`badge ${live ? "live" : ""}`}>
          {live ? "● Live" : "Offline"}
        </span>
      </div>

      <h1 style={{ fontSize: 28, margin: "0 0 20px" }}>Presenter</h1>

      <div className="video-wrap">
        <video ref={videoRef} autoPlay playsInline muted />
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
