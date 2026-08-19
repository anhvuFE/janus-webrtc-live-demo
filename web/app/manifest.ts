import type { MetadataRoute } from "next";

// PWA manifest — Next injects <link rel="manifest"> automatically.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Janus WebRTC Live Demo",
    short_name: "Janus Live",
    description:
      "1-to-many live streaming with Janus VideoRoom, WebRTC and MediaMTX.",
    start_url: "/",
    display: "standalone",
    background_color: "#070912",
    theme_color: "#070912",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon", type: "image/png", sizes: "180x180" },
    ],
  };
}
