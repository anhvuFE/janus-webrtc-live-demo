"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import { hlsPlaylist, MEDIAMTX_STREAM, whepEndpoint } from "@/lib/config";
import { makeHlsSampler } from "@/lib/hud-samplers";
import { whepPlay, type WhepSession } from "@/lib/whep";
import { Button, Chip } from "@heroui/react";
import { StatsHud } from "@/components/StatsHud";
import { Watermark } from "@/components/Watermark";
import { TheaterButton } from "@/components/TheaterButton";
import { AppHeader } from "@/components/AppHeader";
import { PageHero } from "@/components/PageHero";
import { LiveDot } from "@/components/LiveDot";
import { viewerTag } from "@/lib/viewer";
import { useLiveStatus } from "@/lib/live-status";

// The same MediaMTX ingest is served two ways: buffered LL-HLS (scalable,
// CDN-friendly) and low-latency WebRTC/WHEP (sub-second). One /broadcast, both.
type Mode = "webrtc" | "hls";

export default function HlsPage() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const whepRef = useRef<WhepSession | null>(null);

  const [mode, setMode] = useState<Mode>("webrtc");
  const [playing, setPlaying] = useState(false);
  // "waiting" = the user asked to play but nothing is publishing yet. We keep
  // retrying so playback starts on its own once the broadcast goes live.
  const [waiting, setWaiting] = useState(false);
  const [status, setStatus] = useState("Ready — start the broadcaster, then press Play");
  const [error, setError] = useState<string | null>(null);

  // "Who's live" so the viewer knows the MediaMTX stream is up before playing.
  const streamLive = useLiveStatus()?.buffered.live ?? false;

  const tag = useMemo(() => viewerTag(), []);
  const sampler = useMemo(
    () => makeHlsSampler(() => videoRef.current, () => hlsRef.current),
    []
  );

  // Release whichever egress is active.
  const teardown = useCallback(() => {
    hlsRef.current?.destroy();
    hlsRef.current = null;
    void whepRef.current?.stop();
    whepRef.current = null;
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
      video.removeAttribute("src");
      video.load();
    }
  }, []);

  const playHls = useCallback((video: HTMLVideoElement) => {
    const src = hlsPlaylist();
    setStatus(`Loading LL-HLS: ${src}`);

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      void video.play();
      setPlaying(true);
      setStatus("Playing (native HLS)");
      return;
    }
    if (!Hls.isSupported()) {
      setError("HLS is not supported in this browser.");
      return;
    }
    const hls = new Hls({ lowLatencyMode: true, backBufferLength: 10 });
    hlsRef.current = hls;
    hls.loadSource(src);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      void video.play();
      setWaiting(false);
      setPlaying(true);
      setStatus("Playing (LL-HLS via hls.js)");
    });
    hls.on(Hls.Events.ERROR, (_evt, data) => {
      if (!data.fatal) return;
      // A missing playlist just means nothing is publishing yet — wait for it
      // instead of showing an error.
      const noStreamYet =
        data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
        data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT ||
        data.details === Hls.ErrorDetails.MANIFEST_PARSING_ERROR;
      hls.destroy();
      hlsRef.current = null;
      if (noStreamYet) {
        setWaiting(true);
        setStatus("Waiting for the broadcast to start…");
        return;
      }
      setError(
        `HLS error: ${data.type} / ${data.details}. ` +
          "Make sure the broadcaster is live and MediaMTX is running."
      );
    });
  }, []);

  const playWebrtc = useCallback(async (video: HTMLVideoElement) => {
    setStatus("Connecting (WebRTC / WHEP)…");
    try {
      const session = await whepPlay(whepEndpoint());
      whepRef.current = session;
      video.srcObject = session.stream;
      await video.play().catch(() => {});
      setWaiting(false);
      setPlaying(true);
      setStatus("Playing (WebRTC / WHEP — sub-second)");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // MediaMTX returns 404 while nothing is publishing — that's "no stream
      // yet", not a failure. Wait and connect automatically once it's live.
      if (/\b404\b/.test(msg)) {
        setWaiting(true);
        setStatus("Waiting for the broadcast to start…");
      } else {
        setError(msg);
      }
    }
  }, []);

  const play = useCallback(() => {
    setError(null);
    const video = videoRef.current;
    if (!video) return;
    if (mode === "hls") playHls(video);
    else void playWebrtc(video);
  }, [mode, playHls, playWebrtc]);

  const stop = useCallback(() => {
    teardown();
    setPlaying(false);
    setWaiting(false);
    setStatus("Stopped");
  }, [teardown]);

  const cancelWaiting = useCallback(() => {
    setWaiting(false);
    setStatus("Ready — start the broadcaster, then press Play");
  }, []);

  useEffect(() => {
    return () => teardown();
  }, [teardown]);

  // While waiting for a broadcast, retry quietly so playback starts as soon as
  // the stream is live — no need to come back and press Play again.
  useEffect(() => {
    if (!waiting || playing) return;
    const id = setInterval(() => play(), 3000);
    return () => clearInterval(id);
  }, [waiting, playing, play]);

  const showHud = playing && mode === "hls";

  return (
    <main className="container">
      <AppHeader />

      <PageHero
        icon="play"
        eyebrow="Unified egress"
        title="MediaMTX Player"
        subtitle={
          <>
            One{" "}
            <Link href="/broadcast" style={{ color: "var(--accent-2)" }}>
              /broadcast
            </Link>{" "}
            ingest, two ways to watch: low-latency <strong>WebRTC</strong>{" "}
            (sub-second) or buffered <strong>LL-HLS</strong> (scalable,
            CDN-friendly) — plus server-side recording. Start /broadcast first.
          </>
        }
        badge={
          <Chip
            color={playing || streamLive ? "success" : "default"}
            variant="soft"
          >
            {playing ? (
              <>
                <LiveDot />Playing
              </>
            ) : streamLive ? (
              <>
                <LiveDot />Stream live
              </>
            ) : (
              "Idle"
            )}
          </Chip>
        }
      />

      <div className="seg" role="tablist" aria-label="Playback mode">
        {(["webrtc", "hls"] as Mode[]).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            className={`seg-item${mode === m ? " active" : ""}`}
            disabled={playing}
            onClick={() => setMode(m)}
          >
            {m === "webrtc" ? "Low-latency (WebRTC)" : "Buffered (LL-HLS)"}
          </button>
        ))}
      </div>

      <div className="video-wrap" ref={wrapRef}>
        <video ref={videoRef} controls playsInline />
        {!playing && (
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
              <circle cx="12" cy="12" r="9" />
              <path d="M10 8.5l6 3.5-6 3.5z" />
            </svg>
            <strong>
              {waiting
                ? "Waiting for the broadcast…"
                : streamLive
                ? "Stream is live"
                : "Nothing playing yet"}
            </strong>
            <span>
              {waiting
                ? "Playback starts automatically once you go live in Broadcast."
                : streamLive
                ? "Press “Play stream” to watch."
                : "Go live in Broadcast first — then press “Play stream”."}
            </span>
            {!streamLive && (
              <Link href="/broadcast" target="_blank" className="placeholder-cta">
                Open Broadcast<span aria-hidden> →</span>
              </Link>
            )}
          </div>
        )}
        {playing && <Watermark label={`${tag} · ${MEDIAMTX_STREAM}`} />}
        {showHud && <StatsHud sampler={sampler} />}
      </div>

      <div className="status">
        <span>{status}</span>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="controls">
        {playing ? (
          <Button variant="danger" size="lg" onPress={stop}>
            Stop
          </Button>
        ) : waiting ? (
          <Button variant="secondary" size="lg" onPress={cancelWaiting}>
            Cancel
          </Button>
        ) : (
          <Button variant="primary" size="lg" onPress={play}>
            Play stream
          </Button>
        )}
        <TheaterButton targetRef={wrapRef} />
      </div>
    </main>
  );
}
