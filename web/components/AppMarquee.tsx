"use client";

import { useEffect, useRef } from "react";

// Two-row strip of real app icons + media thumbnails. The rows slide
// horizontally in OPPOSITE directions as the section scrolls through the
// viewport (scroll-linked, like the hero media wall) — not a fixed auto-loop.

type Item =
  | { type: "app"; icon: string; color: string }
  | { type: "thumb"; img: string };

const ROW1: Item[] = [
  { type: "app", icon: "/apps/figma.svg", color: "#1E1E1E" },
  { type: "app", icon: "/apps/zoom.svg", color: "#2D8CFF" },
  { type: "thumb", img: "/wall/5.jpg" },
  { type: "app", icon: "/apps/chrome.svg", color: "#4285F4" },
  { type: "app", icon: "/apps/blender.svg", color: "#E87D0D" },
  { type: "app", icon: "/apps/resolve.svg", color: "#1A2A3A" },
  { type: "app", icon: "/apps/discord.svg", color: "#5865F2" },
  { type: "thumb", img: "/wall/9.jpg" },
];

const ROW2: Item[] = [
  { type: "thumb", img: "/wall/3.jpg" },
  { type: "app", icon: "/apps/obs.svg", color: "#302E31" },
  { type: "app", icon: "/apps/notion.svg", color: "#111111" },
  { type: "app", icon: "/apps/spotify.svg", color: "#1DB954" },
  { type: "app", icon: "/apps/miro.svg", color: "#050038" },
  { type: "app", icon: "/apps/unreal.svg", color: "#101820" },
  { type: "thumb", img: "/wall/6.jpg" },
  { type: "app", icon: "/apps/meet.svg", color: "#00A67E" },
];

const SHIFT = 320; // px each row travels across the scroll range

function Tile({ item }: { item: Item }) {
  if (item.type === "app") {
    return (
      <div className="ev-marq-app" style={{ background: item.color }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.icon} alt="" />
      </div>
    );
  }
  return (
    <div className="ev-marq-thumb" style={{ backgroundImage: `url(${item.img})` }}>
      <span className="ev-play" />
    </div>
  );
}

function rowTiles(items: Item[]) {
  // Duplicate so the row overflows both sides and stays filled while sliding.
  return [...items, ...items].map((it, i) => <Tile key={i} item={it} />);
}

export function AppMarquee() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const wrap = wrapRef.current;
      if (!wrap || !row1Ref.current || !row2Ref.current) return;
      const vh = window.innerHeight;
      const rect = wrap.getBoundingClientRect();
      // -1 (section below the fold) .. +1 (above it)
      const progress = (vh / 2 - (rect.top + rect.height / 2)) / vh;
      row1Ref.current.style.transform = `translate3d(${-progress * SHIFT}px,0,0)`;
      row2Ref.current.style.transform = `translate3d(${progress * SHIFT}px,0,0)`;
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
    <div className="ev-marquee" ref={wrapRef} aria-hidden>
      <div className="ev-marq-track">
        <div className="ev-marq-row" ref={row1Ref}>
          {rowTiles(ROW1)}
        </div>
      </div>
      <div className="ev-marq-track">
        <div className="ev-marq-row" ref={row2Ref}>
          {rowTiles(ROW2)}
        </div>
      </div>
    </div>
  );
}
