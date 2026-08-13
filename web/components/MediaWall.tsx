"use client";

import { useEffect, useRef } from "react";

// Colourful stand-in "media stills" for the curved wall.
const TILES = [
  "linear-gradient(150deg,#f59e0b,#7c2d12)",
  "linear-gradient(150deg,#ef4444,#7f1d1d)",
  "linear-gradient(150deg,#c7c9cc,#4b5563)",
  "linear-gradient(150deg,#f97316,#78350f)",
  "linear-gradient(150deg,#10b981,#064e3b)",
  "linear-gradient(150deg,#0ea5e9,#0c4a6e)",
  "linear-gradient(150deg,#a855f7,#3b0764)",
  "linear-gradient(150deg,#f43f5e,#831843)",
  "linear-gradient(150deg,#eab308,#713f12)",
  "linear-gradient(150deg,#06b6d4,#164e63)",
  "linear-gradient(150deg,#6366f1,#312e81)",
  "linear-gradient(150deg,#84cc16,#365314)",
];

const MAX_ANGLE = 58; // degrees at the far edges
const DEPTH = 190; // px the edges recede
const SHIFT = 420; // px the strip travels across the scroll range

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// A cylindrical media carousel: each tile's Y-rotation is a function of its live
// horizontal position (centre tile faces you, edges angle inward), and the whole
// strip slides horizontally as the section scrolls through the viewport.
export function MediaWall() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const tilesRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let raf = 0;

    const update = () => {
      raf = 0;
      const wrap = wrapRef.current;
      const strip = stripRef.current;
      if (!wrap || !strip) return;

      const vh = window.innerHeight;
      const rect = wrap.getBoundingClientRect();
      // -1 when the wall sits well below the fold, +1 when well above it.
      const progress = (vh / 2 - (rect.top + rect.height / 2)) / vh;
      strip.style.transform = `translate3d(${-progress * SHIFT}px,0,0)`;

      // Curve each tile by its current on-screen x relative to the centre.
      const cx = window.innerWidth / 2;
      const half = window.innerWidth / 2;
      for (const tile of tilesRef.current) {
        if (!tile) continue;
        const r = tile.getBoundingClientRect();
        const delta = clamp((r.left + r.width / 2 - cx) / half, -1, 1);
        const rotY = -delta * MAX_ANGLE;
        const z = -Math.abs(delta) * DEPTH;
        tile.style.transform = `rotateY(${rotY}deg) translateZ(${z}px)`;
        tile.style.opacity = String(clamp(1 - Math.abs(delta) * 0.35, 0.4, 1));
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="ev-gallery" ref={wrapRef} aria-hidden>
      <div className="ev-strip" ref={stripRef}>
        {TILES.map((g, i) => (
          <div
            key={i}
            ref={(el) => {
              tilesRef.current[i] = el;
            }}
            className="ev-tile"
            style={{ background: g }}
          />
        ))}
      </div>
    </div>
  );
}
