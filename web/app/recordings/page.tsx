"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RecordingEntry } from "@/lib/recordings";
import { NotesPanel } from "@/components/NotesPanel";
import { TheaterButton } from "@/components/TheaterButton";
import { Button } from "@heroui/react";
import { AppHeader } from "@/components/AppHeader";
import { PageHero } from "@/components/PageHero";

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function RecordingsPage() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [items, setItems] = useState<RecordingEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // No `selected` dependency: `load` must stay stable so selecting a recording
  // doesn't recreate it and re-fire the fetch effect. Default-select via the
  // functional setState instead.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recordings", { cache: "no-store" });
      const data = (await res.json()) as { recordings: RecordingEntry[] };
      setItems(data.recordings);
      setSelected((prev) => prev ?? data.recordings[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="container">
      <AppHeader />

      <PageHero
        icon="film"
        eyebrow="Archive"
        title="Recordings"
        subtitle={
          <>
            Every{" "}
            <Link href="/broadcast" style={{ color: "var(--accent-2)" }}>
              WHIP broadcast
            </Link>{" "}
            is archived server-side by MediaMTX as fragmented MP4. Files appear
            here once a session ends.
          </>
        }
        badge={
          <Button
            variant="secondary"
            size="sm"
            isDisabled={loading}
            onPress={load}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        }
      />

      {error && <div className="error">{error}</div>}

      {selected && (
        <div className="review-layout" style={{ marginBottom: 20 }}>
          <div>
            <div className="video-wrap" ref={wrapRef}>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                key={selected}
                ref={videoRef}
                controls
                playsInline
                src={`/api/recordings/file?id=${encodeURIComponent(selected)}`}
              />
            </div>
            <div className="controls">
              <TheaterButton targetRef={wrapRef} />
            </div>
          </div>
          <NotesPanel videoRef={videoRef} storageKey={selected} />
        </div>
      )}

      {!loading && items.length === 0 && (
        <p style={{ color: "var(--muted)" }}>
          No recordings yet. Start a broadcast, stop it, then refresh.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelected(r.id)}
            style={{
              textAlign: "left",
              borderColor:
                selected === r.id ? "var(--accent-2)" : "var(--border)",
            }}
          >
            <strong>{r.stream}</strong>{" "}
            <span style={{ color: "var(--muted)", fontWeight: 400 }}>
              · {r.id.split("/").pop()} · {humanSize(r.size)} ·{" "}
              {new Date(r.modified).toLocaleString()}
            </span>
          </button>
        ))}
      </div>
    </main>
  );
}
