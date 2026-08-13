"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

// Theater mode: distraction-free fullscreen of the given container element.
export function TheaterButton<T extends HTMLElement>({
  targetRef,
}: {
  targetRef: RefObject<T | null>;
}) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const onChange = () => setActive(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggle = useCallback(() => {
    const el = targetRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen?.();
    }
  }, [targetRef]);

  return (
    <button onClick={toggle}>{active ? "Exit theater" : "Theater mode"}</button>
  );
}
