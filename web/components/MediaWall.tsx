"use client";

import { useEffect, useRef } from "react";

// Real photographic stills (vendored in /public/wall) for the curved wall.
const TILES = Array.from({ length: 12 }, (_, i) => `/wall/${i + 1}.jpg`);

// Evercast-style wall: the MIDDLE of the strip bows away (small, flat) while the
// two ends wrap toward the viewer (large, angled hard inward).
const MAX_ANGLE = 74; // steep angle at the far edges
const RECEDE = 220; // px the centre recedes (so it reads smaller)
const SCALE_MIN = 0.82; // centre tile scale …
const SCALE_RANGE = 0.55; // … edges grow to SCALE_MIN + SCALE_RANGE
const CURVE = 1.5; // >1 keeps the centre flat and only bends the outer tiles
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
        const m = Math.abs(delta);
        // Centre recedes (small, flat); the ends wrap forward (large) and angle
        // hard inward. CURVE>1 keeps the middle flat and only bends the outers.
        const rotY = -Math.sign(delta) * MAX_ANGLE * Math.pow(m, CURVE);
        const z = -(1 - m) * RECEDE;
        const scale = SCALE_MIN + m * SCALE_RANGE;
        tile.style.transform = `translateZ(${z}px) rotateY(${rotY}deg) scale(${scale})`;
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
        {TILES.map((src, i) => (
          <div
            key={i}
            ref={(el) => {
              tilesRef.current[i] = el;
            }}
            className="ev-tile"
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}
      </div>
    </div>
  );
}
