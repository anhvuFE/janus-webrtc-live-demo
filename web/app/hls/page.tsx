"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import { hlsPlaylist, MEDIAMTX_STREAM, whepEndpoint } from "@/lib/config";
import { makeHlsSampler } from "@/lib/hud-samplers";
import { whepPlay, type WhepSession } from "@/lib/whep";
import { StatsHud } from "@/components/StatsHud";
import { Watermark } from "@/components/Watermark";
import { TheaterButton } from "@/components/TheaterButton";
import { AppHeader } from "@/components/AppHeader";
import { PageHero } from "@/components/PageHero";
import { viewerTag } from "@/lib/viewer";

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
  const [status, setStatus] = useState("Ready — start the WHIP broadcaster first");
  const [error, setError] = useState<string | null>(null);

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
      setPlaying(true);
      setStatus("Playing (LL-HLS via hls.js)");
    });
    hls.on(Hls.Events.ERROR, (_evt, data) => {
      if (data.fatal) {
        setError(
          `HLS error: ${data.type} / ${data.details}. ` +
            "Make sure the broadcaster is live and MediaMTX is running."
        );
      }
    });
  }, []);

  const playWebrtc = useCallback(async (video: HTMLVideoElement) => {
    setStatus(`Connecting WebRTC (WHEP): ${whepEndpoint()}`);
    try {
      const session = await whepPlay(whepEndpoint());
      whepRef.current = session;
      video.srcObject = session.stream;
      await video.play().catch(() => {});
      setPlaying(true);
      setStatus("Playing (WebRTC / WHEP — sub-second)");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
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
    setStatus("Stopped");
  }, [teardown]);

  useEffect(() => {
    return () => teardown();
  }, [teardown]);

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
          <span className={`badge ${playing ? "live" : ""}`}>
            {playing ? "● Playing" : "Idle"}
          </span>
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
            <strong>Nothing playing yet</strong>
            <span>Start /broadcast first, then press “Play stream”.</span>
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
        {!playing ? (
          <button className="primary" onClick={play}>
            Play stream
          </button>
        ) : (
          <button className="danger" onClick={stop}>
            Stop
          </button>
        )}
        <TheaterButton targetRef={wrapRef} />
      </div>
    </main>
  );
}
