"use client";

import { useEffect, useRef } from "react";

const USE_CASES = [
  { img: "/usecases/1.jpg", t: "Live events", d: "Broadcast keynotes to many viewers." },
  { img: "/usecases/2.jpg", t: "Client reviews", d: "Frame-accurate remote approvals." },
  { img: "/usecases/3.jpg", t: "Town halls", d: "All-hands with low latency at scale." },
  { img: "/usecases/4.jpg", t: "Creative sessions", d: "Shoulder-to-shoulder editing remotely." },
  { img: "/usecases/5.jpg", t: "Product demos", d: "Show a screen/app in crisp quality." },
  { img: "/usecases/6.jpg", t: "Remote teaching", d: "Lectures with chat and recording." },
  { img: "/usecases/7.jpg", t: "Watch parties", d: "Synced playback with reactions." },
  { img: "/usecases/8.jpg", t: "Live sports", d: "Multi-cam feeds, minimal delay." },
];

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function Card({ u }: { u: (typeof USE_CASES)[number] }) {
  return (
    <div className="ev-uc">
      <div className="ev-uc-img" style={{ backgroundImage: `url(${u.img})` }} />
      <strong>{u.t}</strong>
      <span>{u.d}</span>
    </div>
  );
}

// Two rows of cards that stack in 3D as the section scrolls through: the top row
// recedes (up + back) while the bottom row rises forward over it. Scroll-linked.
export function UseCases() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const MAX = 8; // matches Evercast's ~7.8 at full entrance

    const update = () => {
      raf = 0;
      const wrap = wrapRef.current;
      if (!wrap || !row1Ref.current || !row2Ref.current) return;
      const vh = window.innerHeight;
      // Base on the (untransformed) wrapper so applying transforms can't feed back.
      const rect = wrap.getBoundingClientRect();
      // 1 while the block is still low on screen → 0 once it has risen into view.
      const base = clamp((rect.top - vh * 0.15) / (vh * 0.65), 0, 1);
      // Each row does translate3d(0, k%, -k vw): drops down + recedes, then settles
      // to 0. The bottom row lags so it rises up over the top row last.
      const k1 = base * MAX;
      const k2 = clamp(base + 0.12, 0, 1) * MAX;
      row1Ref.current.style.transform = `translate3d(0, ${k1}%, ${-k1}vw)`;
      row2Ref.current.style.transform = `translate3d(0, ${k2}%, ${-k2}vw)`;
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
    <div className="ev-usecases" ref={wrapRef}>
      <div className="ev-uc-row" ref={row1Ref}>
        {USE_CASES.slice(0, 4).map((u) => (
          <Card key={u.t} u={u} />
        ))}
      </div>
      <div className="ev-uc-row ev-uc-row-front" ref={row2Ref}>
        {USE_CASES.slice(4).map((u) => (
          <Card key={u.t} u={u} />
        ))}
      </div>
    </div>
  );
}
