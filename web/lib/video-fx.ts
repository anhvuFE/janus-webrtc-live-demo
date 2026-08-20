// Real-time video FX pipeline for the live streaming pages.
//
// Pipeline: source camera MediaStream -> hidden <video> -> per-frame canvas
// render (colour grade, skin smoothing, virtual background, AR face accessories)
// -> canvas.captureStream() -> published in place of the raw camera.
//
// Colour/beauty are pure-canvas and always available. Background and accessories
// lazy-load MediaPipe Tasks Vision (WASM) only when switched on, so the base
// bundle stays small and the pipeline degrades gracefully if models fail.

"use client";

import type {
  FaceLandmarker,
  ImageSegmenter,
} from "@mediapipe/tasks-vision";
import {
  accessoryDef,
  cssFilter,
  needsFaceLandmarks,
  needsSegmentation,
  type FxSettings,
} from "./fx-presets";

const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const SEG_MODEL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";
const FACE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";

// FaceMesh eye-corner landmarks — accessories are anchored to the eye line.
const L_EYE = 33; // subject's right eye outer corner (image-left)
const R_EYE = 263; // subject's left eye outer corner (image-right)

// FaceMesh face-oval ring (used by the neon effect to trace the face outline).
const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378,
  400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21,
  54, 103, 67, 109,
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // frames remaining
  max: number;
  size: number;
  rot: number;
}

// MediaPipe's TFLite WASM prints benign INFO lines (e.g. "INFO: Created
// TensorFlow Lite XNNPACK delegate for CPU.") through console.error, which trips
// the Next.js dev error overlay as if the app had crashed. Drop just those
// known-benign lines; every real error still passes through. Installed once.
let mpLogsSilenced = false;
function silenceMediaPipeLogs() {
  if (mpLogsSilenced || typeof window === "undefined") return;
  mpLogsSilenced = true;
  const BENIGN = [
    "Created TensorFlow Lite XNNPACK delegate for CPU",
    "GL version",
    "OpenGL error checking is disabled",
    "feedback tensors",
  ];
  const original = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const first = args[0];
    if (typeof first === "string" && BENIGN.some((b) => first.includes(b))) {
      return;
    }
    original(...(args as []));
  };
}

export class VideoFx {
  private source: MediaStream;
  private video: HTMLVideoElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private layer: HTMLCanvasElement; // person / compositing scratch
  private lctx: CanvasRenderingContext2D;
  private maskCanvas: HTMLCanvasElement; // segmentation mask
  private mctx: CanvasRenderingContext2D;

  private settings: FxSettings;
  private out: MediaStream | null = null;
  private raf = 0;
  private running = false;

  private segmenter: ImageSegmenter | null = null;
  private faceLm: FaceLandmarker | null = null;
  private loadingSeg = false;
  private loadingFace = false;
  private bgImg: HTMLImageElement | null = null;
  private stickerImgs = new Map<string, HTMLImageElement>();
  private particles: Particle[] = [];
  private lastSpawn = 0;
  private onError?: (msg: string) => void;

  constructor(source: MediaStream, settings: FxSettings, onError?: (m: string) => void) {
    this.source = source;
    this.settings = settings;
    this.onError = onError;

    this.video = document.createElement("video");
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.srcObject = source;

    this.canvas = document.createElement("canvas");
    this.layer = document.createElement("canvas");
    this.maskCanvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d")!;
    this.lctx = this.layer.getContext("2d")!;
    this.mctx = this.maskCanvas.getContext("2d")!;
  }

  /** Begin processing; returns the processed MediaStream (video + original audio). */
  async start(): Promise<MediaStream> {
    await this.video.play().catch(() => {});
    const s = this.source.getVideoTracks()[0]?.getSettings?.() ?? {};
    const w = (s.width as number) ?? 640;
    const h = (s.height as number) ?? 480;
    this.canvas.width = this.layer.width = w;
    this.canvas.height = this.layer.height = h;

    this.running = true;
    this.applyLoads();
    this.loop();

    const out = this.canvas.captureStream(30);
    // Pass the original microphone track through untouched.
    this.source.getAudioTracks().forEach((t) => out.addTrack(t));
    this.out = out;
    return out;
  }

