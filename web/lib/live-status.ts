"use client";

import { useEffect, useState } from "react";

export interface LiveStatus {
  broadcast: { live: boolean; publishers: number; display?: string };
  buffered: { live: boolean };
}

/**
 * Poll /api/live-status so a page can show whether a presenter / buffered stream
 * is live before the user joins. Returns null until the first response; keeps
 * the last known value across transient fetch errors.
 */
export function useLiveStatus(intervalMs = 4000): LiveStatus | null {
  const [status, setStatus] = useState<LiveStatus | null>(null);
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch("/api/live-status", { cache: "no-store" });
        if (res.ok && alive) setStatus((await res.json()) as LiveStatus);
      } catch {
        /* keep the last known status */
      }
    };
    void tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [intervalMs]);
  return status;
}
