// Types + presets for the live video FX pipeline (see lib/video-fx.ts).
// Kept framework-agnostic so /present, /broadcast and /stage can all share it.

export type ColorPreset =
  | "none"
  | "vivid"
  | "warm"
  | "cool"
  | "mono"
  | "sepia"
  | "noir"
  | "cinema"
  | "fade"
  | "retro"
  | "pop"
  | "dreamy"
  | "sunset"
  | "arctic"
  | "clarity"
  | "moody"
  | "candy"
  | "lush"
  | "gold"
  | "cyberpunk";

export type BackgroundMode = "none" | "blur" | "image";
export type Accessory =
  | "none"
  | "sunglasses"
  | "glasses"
  | "hat"
  | "mustache"
  | "crown"
  | "eyepatch"
  | "monocle"
  | "nose";

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
  { id: "cinema", label: "Cinema" },
  { id: "fade", label: "Fade" },
  { id: "retro", label: "Retro" },
  { id: "pop", label: "Pop" },
  { id: "dreamy", label: "Dreamy" },
  { id: "sunset", label: "Sunset" },
  { id: "arctic", label: "Arctic" },
  { id: "clarity", label: "Clarity" },
  { id: "moody", label: "Moody" },
  { id: "candy", label: "Candy" },
  { id: "lush", label: "Lush" },
  { id: "gold", label: "Gold" },
  { id: "cyberpunk", label: "Cyberpunk" },
];

export const ACCESSORIES: { id: Accessory; label: string }[] = [
  { id: "none", label: "None" },
  { id: "sunglasses", label: "Sunglasses" },
  { id: "glasses", label: "Glasses" },
  { id: "hat", label: "Party hat" },
  { id: "mustache", label: "Mustache" },
  { id: "crown", label: "Crown" },
  { id: "eyepatch", label: "Eyepatch" },
  { id: "monocle", label: "Monocle" },
  { id: "nose", label: "Clown nose" },
];

// Bundled virtual backgrounds — real royalty-free photos vendored locally under
// /public/fx so the canvas stays same-origin (no taint → captureStream works
// offline). Extend freely by dropping a JPG in /public/fx and adding a row.
export const BACKGROUNDS: { id: string; label: string; url?: string }[] = [
  { id: "none", label: "None" },
  { id: "blur", label: "Blur" },
  { id: "office", label: "Office", url: "/fx/office.jpg" },
  { id: "cafe", label: "Café", url: "/fx/cafe.jpg" },
  { id: "library", label: "Library", url: "/fx/library.jpg" },
  { id: "beach", label: "Beach", url: "/fx/beach.jpg" },
  { id: "mountain", label: "Mountain", url: "/fx/mountain.jpg" },
  { id: "city", label: "City night", url: "/fx/city-night.jpg" },
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
    case "cinema": // teal-shadow / warm-highlight film look
      parts.push("contrast(1.15)", "saturate(1.2)", "sepia(0.1)");
      break;
    case "fade": // low-contrast matte
      parts.push("contrast(0.9)", "saturate(0.85)", "brightness(1.08)", "sepia(0.08)");
      break;
    case "retro": // faded vintage film
      parts.push("sepia(0.45)", "saturate(1.3)", "contrast(1.05)", "brightness(1.02)");
      break;
    case "pop": // punchy, saturated
      parts.push("saturate(1.6)", "contrast(1.12)");
      break;
    case "dreamy": // soft, airy
      parts.push("brightness(1.1)", "saturate(1.1)", "contrast(0.92)");
      break;
    case "sunset": // warm golden-hour grade
      parts.push("sepia(0.35)", "saturate(1.4)", "hue-rotate(-15deg)", "brightness(1.03)");
      break;
    case "arctic": // cold blue grade
      parts.push("hue-rotate(15deg)", "saturate(1.15)", "brightness(1.05)", "contrast(1.05)");
      break;
    case "clarity": // crisp, clean punch-up
      parts.push("contrast(1.12)", "saturate(1.1)", "brightness(1.03)");
      break;
    case "moody": // dark, desaturated, cool
      parts.push("saturate(0.7)", "contrast(1.15)", "brightness(0.92)", "hue-rotate(5deg)");
      break;
    case "candy": // bright, pastel pop
      parts.push("brightness(1.12)", "saturate(1.35)", "contrast(1.02)");
      break;
    case "lush": // rich greens
      parts.push("saturate(1.3)", "hue-rotate(-6deg)", "contrast(1.05)");
      break;
    case "gold": // warm golden tint
      parts.push("sepia(0.4)", "saturate(1.5)", "brightness(1.05)", "contrast(1.05)");
      break;
    case "cyberpunk": // neon magenta/cyan
      parts.push("hue-rotate(-25deg)", "saturate(1.8)", "contrast(1.2)");
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
