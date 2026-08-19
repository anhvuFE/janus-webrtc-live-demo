// Types + presets for the live video FX pipeline (see lib/video-fx.ts).
// Kept framework-agnostic so /present, /broadcast and /stage can all share it.

export type ColorPreset =
  | "none"
  | "vivid"
  | "warm"
  | "cool"
  | "mono"
  | "sepia"
  | "noir";

export type BackgroundMode = "none" | "blur" | "image";
export type Accessory = "none" | "sunglasses" | "glasses" | "hat" | "mustache";

export interface FxSettings {
  preset: ColorPreset;
  brightness: number; // 0.5–1.5, 1 = neutral
  contrast: number; // 0.5–1.5
  saturate: number; // 0–2
  smooth: number; // 0–1 skin-smoothing (beauty) strength
  background: BackgroundMode;
  backgroundImage?: string; // URL used when background === "image"
  accessory: Accessory;
}

export const DEFAULT_FX: FxSettings = {
  preset: "none",
  brightness: 1,
  contrast: 1,
  saturate: 1,
  smooth: 0,
  background: "none",
  accessory: "none",
};

export const COLOR_PRESETS: { id: ColorPreset; label: string }[] = [
  { id: "none", label: "None" },
  { id: "vivid", label: "Vivid" },
  { id: "warm", label: "Warm" },
  { id: "cool", label: "Cool" },
  { id: "mono", label: "Mono" },
  { id: "sepia", label: "Sepia" },
  { id: "noir", label: "Noir" },
];

export const ACCESSORIES: { id: Accessory; label: string }[] = [
  { id: "none", label: "None" },
  { id: "sunglasses", label: "Sunglasses" },
  { id: "glasses", label: "Glasses" },
  { id: "hat", label: "Party hat" },
  { id: "mustache", label: "Mustache" },
];

// Bundled virtual backgrounds (vendored under /public/fx). Extend freely.
export const BACKGROUNDS: { id: string; label: string; url?: string }[] = [
  { id: "none", label: "None" },
  { id: "blur", label: "Blur" },
  { id: "office", label: "Office", url: "/wall/3.jpg" },
  { id: "studio", label: "Studio", url: "/wall/7.jpg" },
];

// Compose the CSS filter string applied when drawing the camera frame. Beauty
// (skin smoothing) adds a mild blur; the pipeline blends it so edges stay sharp.
export function cssFilter(s: FxSettings): string {
  const parts = [
    `brightness(${s.brightness})`,
    `contrast(${s.contrast})`,
    `saturate(${s.saturate})`,
  ];
  switch (s.preset) {
    case "vivid":
      parts.push("saturate(1.4)", "contrast(1.08)");
      break;
    case "warm":
      parts.push("sepia(0.25)", "saturate(1.2)");
      break;
    case "cool":
      parts.push("hue-rotate(-12deg)", "saturate(1.1)");
      break;
    case "mono":
      parts.push("grayscale(1)");
      break;
    case "sepia":
      parts.push("sepia(0.7)");
      break;
    case "noir":
      parts.push("grayscale(1)", "contrast(1.3)", "brightness(0.95)");
      break;
  }
  return parts.join(" ");
}

/** Does this configuration need the (lazy-loaded) MediaPipe models? */
export function needsSegmentation(s: FxSettings): boolean {
  return s.background !== "none";
}

export function needsFaceLandmarks(s: FxSettings): boolean {
  return s.accessory !== "none";
}
