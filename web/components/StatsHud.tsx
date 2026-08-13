"use client";

import { useEffect, useRef, useState } from "react";
import type { Stat } from "@/lib/hud-samplers";

// Live quality overlay (top-right of a video). Polls a sampler and renders
// whatever labelled stats it returns. Collapsible.
export function StatsHud({
  sampler,
  intervalMs = 1000,
}: {
  sampler: () => Promise<Stat[]> | Stat[];
  intervalMs?: number;
}) {
  const [stats, setStats] = useState<Stat[]>([]);
  const [open, setOpen] = useState(true);
  // Keep the latest sampler in a ref so changing it doesn't resubscribe.
  const samplerRef = useRef(sampler);
  samplerRef.current = sampler;

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const s = await samplerRef.current();
        if (alive) setStats(s);
      } catch {
        /* ignore transient stats errors */
      }
    };
    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [intervalMs]);

  if (!open) {
    return (
      <button className="hud-toggle" onClick={() => setOpen(true)}>
        stats
      </button>
    );
  }

  return (
    <div className="hud">
      <div className="hud-head">
        <span>LIVE STATS</span>
        <button className="hud-x" onClick={() => setOpen(false)} aria-label="Hide">
          ×
        </button>
      </div>
      {stats.length === 0 ? (
        <div className="hud-row">
          <span className="hud-label">waiting…</span>
        </div>
      ) : (
        stats.map((s) => (
          <div className="hud-row" key={s.label}>
            <span className="hud-label">{s.label}</span>
            <span className="hud-val">{s.value}</span>
          </div>
        ))
      )}
    </div>
  );
}
