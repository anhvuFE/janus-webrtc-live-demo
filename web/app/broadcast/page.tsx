"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MEDIAMTX_STREAM, whipEndpoint } from "@/lib/config";
import { whipPublish, type WhipSession } from "@/lib/whip";
import { makeWebrtcOutboundSampler } from "@/lib/hud-samplers";
import { StatsHud } from "@/components/StatsHud";
import { Watermark } from "@/components/Watermark";
import { AppHeader } from "@/components/AppHeader";

type Source = "camera" | "screen";

export default function BroadcastPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<WhipSession | null>(null);

  const [source, setSource] = useState<Source>("camera");
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Ready to ingest via WHIP");
  const [error, setError] = useState<string | null>(null);

  const sampler = useMemo(
    () => makeWebrtcOutboundSampler(() => sessionRef.current?.pc ?? null),
    []
  );

  const goLive = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      setStatus(source === "screen" ? "Pick a window/screen…" : "Requesting camera…");
      // High-quality capture: prefer 1080p60 so the HUD shows real numbers.
      const stream =
        source === "screen"
          ? await navigator.mediaDevices.getDisplayMedia({
              video: { frameRate: { ideal: 60 }, width: { ideal: 1920 } },
              audio: true,
            })
          : await navigator.mediaDevices.getUserMedia({
              video: { frameRate: { ideal: 60 }, width: { ideal: 1920 } },
              audio: true,
            });
      if (videoRef.current) videoRef.current.srcObject = stream;

      // If the user stops sharing from the browser UI, tear down cleanly.
      // Listen on every video track so audio-only/multi-track captures still fire.
      stream
        .getVideoTracks()
        .forEach((t) => t.addEventListener("ended", () => void stop()));

      setStatus(`WHIP ingest → ${whipEndpoint()}`);
      sessionRef.current = await whipPublish(whipEndpoint(), stream);
      setLive(true);
      setStatus(
        `Ingesting "${MEDIAMTX_STREAM}" (${source}) — remuxing to LL-HLS`
      );
    } catch (e) {
      setError(friendlyError(e));
      setStatus("Failed to ingest");
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

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
      <AppHeader
        badge={
          <span className={`badge ${live ? "live" : ""}`}>
            {live ? "● Ingesting" : "Offline"}
          </span>
        }
      />

      <h1 className="page-head">WHIP Broadcaster</h1>
      <p className="lede" style={{ fontSize: 15, marginBottom: 20 }}>
        Presenter-style ingest — push your camera <em>or a screen/app window</em>{" "}
        into MediaMTX over WHIP; it remuxes to Low-Latency HLS. Watch on{" "}
        <Link href="/hls" style={{ color: "var(--accent-2)" }}>
          /hls
        </Link>
        .
      </p>

      {!live && (
        <div className="seg" role="tablist" aria-label="Capture source">
          {(["camera", "screen"] as Source[]).map((s) => (
            <button
              key={s}
              className={`seg-item${source === s ? " active" : ""}`}
              onClick={() => setSource(s)}
            >
              {s === "camera" ? "Camera" : "Screen / App"}
            </button>
          ))}
        </div>
      )}

      <div className="video-wrap">
        <video ref={videoRef} autoPlay playsInline muted />
        {live && <Watermark label={`ingest · ${MEDIAMTX_STREAM}`} />}
        {live && <StatsHud sampler={sampler} />}
      </div>

      <div className="status">
        <span>{status}</span>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="controls">
        {!live ? (
          <button className="primary" onClick={goLive} disabled={busy}>
            {busy ? "Starting…" : `Start ingest (${source})`}
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

function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/failed to fetch/i.test(msg)) {
    return `Can't reach MediaMTX at ${new URL(whipEndpoint()).host}. Is the stack running? (docker compose up)`;
  }
  return msg;
}
