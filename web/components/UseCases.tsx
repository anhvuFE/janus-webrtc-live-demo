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
    const update = () => {
      raf = 0;
      const wrap = wrapRef.current;
      if (!wrap || !row1Ref.current || !row2Ref.current) return;
      const vh = window.innerHeight;
      const rect = wrap.getBoundingClientRect();
      // 0 as the block enters from the bottom → 1 as its top reaches the top.
      const p = clamp((vh - rect.top) / (vh + rect.height), 0, 1);
      // Top row drifts up + recedes; bottom row rises further + comes forward.
      row1Ref.current.style.transform = `translate3d(0, ${-p * 3}vw, ${-p * 16}vw)`;
      row2Ref.current.style.transform = `translate3d(0, ${-p * 9}vw, ${p * 3}vw)`;
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
