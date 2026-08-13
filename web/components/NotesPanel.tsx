"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

// Evercast-style creative review: timestamped notes pinned to a video's
// playback position. Click a note to seek. Persisted per-key in localStorage.
interface Note {
  t: number; // seconds into the video
  text: string;
  at: number; // wall-clock created (ms) for ordering ties
}

function fmt(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function NotesPanel({
  videoRef,
  storageKey,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  storageKey: string;
}) {
  const key = `review-notes:${storageKey}`;
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState("");
  // Guards against a single pin creating two notes (React StrictMode double
  // invoke in dev, Enter + click, or IME confirm firing twice).
  const lastAddRef = useRef(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      setNotes(raw ? (JSON.parse(raw) as Note[]) : []);
    } catch {
      setNotes([]);
    }
  }, [key]);

  const persist = useCallback(
    (next: Note[]) => {
      next.sort((a, b) => a.t - b.t || a.at - b.at);
      setNotes(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* storage full / disabled — keep in memory */
      }
    },
    [key]
  );

  const add = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    const now = Date.now();
    if (now - lastAddRef.current < 400) return; // drop rapid duplicate fire
    lastAddRef.current = now;
    const t = videoRef.current?.currentTime ?? 0;
    setNotes((prev) => {
      const next = [...prev, { t, text, at: now }].sort(
        (a, b) => a.t - b.t || a.at - b.at
      );
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* storage full / disabled — keep in memory */
      }
      return next;
    });
    setDraft("");
  }, [draft, key, videoRef]);

  const seek = useCallback(
    (t: number) => {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = t;
      void v.play();
    },
    [videoRef]
  );

  const remove = useCallback(
    (note: Note) => persist(notes.filter((n) => n !== note)),
    [notes, persist]
  );

  return (
    <div className="notes">
      <div className="notes-head">
        <span>REVIEW NOTES</span>
        <span className="notes-count">{notes.length}</span>
      </div>
      <div className="notes-list">
        {notes.length === 0 && (
          <p className="notes-empty">
            Add a note at the current playhead — click a timestamp to jump back.
          </p>
        )}
        {notes.map((n) => (
          <div className="note" key={`${n.t}-${n.at}`}>
            <button className="note-time" onClick={() => seek(n.t)}>
              {fmt(n.t)}
            </button>
            <span className="note-text">{n.text}</span>
            <button
              className="note-del"
              onClick={() => remove(n)}
              aria-label="Delete note"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="notes-input">
        <input
          className="text-input"
          placeholder="Note at current time…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) add();
          }}
        />
        <button className="primary" onClick={add}>
          Pin
        </button>
      </div>
    </div>
  );
}
