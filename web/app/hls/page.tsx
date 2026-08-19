"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import { hlsPlaylist, MEDIAMTX_STREAM } from "@/lib/config";
import { makeHlsSampler } from "@/lib/hud-samplers";
import { StatsHud } from "@/components/StatsHud";
import { Watermark } from "@/components/Watermark";
import { TheaterButton } from "@/components/TheaterButton";
import { AppHeader } from "@/components/AppHeader";
import { PageHero } from "@/components/PageHero";
import { viewerTag } from "@/lib/viewer";

export default function HlsPage() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState("Ready — start the WHIP broadcaster first");
  const [error, setError] = useState<string | null>(null);

  const tag = useMemo(() => viewerTag(), []);
  const sampler = useMemo(
    () => makeHlsSampler(() => videoRef.current, () => hlsRef.current),
    []
  );

  const play = useCallback(() => {
    setError(null);
    const video = videoRef.current;
    if (!video) return;
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

  const stop = useCallback(() => {
    hlsRef.current?.destroy();
    hlsRef.current = null;
    if (videoRef.current) {
      videoRef.current.removeAttribute("src");
      videoRef.current.load();
    }
    setPlaying(false);
    setStatus("Stopped");
  }, []);

  useEffect(() => {
    return () => {
      hlsRef.current?.destroy();
    };
  }, []);

  return (
    <main className="container">
      <AppHeader />

      <PageHero
        icon="play"
        eyebrow="Buffered egress"
        title="LL-HLS Player"
        subtitle={
          <>
            Buffered Low-Latency HLS remuxed by MediaMTX. Start{" "}
            <Link href="/broadcast" style={{ color: "var(--accent-2)" }}>
              /broadcast
            </Link>{" "}
            first. Expect a second or two of latency vs. raw WebRTC — the trade
            for a scalable, CDN-friendly egress.
          </>
        }
        badge={
          <span className={`badge ${playing ? "live" : ""}`}>
            {playing ? "● Playing" : "Idle"}
          </span>
        }
      />

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
        {playing && <StatsHud sampler={sampler} />}
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
