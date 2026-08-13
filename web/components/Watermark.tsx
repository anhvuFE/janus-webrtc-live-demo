"use client";

import { useEffect, useState } from "react";

// Evercast-style visible/forensic watermark: tiled, low-opacity, diagonal text
// carrying the viewer's identity + a live clock, overlaid on the video so any
// screen-capture of the content is traceable. Non-interactive (pointer-events none).
export function Watermark({ label, tiles = 40 }: { label: string; tiles?: number }) {
  const [clock, setClock] = useState("");

  useEffect(() => {
    const update = () => setClock(new Date().toISOString().slice(11, 19));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const text = `${label} · ${clock} UTC`;

  return (
    <div className="watermark" aria-hidden>
      {Array.from({ length: tiles }).map((_, i) => (
        <span key={i}>{text}</span>
      ))}
    </div>
  );
}
