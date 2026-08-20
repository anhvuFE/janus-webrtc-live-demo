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
  | "cat"
  | "dog"
  | "bunny"
  | "angel"
  | "heart-glasses"
  | "groucho"
  | "beep"
  | "sleep-mask"
  | "crying"
  | "crown"
  | "devil"
  | "stars"
  | "unicorn"
  | "thought"
  | "rainbow"
  | "alien";

export type Frame =
  | "none"
  | "polaroid"
  | "film"
  | "neon"
  | "vhs"
  | "gradient";

export type Effect = "none" | "hearts" | "sparkle" | "neon" | "cartoon";

// Loose decals the user can stamp onto the video and drag to reposition.
export type DecalKind =
  | "heart"
  | "star"
  | "bolt"
  | "fire"
  | "crown"
  | "hundred"
  | "sparkle"
  | "arrow";

export interface PlacedSticker {
  id: string;
  kind: DecalKind;
  x: number; // 0–1 across the frame
  y: number; // 0–1 down the frame
  scale: number; // 1 = default size
}

export const DECALS: { kind: DecalKind; label: string }[] = [
  { kind: "heart", label: "Heart" },
  { kind: "star", label: "Star" },
  { kind: "bolt", label: "Bolt" },
  { kind: "fire", label: "Fire" },
  { kind: "crown", label: "Crown" },
  { kind: "hundred", label: "100" },
  { kind: "sparkle", label: "Sparkle" },
  { kind: "arrow", label: "Arrow" },
];

export interface FxSettings {
  preset: ColorPreset;
  brightness: number; // 0.5–1.5, 1 = neutral
  contrast: number; // 0.5–1.5
  saturate: number; // 0–2
  smooth: number; // 0–1 skin-smoothing (beauty) strength
  background: BackgroundMode;
  backgroundImage?: string; // URL used when background === "image"
  accessory: Accessory;
  frame: Frame;
  effect: Effect;
  stickers: PlacedSticker[];
}

export const DEFAULT_FX: FxSettings = {
  preset: "none",
  brightness: 1,
  contrast: 1,
  saturate: 1,
  smooth: 0,
  background: "none",
  accessory: "none",
  frame: "none",
  effect: "none",
  stickers: [],
};

export const FRAMES: { id: Frame; label: string }[] = [
  { id: "none", label: "None" },
  { id: "polaroid", label: "Polaroid" },
  { id: "film", label: "Film" },
  { id: "neon", label: "Neon" },
  { id: "vhs", label: "VHS" },
  { id: "gradient", label: "Gradient" },
];

export const EFFECTS: { id: Effect; label: string }[] = [
  { id: "none", label: "None" },
  { id: "hearts", label: "Hearts" },
  { id: "sparkle", label: "Sparkle" },
  { id: "neon", label: "Neon" },
  { id: "cartoon", label: "Cartoon" },
];

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

// Face-sticker overlays (Messenger-style PNGs vendored in /public/accessories).
// Each is drawn onto the face anchored to the eye line:
//   width = widthK × interocular distance; the sticker centre is offset dyK × d
//   downward from the eye midpoint (negative = above the head).
export interface AccessoryDef {
  id: Accessory;
  label: string;
  img?: string;
  widthK?: number; // sticker width = widthK × interocular distance
  eyeK?: number; // vertical position of the sticker's eyes (0=top, 1=bottom)
  dyK?: number; // extra fine nudge down the face axis, in units of d
}

export const ACCESSORIES: AccessoryDef[] = [
  { id: "none", label: "None" },
  { id: "cat", label: "Cat", img: "/accessories/cat.png", widthK: 3.1, eyeK: 0.58 },
  { id: "dog", label: "Dog", img: "/accessories/dog.png", widthK: 3.1, eyeK: 0.56 },
  { id: "bunny", label: "Bunny", img: "/accessories/bunny.png", widthK: 2.9, eyeK: 0.62 },
  { id: "angel", label: "Angel", img: "/accessories/angel.png", widthK: 3.4, eyeK: 0.5, dyK: -0.15 },
  { id: "heart-glasses", label: "Heart glasses", img: "/accessories/heart-glasses.png", widthK: 2.4, eyeK: 0.45 },
  { id: "groucho", label: "Disguise", img: "/accessories/groucho.png", widthK: 2.4, eyeK: 0.4 },
  { id: "beep", label: "Goggles", img: "/accessories/beep.png", widthK: 2.5, eyeK: 0.45 },
  { id: "sleep-mask", label: "Sleep mask", img: "/accessories/sleep-mask.png", widthK: 2.5, eyeK: 0.45 },
  { id: "crying", label: "Crying", img: "/accessories/crying.png", widthK: 2.6, eyeK: 0.4 },
  { id: "crown", label: "Crown", img: "/accessories/crown.png", widthK: 2.4, eyeK: 0.5, dyK: -1.05 },
  { id: "devil", label: "Devil", img: "/accessories/devil.png", widthK: 2.8, eyeK: 0.5, dyK: -0.75 },
  { id: "stars", label: "Star eyes", img: "/accessories/stars.png", widthK: 2.6, eyeK: 0.5 },
  { id: "unicorn", label: "Unicorn", img: "/accessories/unicorn.png", widthK: 1.4, eyeK: 0.5, dyK: -1.2 },
  { id: "thought", label: "Thinking", img: "/accessories/thought.png", widthK: 2.4, eyeK: 0.5, dyK: -1.05 },
  { id: "rainbow", label: "Rainbow", img: "/accessories/rainbow.png", widthK: 2.9, eyeK: 0.5, dyK: -1.05 },
  { id: "alien", label: "Alien", img: "/accessories/alien.png", widthK: 2.6, eyeK: 0.5, dyK: -1.05 },
];

const ACCESSORY_BY_ID: Record<string, AccessoryDef> = Object.fromEntries(
  ACCESSORIES.map((a) => [a.id, a])
);

export function accessoryDef(id: Accessory): AccessoryDef | undefined {
  return ACCESSORY_BY_ID[id];
}

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
  // Cartoon effect: flatten to punchy, poster-like colours.
  if (s.effect === "cartoon") {
    parts.push("saturate(1.7)", "contrast(1.45)", "brightness(1.04)");
  }
  return parts.join(" ");
}

/** Does this configuration need the (lazy-loaded) MediaPipe models? */
export function needsSegmentation(s: FxSettings): boolean {
  return s.background !== "none";
}

export function needsFaceLandmarks(s: FxSettings): boolean {
  return (
    s.accessory !== "none" ||
    s.effect === "hearts" ||
    s.effect === "sparkle" ||
    s.effect === "neon"
  );
}
