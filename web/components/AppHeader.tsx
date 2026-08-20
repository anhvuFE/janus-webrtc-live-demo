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

// Nav grouped by intent so it's clear which page does what.
// `hint` shows on hover (title) as a one-line purpose.
const NAV_GROUPS: {
  label: string;
  items: { href: string; label: string; hint: string }[];
}[] = [
  {
    label: "Go live",
    items: [
      {
        href: "/present",
        label: "Present",
        hint: "Broadcast your camera to the Janus room — viewers watch on Watch.",
      },
      {
        href: "/broadcast",
        label: "Broadcast",
        hint: "Push your camera into MediaMTX (WHIP) for LL-HLS / WebRTC playback + recording.",
      },
      {
        href: "/stage",
        label: "Stage",
        hint: "Multi-party room — everyone shares camera + chat, YouTube Live-style.",
      },
    ],
  },
  {
    label: "Watch",
    items: [
      {
        href: "/watch",
        label: "Watch",
        hint: "Watch the presenter who is live on Present.",
      },
      {
        href: "/hls",
        label: "HLS",
        hint: "Play the MediaMTX stream: low-latency WebRTC or buffered LL-HLS.",
      },
    ],
  },
  {
    label: "Library",
    items: [
      {
        href: "/recordings",
        label: "Recordings",
        hint: "Browse saved recordings.",
      },
    ],
  },
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
        {NAV_GROUPS.map((group, i) => (
          <div key={group.label} className="app-nav-group">
            {i > 0 && <span className="app-nav-sep" aria-hidden />}
            <span className="app-nav-group-label">{group.label}</span>
            {group.items.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                title={n.hint}
                className={path === n.href ? "active" : ""}
              >
                {n.label}
              </Link>
            ))}
          </div>
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
