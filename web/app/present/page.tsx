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
import { Button, Chip, Input } from "@heroui/react";
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

  // Drag placed decal stickers around on the preview video.
  const dragId = useRef<string | null>(null);
  const norm = (e: React.PointerEvent) => {
    const r = videoRef.current!.getBoundingClientRect();
    const clamp = (v: number) => Math.max(0, Math.min(1, v));
    return {
      x: clamp((e.clientX - r.left) / r.width),
      y: clamp((e.clientY - r.top) / r.height),
    };
  };
  const onStickerDown = (e: React.PointerEvent) => {
    if (!settings.stickers.length) return;
    const { x, y } = norm(e);
    let best: string | null = null;
    let bd = 0.09;
    for (const s of settings.stickers) {
      const d = Math.hypot(s.x - x, s.y - y);
      if (d < bd) {
        bd = d;
        best = s.id;
      }
    }
    if (best) {
      dragId.current = best;
      videoRef.current?.setPointerCapture(e.pointerId);
    }
  };
  const onStickerMove = (e: React.PointerEvent) => {
    if (!dragId.current) return;
    const { x, y } = norm(e);
    setPresenterFx({
      ...settings,
      stickers: settings.stickers.map((s) =>
        s.id === dragId.current ? { ...s, x, y } : s
      ),
    });
  };
  const onStickerUp = () => {
    dragId.current = null;
  };

  return (
    <main className="container dark">
      <AppHeader />

      <PageHero
        icon="camera"
        eyebrow="Live studio"
        title="Presenter"
        subtitle="Publish your camera to the Janus room — viewers watch on /watch. Your broadcast keeps running if you switch to another tab."
        badge={
          <Chip color={live ? "success" : "default"} variant="soft">
            {live ? "● Live" : "Offline"}
          </Chip>
        }
      />

      <div className="video-wrap">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onPointerDown={onStickerDown}
          onPointerMove={onStickerMove}
          onPointerUp={onStickerUp}
          style={
            settings.stickers.length
              ? { touchAction: "none", cursor: "grab" }
              : undefined
          }
        />
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

      <div
        className="status"
        style={{ display: "flex", alignItems: "center", gap: 10 }}
      >
        <span>{status}</span>
        {recording && (
          <Chip color="danger" variant="soft" size="sm">
            ● Rec
          </Chip>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      <div
        className="controls"
        style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 20 }}
      >
        {!live && (
          <Input
            placeholder="Your name"
            value={displayName}
            maxLength={40}
            onChange={(e) => setDisplayName(e.target.value)}
            style={{ maxWidth: 220 }}
          />
        )}
        {!live ? (
          <Button
            variant="primary"
            size="lg"
            isDisabled={busy}
            onPress={startPresenter}
          >
            {busy ? "Starting…" : "Go live"}
          </Button>
        ) : (
          <Button variant="danger" size="lg" onPress={stopPresenter}>
            Stop streaming
          </Button>
        )}
      </div>

      <FilterPanel settings={settings} onChange={setPresenterFx} />
    </main>
  );
}
