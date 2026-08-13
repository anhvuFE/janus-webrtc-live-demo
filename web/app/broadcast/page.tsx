"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { MEDIAMTX_STREAM, whipEndpoint } from "@/lib/config";
import { whipPublish, type WhipSession } from "@/lib/whip";

export default function BroadcastPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<WhipSession | null>(null);

  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Ready to ingest via WHIP");
  const [error, setError] = useState<string | null>(null);

  const goLive = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      setStatus("Requesting camera…");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (videoRef.current) videoRef.current.srcObject = stream;

      setStatus(`WHIP ingest → ${whipEndpoint()}`);
      sessionRef.current = await whipPublish(whipEndpoint(), stream);
      setLive(true);
      setStatus(`Ingesting stream "${MEDIAMTX_STREAM}" — remuxing to LL-HLS`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("Failed to ingest");
    } finally {
      setBusy(false);
    }
  }, []);

  const stop = useCallback(async () => {
    await sessionRef.current?.stop();
    sessionRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setLive(false);
    setStatus("Stopped");
  }, []);

  useEffect(() => {
    return () => {
      void sessionRef.current?.stop();
    };
  }, []);

  return (
    <main className="container">
      <div className="topbar">
        <Link className="back" href="/">
          ← Back
        </Link>
        <span className={`badge ${live ? "live" : ""}`}>
          {live ? "● Ingesting" : "Offline"}
        </span>
      </div>

      <h1 style={{ fontSize: 28, margin: "0 0 8px" }}>WHIP Broadcaster</h1>
      <p className="lede" style={{ fontSize: 15, marginBottom: 20 }}>
        Pushes your camera straight into MediaMTX over WebRTC (WHIP). MediaMTX
        remuxes it to Low-Latency HLS — open{" "}
        <Link href="/hls" style={{ color: "var(--accent-2)" }}>
          /hls
        </Link>{" "}
        to watch the buffered playback.
      </p>

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
            {busy ? "Starting…" : "Start ingest"}
          </button>
        ) : (
          <button className="danger" onClick={stop}>
            Stop ingest
          </button>
        )}
      </div>
    </main>
  );
}
