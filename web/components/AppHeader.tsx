"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

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
  return (
    <header className="app-header">
      <Link href="/" className="app-brand">
        <span className="app-mark">JW</span>
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
      <div className="app-header-right">{badge}</div>
    </header>
  );
}
