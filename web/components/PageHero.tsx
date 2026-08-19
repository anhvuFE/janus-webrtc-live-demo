import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardTitle } from "@heroui/react";

// Line-icon set for the page heroes (inline SVG, no emoji). Add a key here and
// reference it via the `icon` prop.
const ICONS: Record<string, ReactNode> = {
  camera: (
    <>
      <rect x="2.5" y="6.5" width="12" height="11" rx="2.5" />
      <path d="M14.5 10.5l6-3v10l-6-3" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  users: (
    <>
      <path d="M16 19v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V19" />
      <circle cx="9" cy="7" r="3.2" />
      <path d="M16 4.2a3.2 3.2 0 0 1 0 6.1M22 19v-1.5a4 4 0 0 0-3-3.8" />
    </>
  ),
  broadcast: (
    <>
      <circle cx="12" cy="12" r="2.2" />
      <path d="M6.5 6.5a8 8 0 0 0 0 11M17.5 6.5a8 8 0 0 1 0 11" />
      <path d="M3.5 3.5a13 13 0 0 0 0 17M20.5 3.5a13 13 0 0 1 0 17" />
    </>
  ),
  play: (
    <>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
      <path d="M10 9l5 3-5 3z" />
    </>
  ),
  film: (
    <>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
      <path d="M7.5 4.5v15M16.5 4.5v15M2.5 9.5h5M2.5 14.5h5M16.5 9.5h5M16.5 14.5h5" />
    </>
  ),
};

// Shared top-of-page hero: brand icon + eyebrow + title + subtitle, with the
// page's status badge floated to the right. Replaces the old bare page-head.
export function PageHero({
  icon,
  eyebrow,
  title,
  subtitle,
  badge,
}: {
  icon?: keyof typeof ICONS;
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <Card style={{ marginBottom: 28 }}>
      <CardContent>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {icon && (
            <span className="page-hero-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                {ICONS[icon]}
              </svg>
            </span>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            {eyebrow && <span className="page-hero-eyebrow">{eyebrow}</span>}
            <CardTitle>{title}</CardTitle>
            {subtitle && <CardDescription>{subtitle}</CardDescription>}
          </div>
          {badge && (
            <div style={{ flex: "none", alignSelf: "flex-start" }}>{badge}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