  update(settings: FxSettings) {
    this.settings = settings;
    if (
      settings.background === "image" &&
      settings.backgroundImage &&
      this.bgImg?.dataset?.url !== settings.backgroundImage
    ) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.dataset.url = settings.backgroundImage;
      img.src = settings.backgroundImage;
      this.bgImg = img;
    }
    this.applyLoads();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.out?.getVideoTracks().forEach((t) => t.stop());
    this.video.srcObject = null;
    try {
      this.segmenter?.close();
      this.faceLm?.close();
    } catch {
      /* ignore */
    }
    this.segmenter = this.faceLm = null;
    this.particles = [];
    this.stickerImgs.clear();
  }

  // ---- model loading (lazy) ----
  private applyLoads() {
    if (needsSegmentation(this.settings) && !this.segmenter && !this.loadingSeg) {
      this.loadingSeg = true;
      this.loadSegmenter().finally(() => (this.loadingSeg = false));
    }
    if (needsFaceLandmarks(this.settings) && !this.faceLm && !this.loadingFace) {
      this.loadingFace = true;
      this.loadFace().finally(() => (this.loadingFace = false));
    }
  }

  private async loadSegmenter() {
    try {
      silenceMediaPipeLogs();
      const vision = await import("@mediapipe/tasks-vision");
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
      this.segmenter = await vision.ImageSegmenter.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: SEG_MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        outputCategoryMask: false,
        outputConfidenceMasks: true,
      });
    } catch (e) {
      this.onError?.("Background model failed to load (check network).");
      console.warn("segmenter load failed", e);
    }
  }

  private async loadFace() {
    try {
      silenceMediaPipeLogs();
      const vision = await import("@mediapipe/tasks-vision");
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
      this.faceLm = await vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: FACE_MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        numFaces: 1,
      });
    } catch (e) {
      this.onError?.("Face model failed to load (check network).");
      console.warn("face landmarker load failed", e);
    }
  }

  // ---- render loop ----
  private loop = () => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    const v = this.video;
    if (v.readyState < 2 || !v.videoWidth) return;

    const { ctx, canvas } = this;
    const W = canvas.width;
    const H = canvas.height;
    const s = this.settings;
    const ts = performance.now();

    const filter = cssFilter(s);

    if (needsSegmentation(s) && this.segmenter) {
      this.drawWithBackground(W, H, filter, ts);
    } else {
      ctx.filter = filter;
      ctx.drawImage(v, 0, 0, W, H);
      ctx.filter = "none";
    }

    // Skin smoothing: blend a blurred copy on top at low alpha (soft-focus).
    if (s.smooth > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.6, s.smooth * 0.6);
      ctx.filter = `${filter} blur(${(2 + s.smooth * 4).toFixed(1)}px)`;
      ctx.drawImage(canvas, 0, 0, W, H);
      ctx.restore();
      ctx.filter = "none";
    }

    // Detect face landmarks once per frame; share across accessory + effects.
    let lm: Array<{ x: number; y: number }> | null = null;
    if (needsFaceLandmarks(s) && this.faceLm) {
      try {
        lm = this.faceLm.detectForVideo(v, ts).faceLandmarks?.[0] ?? null;
      } catch {
        lm = null;
      }
    }

    if (lm && s.accessory !== "none") {
      this.drawAccessory(lm, W, H);
    }

    if (s.effect !== "none" && s.effect !== "cartoon") {
      this.drawEffect(s.effect, lm, W, H, ts);
    }

    if (s.stickers.length) {
      this.drawStickers(W, H);
    }

    if (s.frame && s.frame !== "none") {
      this.drawFrame(W, H);
    }
  };

  // Draw the user's placed decal stickers (baked into the stream + recording).
  private drawStickers(W: number, H: number) {
    const { ctx } = this;
    const base = Math.min(W, H) * 0.15;
    for (const st of this.settings.stickers) {
      ctx.save();
      ctx.translate(st.x * W, st.y * H);
      this.drawDecal(st.kind, base * st.scale);
      ctx.restore();
    }
  }

  private drawDecal(kind: FxSettings["stickers"][number]["kind"], s: number) {
    const { ctx } = this;
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(2, s * 0.12);
    ctx.strokeStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.28)";
    ctx.shadowBlur = s * 0.15;
    const fillStroke = (color: string) => {
      ctx.fillStyle = color;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fill();
    };
    switch (kind) {
      case "heart": {
        ctx.beginPath();
        ctx.moveTo(0, s * 0.35);
        ctx.bezierCurveTo(s * 0.55, -s * 0.25, s * 0.5, -s * 0.72, 0, -s * 0.35);
        ctx.bezierCurveTo(-s * 0.5, -s * 0.72, -s * 0.55, -s * 0.25, 0, s * 0.35);
        ctx.closePath();
        fillStroke("#f74d8b");
        break;
      }
      case "star": {
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? s * 0.45 : s;
          const a = -Math.PI / 2 + (i * Math.PI) / 5;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        fillStroke("#ffcf3f");
        break;
      }
      case "bolt": {
        ctx.beginPath();
        ctx.moveTo(-s * 0.15, -s);
        ctx.lineTo(s * 0.4, -s * 0.15);
        ctx.lineTo(s * 0.08, -s * 0.15);
        ctx.lineTo(s * 0.3, s);
        ctx.lineTo(-s * 0.4, s * 0.05);
        ctx.lineTo(-s * 0.06, s * 0.05);
        ctx.closePath();
        fillStroke("#ffd23f");
        break;
      }
      case "fire": {
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.bezierCurveTo(s * 0.75, -s * 0.2, s * 0.5, s * 0.85, 0, s);
        ctx.bezierCurveTo(-s * 0.5, s * 0.85, -s * 0.75, -s * 0.2, 0, -s);
        ctx.closePath();
        fillStroke("#ff6a2b");
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.35);
        ctx.bezierCurveTo(s * 0.4, s * 0.05, s * 0.28, s * 0.6, 0, s * 0.72);
        ctx.bezierCurveTo(-s * 0.28, s * 0.6, -s * 0.4, s * 0.05, 0, -s * 0.35);
        ctx.closePath();
        ctx.fillStyle = "#ffd23f";
        ctx.fill();
        break;
      }
      case "crown": {
        const w = s * 1.9;
        ctx.beginPath();
        ctx.moveTo(-w / 2, s * 0.5);
        ctx.lineTo(-w / 2, -s * 0.2);
        ctx.lineTo(-w / 4, s * 0.15);
        ctx.lineTo(0, -s * 0.6);
        ctx.lineTo(w / 4, s * 0.15);
        ctx.lineTo(w / 2, -s * 0.2);
        ctx.lineTo(w / 2, s * 0.5);
        ctx.closePath();
        fillStroke("#f5c518");
        break;
      }
      case "hundred": {
        ctx.shadowBlur = 0;
        ctx.font = `800 ${s * 1.15}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = Math.max(2, s * 0.14);
        ctx.strokeText("100", 0, 0);
        ctx.fillStyle = "#e23d3d";
        ctx.fillText("100", 0, 0);
        ctx.strokeStyle = "#e23d3d";
        ctx.lineWidth = Math.max(2, s * 0.08);
        ctx.beginPath();
        ctx.moveTo(-s * 0.75, s * 0.72);
        ctx.lineTo(s * 0.75, s * 0.72);
        ctx.stroke();
        break;
      }
      case "sparkle": {
        ctx.fillStyle = "#fff3b0";
        ctx.shadowColor = "#ffe27a";
        ctx.shadowBlur = s * 0.5;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.quadraticCurveTo(0, 0, s, 0);
        ctx.quadraticCurveTo(0, 0, 0, s);
        ctx.quadraticCurveTo(0, 0, -s, 0);
        ctx.quadraticCurveTo(0, 0, 0, -s);
        ctx.fill();
        ctx.shadowBlur = 0;
        break;
      }
      case "arrow": {
        ctx.strokeStyle = "#ffffff";
        ctx.lineCap = "round";
        ctx.lineWidth = Math.max(3, s * 0.2);
        ctx.beginPath();
        ctx.moveTo(-s * 0.8, s * 0.4);
        ctx.quadraticCurveTo(-s * 0.2, -s * 0.7, s * 0.7, -s * 0.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s * 0.2, -s * 0.55);
        ctx.lineTo(s * 0.75, -s * 0.3);
        ctx.lineTo(s * 0.35, s * 0.05);
        ctx.stroke();
        break;
      }
    }
    ctx.shadowBlur = 0;
  }

  // Decorative story frame drawn over the composited video (baked into the
  // published stream + recording).
  private drawFrame(W: number, H: number) {
    const { ctx } = this;
    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };
    const corners = (m: number, len: number, lw: number, color: string, glow: number) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.lineCap = "round";
      ctx.shadowColor = color;
      ctx.shadowBlur = glow;
      const L = (cx: number, cy: number, dx: number, dy: number) => {
        ctx.beginPath();
        ctx.moveTo(cx + dx * len, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + dy * len);
        ctx.stroke();
      };
      L(m, m, 1, 1);
      L(W - m, m, -1, 1);
      L(m, H - m, 1, -1);
      L(W - m, H - m, -1, -1);
      ctx.shadowBlur = 0;
    };

    ctx.save();
    ctx.textBaseline = "alphabetic";
    switch (this.settings.frame) {
      case "polaroid": {
        const b = Math.round(W * 0.03);
        const bb = Math.round(H * 0.16);
        ctx.fillStyle = "#f7f5ee";
        ctx.fillRect(0, 0, W, b);
        ctx.fillRect(0, 0, b, H);
        ctx.fillRect(W - b, 0, b, H);
        ctx.fillRect(0, H - bb, W, bb);
        ctx.fillStyle = "#43413c";
        ctx.font = `italic ${Math.round(bb * 0.42)}px "Snell Roundhand", "Segoe Script", cursive`;
        ctx.textAlign = "center";
        ctx.fillText("memories ♡", W / 2, H - bb * 0.36);
        break;
      }
      case "film": {
        const band = Math.round(H * 0.12);
        ctx.fillStyle = "#131313";
        ctx.fillRect(0, 0, W, band);
        ctx.fillRect(0, H - band, W, band);
        ctx.fillStyle = "#e6b84f";
        const hw = band * 0.34;
        const hh = band * 0.4;
        for (let x = hw; x < W - hw; x += hw * 2.1) {
          roundRect(x, band * 0.3, hw, hh, hw * 0.22);
          ctx.fill();
          roundRect(x, H - band + band * 0.3, hw, hh, hw * 0.22);
          ctx.fill();
        }
        ctx.fillStyle = "#e6b84f";
        ctx.font = `bold ${Math.round(band * 0.32)}px "Courier New", monospace`;
        ctx.textAlign = "left";
        ctx.fillText("KODAK PORTRA 400", band * 0.4, band * 0.9 + H - band);
        break;
      }
      case "neon": {
        const m = Math.round(W * 0.045);
        corners(m, W * 0.09, Math.max(3, W * 0.006), "#22d3ee", 18);
        ctx.shadowColor = "#f0407a";
        ctx.shadowBlur = 16;
        ctx.fillStyle = "#f0407a";
        ctx.textAlign = "left";
        ctx.font = `800 ${Math.round(W * 0.035)}px sans-serif`;
        ctx.fillText("100", m * 1.3, H - m * 1.2);
        ctx.shadowBlur = 0;
        break;
      }
      case "vhs": {
        const m = Math.round(W * 0.045);
        corners(m, W * 0.08, Math.max(2, W * 0.004), "rgba(255,255,255,0.9)", 0);
        // Live camcorder clock — the real current date/time.
        const now = new Date();
        const h = now.getHours();
        const ap = h >= 12 ? "PM" : "AM";
        const h12 = ((h + 11) % 12) + 1;
        const mm = String(now.getMinutes()).padStart(2, "0");
        const MON = [
          "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
          "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
        ];
        const timeStr = `${ap} ${h12}:${mm}`;
        const dateStr = `${MON[now.getMonth()]} ${now.getDate()} ${now.getFullYear()}`;
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.textAlign = "left";
        ctx.font = `bold ${Math.round(W * 0.03)}px "Courier New", monospace`;
        ctx.fillText("PLAY ▶", m, m * 1.7);
        ctx.textAlign = "right";
        ctx.font = `bold ${Math.round(W * 0.024)}px "Courier New", monospace`;
        ctx.fillText(timeStr, W - m, H - m * 1.9);
        ctx.fillText(dateStr, W - m, H - m);
        break;
      }
      case "gradient": {
        const inset = Math.round(W * 0.02);
        const g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, "#f21ec9");
        g.addColorStop(1, "#22d3ee");
        ctx.strokeStyle = g;
        ctx.lineWidth = Math.round(W * 0.02);
        roundRect(inset, inset, W - inset * 2, H - inset * 2, Math.round(W * 0.05));
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }

  private drawWithBackground(W: number, H: number, filter: string, ts: number) {
    const { ctx, layer, lctx, maskCanvas, mctx, video, settings } = this;
    let mask: { data: Float32Array; w: number; h: number } | null = null;
    try {
      const res = this.segmenter!.segmentForVideo(video, ts);
      const m = res.confidenceMasks?.[0];
      if (m) mask = { data: m.getAsFloat32Array(), w: m.width, h: m.height };
      res.close?.();
    } catch {
      /* fall through to plain draw */
    }
    if (!mask) {
      ctx.filter = filter;
      ctx.drawImage(video, 0, 0, W, H);
      ctx.filter = "none";
      return;
    }

    // 1) background layer
    ctx.save();
    if (settings.background === "image" && this.bgImg?.complete && this.bgImg.naturalWidth) {
      drawCover(ctx, this.bgImg, W, H);
    } else {
      // blur the camera itself as the backdrop
      ctx.filter = "blur(14px) brightness(0.9)";
      ctx.drawImage(video, 0, 0, W, H);
    }
    ctx.restore();
    ctx.filter = "none";

    // 2) person mask -> maskCanvas (white where person)
    maskCanvas.width = mask.w;
    maskCanvas.height = mask.h;
    const img = mctx.createImageData(mask.w, mask.h);
    for (let i = 0; i < mask.data.length; i++) {
      const a = mask.data[i];
      img.data[i * 4] = 255;
      img.data[i * 4 + 1] = 255;
      img.data[i * 4 + 2] = 255;
      img.data[i * 4 + 3] = a > 0.5 ? 255 : Math.round(a * a * 255);
    }
    mctx.putImageData(img, 0, 0);

    // 3) person layer = filtered video clipped to the mask
    lctx.clearRect(0, 0, W, H);
    lctx.filter = filter;
    lctx.drawImage(video, 0, 0, W, H);
    lctx.filter = "none";
    lctx.globalCompositeOperation = "destination-in";
    lctx.drawImage(maskCanvas, 0, 0, W, H);
    lctx.globalCompositeOperation = "source-over";

    // 4) composite person over background
    ctx.drawImage(layer, 0, 0, W, H);
  }

  private drawAccessory(
    lm: Array<{ x: number; y: number }>,
    W: number,
    H: number
  ) {
    const { ctx, settings } = this;
    const def = accessoryDef(settings.accessory);
    if (!def?.img) return;
    const img = this.stickerImage(def.img);
    if (!img.complete || !img.naturalWidth) return;

    const le = lm[L_EYE];
    const re = lm[R_EYE];
    if (!le || !re) return;
    const x1 = le.x * W;
    const y1 = le.y * H;
    const x2 = re.x * W;
    const y2 = re.y * H;
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const d = Math.hypot(x2 - x1, y2 - y1); // interocular distance
    const angle = Math.atan2(y2 - y1, x2 - x1);

    // Draw the sticker scaled to the face, rotated with the eye line. widthK
    // sizes it (× interocular distance). eyeK is where the sticker's own eyes
    // sit vertically (0=top, 1=bottom) — we line that up with the real eyes so
    // the face lands right; dyK is a small extra nudge along the face axis.
    const w = (def.widthK ?? 4.5) * d;
    const h = (w * img.naturalHeight) / img.naturalWidth;
    const topY = -(def.eyeK ?? 0.5) * h + (def.dyK ?? 0) * d;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.drawImage(img, -w / 2, topY, w, h);
    ctx.restore();
  }

  // Procedural face effects: floating hearts / sparkles around the head, or a
  // neon outline traced along the face oval.
  private drawEffect(
    effect: FxSettings["effect"],
    lm: Array<{ x: number; y: number }> | null,
    W: number,
    H: number,
    ts: number
  ) {
    const { ctx } = this;

    // Head anchor (falls back to a sensible spot before a face is detected).
    let cx = W / 2;
    let cy = H * 0.33;
    let hd = W * 0.32;
    if (lm) {
      const le = lm[L_EYE];
      const re = lm[R_EYE];
      if (le && re) {
        const d = Math.hypot((re.x - le.x) * W, (re.y - le.y) * H);
        cx = ((le.x + re.x) / 2) * W;
        cy = ((le.y + re.y) / 2) * H;
        hd = d * 2.4;
      }
    }

    if (effect === "neon") {
      if (!lm) return;
      ctx.save();
      ctx.lineJoin = "round";
      // Two passes: a wide soft glow, then a bright core line.
      for (const pass of [
        { color: "#22d3ee", width: Math.max(6, W * 0.014), blur: 22 },
        { color: "#ffffff", width: Math.max(2, W * 0.004), blur: 8 },
      ]) {
        ctx.strokeStyle = pass.color;
        ctx.lineWidth = pass.width;
        ctx.shadowColor = "#22d3ee";
        ctx.shadowBlur = pass.blur;
        ctx.beginPath();
        FACE_OVAL.forEach((idx, i) => {
          const p = lm[idx];
          if (!p) return;
          const x = p.x * W;
          const y = p.y * H;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    // Particle effects: spawn, advance, draw, expire.
    if (ts - this.lastSpawn > (effect === "hearts" ? 110 : 70)) {
      this.lastSpawn = ts;
      const ang = Math.random() * Math.PI * 2;
      const rad = hd * (0.55 + Math.random() * 0.55);
      const max = 42 + Math.floor(Math.random() * 26);
      this.particles.push({
        x: cx + Math.cos(ang) * rad,
        y: cy + Math.sin(ang) * rad * 0.75 - hd * 0.25,
        vx: (Math.random() - 0.5) * (W * 0.0016),
        vy: -(H * 0.0016) * (0.7 + Math.random() * 0.8),
        life: max,
        max,
        size: hd * (effect === "hearts" ? 0.16 : 0.12) * (0.7 + Math.random() * 0.6),
        rot: (Math.random() - 0.5) * 0.7,
      });
    }
    if (this.particles.length > 80) {
      this.particles.splice(0, this.particles.length - 80);
    }

    ctx.save();
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1;
      const t = p.life / p.max;
      if (t <= 0) continue;
      ctx.globalAlpha = Math.min(1, t * 1.6);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (effect === "hearts") this.drawHeart(p.size);
      else this.drawSparkle(p.size);
      ctx.restore();
    }
    ctx.restore();
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  private drawHeart(s: number) {
    const { ctx } = this;
    ctx.fillStyle = "#f74d8b";
    ctx.beginPath();
    ctx.moveTo(0, s * 0.35);
    ctx.bezierCurveTo(s * 0.55, -s * 0.25, s * 0.5, -s * 0.7, 0, -s * 0.35);
    ctx.bezierCurveTo(-s * 0.5, -s * 0.7, -s * 0.55, -s * 0.25, 0, s * 0.35);
    ctx.closePath();
    ctx.fill();
  }

  private drawSparkle(s: number) {
    const { ctx } = this;
    ctx.fillStyle = "#fff3b0";
    ctx.shadowColor = "#ffe27a";
    ctx.shadowBlur = s * 0.6;
    ctx.beginPath();
    // 4-point twinkle
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(0, 0, s, 0);
    ctx.quadraticCurveTo(0, 0, 0, s);
    ctx.quadraticCurveTo(0, 0, -s, 0);
    ctx.quadraticCurveTo(0, 0, 0, -s);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Lazily load + cache a sticker PNG (vendored under /public/accessories).
  private stickerImage(url: string): HTMLImageElement {
    let img = this.stickerImgs.get(url);
    if (!img) {
      img = new Image();
      img.src = url;
      this.stickerImgs.set(url, img);
    }
    return img;
  }
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  W: number,
  H: number
) {
  const ir = img.naturalWidth / img.naturalHeight;
  const cr = W / H;
  let dw = W;
  let dh = H;
  if (ir > cr) dw = H * ir;
  else dh = W / ir;
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
}
