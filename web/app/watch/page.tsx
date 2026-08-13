"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createSession,
  ensureJanus,
  startWatching,
} from "@/lib/janus-client";
import type { JanusInstance } from "@/lib/janus-types";
import { Watermark } from "@/components/Watermark";
import { TheaterButton } from "@/components/TheaterButton";
import { AppHeader } from "@/components/AppHeader";
import { viewerTag } from "@/lib/viewer";

export default function WatchPage() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<JanusInstance | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const tag = useMemo(() => viewerTag(), []);

  const [watching, setWatching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Ready to watch");
  const [error, setError] = useState<string | null>(null);

  const join = useCallback(async () => {
    setError(null);
    setBusy(true);
    setStatus("Connecting to Janus…");
    try {
      await ensureJanus();
      const session = await createSession();
      sessionRef.current = session;

      stopRef.current = await startWatching(session, {
        onRemoteStream: (stream) => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        },
        onStatus: setStatus,
        onError: setError,
        onWaiting: () => setStatus("Waiting for a presenter to go live…"),
      });
      setWatching(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("Failed to join");
    } finally {
      setBusy(false);
    }
  }, []);

  const leave = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    sessionRef.current?.destroy();
    sessionRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setWatching(false);
    setStatus("Left the stream");
  }, []);

  useEffect(() => () => leave(), [leave]);

  return (
    <main className="container">
      <AppHeader
        badge={
          <span className={`badge ${watching ? "live" : ""}`}>
            {watching ? "● Watching" : "Idle"}
          </span>
        }
      />

      <h1 className="page-head">Viewer</h1>
      <p className="page-sub">
        Subscribe to the active presenter&apos;s live WebRTC feed.
      </p>

      <div className="video-wrap" ref={wrapRef}>
        <video ref={videoRef} autoPlay playsInline />
        {watching && <Watermark label={tag} />}
      </div>

      <div className="status">
        <span>{status}</span>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="controls">
        {!watching ? (
          <button className="primary" onClick={join} disabled={busy}>
            {busy ? "Joining…" : "Watch live"}
          </button>
        ) : (
          <button className="danger" onClick={leave}>
            Leave
          </button>
        )}
        <TheaterButton targetRef={wrapRef} />
      </div>
    </main>
  );
}
