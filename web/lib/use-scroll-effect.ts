"use client";

import { RefObject, useEffect } from "react";

// Scroll-linked animation helper shared by the landing-page sections
// (MediaWall, AppMarquee, UseCases). It solves the two things that made those
// effects lag:
//
//  1. Off-screen work — an IntersectionObserver gates the scroll handler so the
//     rAF loop only runs while the section is actually near the viewport.
//     Previously every scroll anywhere on the page re-ran all three effects.
//  2. Uncoalesced work — scroll events are collapsed into a single
//     requestAnimationFrame tick, so we update at most once per frame.
//
// `update()` should only READ layout it needs and WRITE transforms; callers that
// must read element rects should read them all before writing to avoid layout
// thrashing.

export function useScrollEffect(
  wrapRef: RefObject<HTMLElement | null>,
  update: () => void,
  // Called on mount and on resize — cache any layout measurements here so the
  // per-frame update() can stay read-light.
  measure?: () => void,
) {
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    let raf = 0;
    let visible = true;

    const run = () => {
      raf = 0;
      update();
    };
    const onScroll = () => {
      if (visible && !raf) raf = requestAnimationFrame(run);
    };
    const onResize = () => {
      measure?.();
      if (!raf) raf = requestAnimationFrame(run);
    };

    // Only listen to scroll while the section is on/near screen.
    const io = new IntersectionObserver(
      ([entry]) => {
        const wasVisible = visible;
        visible = entry.isIntersecting;
        if (visible && !wasVisible) onScroll();
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(wrap);

    measure?.();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
