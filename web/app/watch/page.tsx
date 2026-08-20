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
import { Button, Chip } from "@heroui/react";
import { AppHeader } from "@/components/AppHeader";
import { PageHero } from "@/components/PageHero";
import { LiveDot } from "@/components/LiveDot";
import { viewerTag } from "@/lib/viewer";
import { useLiveStatus } from "@/lib/live-status";

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

  // Poll "who's live" so we can tell the viewer a presenter is on before they join.
  const liveStatus = useLiveStatus();
  const presenterLive = liveStatus?.broadcast.live ?? false;
  const presenterName = liveStatus?.broadcast.display?.trim();

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
      <AppHeader />

      <PageHero
        icon="eye"
        eyebrow="Live viewer"
        title="Viewer"
        subtitle="Subscribe to the active presenter's live WebRTC feed."
        badge={
          <Chip
            color={watching || presenterLive ? "success" : "default"}
            variant="soft"
          >
            {watching ? (
              <>
                <LiveDot />Watching
              </>
            ) : presenterLive ? (
              <>
                <LiveDot />
                {presenterName || "Presenter"} live
              </>
            ) : (
              "Idle"
            )}
          </Chip>
        }
      />

      <div className="video-wrap" ref={wrapRef}>
        <video ref={videoRef} autoPlay playsInline />
        {!watching && (
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
              <rect x="2.5" y="4" width="19" height="13" rx="2" />
              <path d="M8 21h8M12 17.5V21" />
            </svg>
            <strong>
              {presenterLive
                ? `${presenterName || "A presenter"} is live`
                : "No stream yet"}
            </strong>
            <span>
              {presenterLive
                ? "Hit “Watch live” to join the WebRTC feed."
                : "Waiting for a presenter to go live…"}
            </span>
          </div>
        )}
        {watching && <Watermark label={tag} />}
      </div>

      <div className="status">
        <span>{status}</span>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="controls">
        {!watching ? (
          <Button variant="primary" size="lg" isDisabled={busy} onPress={join}>
            {busy ? "Joining…" : "Watch live"}
          </Button>
        ) : (
          <Button variant="danger" size="lg" onPress={leave}>
            Leave
          </Button>
        )}
        <TheaterButton targetRef={wrapRef} />
      </div>
    </main>
  );
}
