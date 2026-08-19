"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";
import {
  getPresenterState,
  stopPresenter,
  subscribePresenter,
} from "@/lib/presenter-session";
import { BrandGlyph } from "@/components/BrandGlyph";

const NAV = [
  { href: "/present", label: "Present" },
  { href: "/watch", label: "Watch" },
  { href: "/stage", label: "Stage" },
  { href: "/broadcast", label: "Broadcast" },
  { href: "/hls", label: "HLS" },
  { href: "/recordings", label: "Recordings" },
];

// Shared top chrome for the app/player pages: brand (home), tool nav, status slot.
export function AppHeader({ badge }: { badge?: ReactNode }) {
  const path = usePathname();
  // Show a live indicator on every page while a broadcast is running, so you can
  // stop it from anywhere (not just the /present page you started it on).
  const { live } = useSyncExternalStore(
    subscribePresenter,
    getPresenterState,
    getPresenterState
  );
  return (
    <header className="app-header">
      <Link href="/" className="app-brand">
        <span className="app-mark">
          <BrandGlyph />
        </span>
        Janus&nbsp;Live
      </Link>
      <nav className="app-nav">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={path === n.href ? "active" : ""}
          >
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="app-header-right">
        {live && (
          <button
            className="present-live-pill"
            onClick={stopPresenter}
            title="Stop your broadcast"
          >
            <i className="tile-dot" />
            Live · Stop
          </button>
        )}
        {badge}
      </div>
    </header>
  );
}
