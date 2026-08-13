"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { hlsPlaylist } from "@/lib/config";

export default function HlsPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState("Ready — start the WHIP broadcaster first");
  const [error, setError] = useState<string | null>(null);

  const play = useCallback(() => {
    setError(null);
    const video = videoRef.current;
    if (!video) return;
    const src = hlsPlaylist();
    setStatus(`Loading LL-HLS: ${src}`);

    // Safari can play HLS natively; everyone else uses hls.js.
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

    const hls = new Hls({
      lowLatencyMode: true,
      backBufferLength: 10,
    });
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
      <div className="topbar">
        <Link className="back" href="/">
          ← Back
        </Link>
        <span className={`badge ${playing ? "live" : ""}`}>
          {playing ? "● Playing" : "Idle"}
        </span>
      </div>

      <h1 style={{ fontSize: 28, margin: "0 0 8px" }}>LL-HLS Player</h1>
      <p className="lede" style={{ fontSize: 15, marginBottom: 20 }}>
        Plays the buffered Low-Latency HLS stream remuxed by MediaMTX. Start{" "}
        <Link href="/broadcast" style={{ color: "var(--accent-2)" }}>
          /broadcast
        </Link>{" "}
        first. Expect a second or two of buffering latency vs. the raw WebRTC
        path — that&apos;s the trade for a scalable, CDN-friendly egress.
      </p>

      <div className="video-wrap">
        <video ref={videoRef} controls playsInline />
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
      </div>
    </main>
  );
}
