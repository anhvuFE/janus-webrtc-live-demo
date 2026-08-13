// Ambient global augmentation: janus.js and webrtc-adapter are loaded as global
// scripts (see app/layout.tsx), so expose them on `window`.
import type { JanusStatic } from "./janus-types";

declare global {
  interface Window {
    Janus: JanusStatic;
    // webrtc-adapter attaches itself here.
    adapter?: unknown;
  }
}

export {};
