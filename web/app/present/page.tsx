"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  getPresenterState,
  startPresenter,
  stopPresenter,
  subscribePresenter,
} from "@/lib/presenter-session";
import { AppHeader } from "@/components/AppHeader";

export default function PresentPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  // The session lives outside React (lib/presenter-session) so it survives
  // navigation to another tab — we only mirror its state here.
  const { live, busy, status, error, stream } = useSyncExternalStore(
    subscribePresenter,
    getPresenterState,
    getPresenterState
  );

  // Re-attach the (possibly already-running) stream whenever it changes or when
  // we navigate back to this page. NOTE: intentionally no teardown on unmount —
  // leaving the page keeps the broadcast live; Stop ends it explicitly.
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <main className="container">
      <AppHeader
        badge={
          <span className={`badge ${live ? "live" : ""}`}>
            {live ? "● Live" : "Offline"}
          </span>
        }
      />

      <h1 className="page-head">Presenter</h1>
      <p className="page-sub">
        Publish your camera to the Janus room — viewers watch on /watch. Your
        broadcast keeps running if you switch to another tab.
      </p>

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
      </div>

      {error && <div className="error">{error}</div>}

      <div className="controls">
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
    </main>
  );
}
