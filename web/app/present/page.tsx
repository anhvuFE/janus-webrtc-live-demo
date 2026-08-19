"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  getPresenterState,
  setPresenterFx,
  startPresenter,
  startPreview,
  stopPresenter,
  stopPreview,
  subscribePresenter,
} from "@/lib/presenter-session";
import { AppHeader } from "@/components/AppHeader";
import { PageHero } from "@/components/PageHero";
import { FilterPanel } from "@/components/FilterPanel";
import { useDisplayName } from "@/lib/identity";

export default function PresentPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  // The session (and its FX pipeline) lives outside React
  // (lib/presenter-session) so it survives navigation to another tab — we only
  // mirror its state here.
  const [displayName, setDisplayName] = useDisplayName();
  const { live, busy, status, error, stream, settings, recording } =
    useSyncExternalStore(
      subscribePresenter,
      getPresenterState,
      getPresenterState
    );

  // Show the camera preview (with FX) as soon as the page opens, before going
  // live. On leave we release the preview camera — but stopPreview is a no-op
  // while live, so an active broadcast keeps running across navigation.
  useEffect(() => {
    startPreview();
    return () => stopPreview();
  }, []);

  // Re-attach the (possibly already-running) stream whenever it changes or when
  // we navigate back to this page.
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <main className="container">
      <AppHeader />

      <PageHero
        icon="camera"
        eyebrow="Live studio"
        title="Presenter"
        subtitle="Publish your camera to the Janus room — viewers watch on /watch. Your broadcast keeps running if you switch to another tab."
        badge={
          <span className={`badge ${live ? "live" : ""}`}>
            {live ? "● Live" : "Offline"}
          </span>
        }
      />

      <div className="video-wrap">
        <video ref={videoRef} autoPlay playsInline muted />
        {!stream && (
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
              <rect x="2.5" y="6.5" width="12" height="11" rx="2.5" />
              <path d="M14.5 10.5l6-3v10l-6-3" />
            </svg>
            <strong>Your camera preview goes here</strong>
            <span>Hit “Go live” to publish to the Janus room — viewers watch on /watch.</span>
          </div>
        )}
      </div>

      <div className="status">
        <span>{status}</span>
        {recording && <span className="rec-pill">● Rec</span>}
      </div>

      {error && <div className="error">{error}</div>}

      <div className="controls">
        {!live && (
          <input
            className="text-input"
            style={{ maxWidth: 220 }}
            placeholder="Your name"
            value={displayName}
            maxLength={40}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        )}
        {!live ? (
          <button className="primary" onClick={startPresenter} disabled={busy}>
            {busy ? "Starting…" : "Go live"}
          </button>
        ) : (
          <button className="danger" onClick={stopPresenter}>
            Stop streaming
          </button>
        )}
      </div>

      <FilterPanel settings={settings} onChange={setPresenterFx} />
    </main>
  );
}
