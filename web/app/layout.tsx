import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Janus WebRTC Live Demo",
  description:
    "1-to-many live streaming with Janus VideoRoom, WebRTC and coturn.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* webrtc-adapter must be available before janus.js initialises. */}
        <Script src="/adapter.min.js" strategy="beforeInteractive" />
        <Script src="/janus.js" strategy="beforeInteractive" />
      </head>
      <body>{children}</body>
    </html>
  );
}
