"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MEDIAMTX_STREAM, whipEndpoint } from "@/lib/config";
import { whipPublish, type WhipSession } from "@/lib/whip";
import { makeWebrtcOutboundSampler } from "@/lib/hud-samplers";
import { StatsHud } from "@/components/StatsHud";
import { Watermark } from "@/components/Watermark";
import { Button, Chip } from "@heroui/react";
import { AppHeader } from "@/components/AppHeader";
import { PageHero } from "@/components/PageHero";
import { LiveDot } from "@/components/LiveDot";
import { FilterPanel } from "@/components/FilterPanel";
import { useVideoFx } from "@/lib/use-video-fx";

type Source = "camera" | "screen";

export default function BroadcastPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<WhipSession | null>(null);
  const rawRef = useRef<MediaStream | null>(null);
  const { settings, setSettings, attach, release } = useVideoFx((m) =>
    setError(m)
  );

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
      rawRef.current = stream;

      // Apply the FX pipeline for camera captures (colour, beauty, virtual
      // background, AR accessories). Screen shares publish raw.
      const outgoing =
        source === "camera" ? await attach(stream) : stream;
      if (videoRef.current) videoRef.current.srcObject = outgoing;

      // If the user stops sharing from the browser UI, tear down cleanly.
      // Listen on every video track so audio-only/multi-track captures still fire.
      stream
        .getVideoTracks()
        .forEach((t) => t.addEventListener("ended", () => void stop()));

      setStatus(`WHIP ingest → ${whipEndpoint()}`);
      sessionRef.current = await whipPublish(whipEndpoint(), outgoing);
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
    release();
    rawRef.current?.getTracks().forEach((t) => t.stop());
    rawRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setLive(false);
    setStatus("Stopped");
  }, [release]);

  useEffect(() => {
    return () => {
      void sessionRef.current?.stop();
    };
  }, []);

  return (
    <main className="container">
      <AppHeader />

      <PageHero
        icon="broadcast"
        eyebrow="WHIP ingest"
        title="WHIP Broadcaster"
        subtitle={
          <>
            Presenter-style ingest — push your camera{" "}
            <em>or a screen/app window</em> into MediaMTX over WHIP; it remuxes
            to Low-Latency HLS. Watch on{" "}
            <Link href="/hls" style={{ color: "var(--accent-2)" }}>
              /hls
            </Link>
            .
          </>
        }
        badge={
          <Chip color={live ? "success" : "default"} variant="soft">
            {live ? <><LiveDot />Ingesting</> : "Offline"}
          </Chip>
        }
      />

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
              {source === "screen" ? (
                <>
                  <rect x="2.5" y="4" width="19" height="13" rx="2" />
                  <path d="M8 21h8M12 17.5V21" />
                </>
              ) : (
                <>
                  <rect x="2.5" y="6.5" width="12" height="11" rx="2.5" />
                  <path d="M14.5 10.5l6-3v10l-6-3" />
                </>
              )}
            </svg>
            <strong>
              {source === "screen"
                ? "Share a screen or app window"
                : "Camera preview goes here"}
            </strong>
            <span>Press “Start ingest” to push over WHIP → LL-HLS.</span>
          </div>
        )}
        {live && <Watermark label={`ingest · ${MEDIAMTX_STREAM}`} />}
        {live && <StatsHud sampler={sampler} />}
      </div>

      <div className="status">
        <span>{status}</span>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="controls">
        {!live ? (
          <Button variant="primary" size="lg" isDisabled={busy} onPress={goLive}>
            {busy ? "Starting…" : `Start ingest (${source})`}
          </Button>
        ) : (
          <Button variant="danger" size="lg" onPress={stop}>
            Stop ingest
          </Button>
        )}
      </div>

      {source === "camera" && (
        <FilterPanel settings={settings} onChange={setSettings} />
      )}
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
