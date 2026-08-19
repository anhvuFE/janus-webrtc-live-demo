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

// FaceMesh landmark indices we anchor accessories to.
const L_EYE = 33; // subject's right eye outer corner (image-left)
const R_EYE = 263; // subject's left eye outer corner (image-right)
const FOREHEAD = 10;
const PHILTRUM = 164; // just below the nose
const NOSE_TIP = 1; // tip of the nose

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

    if (needsFaceLandmarks(s) && this.faceLm) {
      this.drawAccessory(W, H, ts);
    }
  };

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

  private drawAccessory(W: number, H: number, ts: number) {
    const { ctx, video, settings } = this;
    let lm: Array<{ x: number; y: number }> | undefined;
    try {
      const res = this.faceLm!.detectForVideo(video, ts);
      lm = res.faceLandmarks?.[0];
    } catch {
      return;
    }
    if (!lm) return;

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

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    if (settings.accessory === "sunglasses" || settings.accessory === "glasses") {
      const r = d * 0.42;
      const off = d * 0.55;
      const stroke = settings.accessory === "glasses";
      ctx.lineWidth = Math.max(2, d * 0.06);
      ctx.strokeStyle = "#111";
      ctx.fillStyle = "rgba(10,10,14,0.82)";
      for (const sx of [-off, off]) {
        ctx.beginPath();
        ctx.ellipse(sx, 0, r * 0.7, r * 0.5, 0, 0, Math.PI * 2);
        if (stroke) ctx.stroke();
        else ctx.fill();
      }
      ctx.beginPath();
      ctx.moveTo(-off + r * 0.5, 0);
      ctx.lineTo(off - r * 0.5, 0);
      ctx.strokeStyle = "#111";
      ctx.stroke();
    } else if (settings.accessory === "hat") {
      const hy = -d * 1.7; // above the eyes
      const hw = d * 1.4;
      ctx.fillStyle = "#f21ec9";
      ctx.beginPath();
      ctx.moveTo(-hw / 2, hy);
      ctx.lineTo(hw / 2, hy);
      ctx.lineTo(0, hy - d * 1.6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#8b5cf6";
      ctx.beginPath();
      ctx.arc(0, hy - d * 1.6, d * 0.14, 0, Math.PI * 2);
      ctx.fill();
    } else if (settings.accessory === "crown") {
      const by = -d * 1.5; // base sits above the eyes
      const cw = d * 1.6;
      const ch = d * 0.9;
      const peaks = 5;
      ctx.fillStyle = "#f5c518"; // gold
      ctx.beginPath();
      ctx.moveTo(-cw / 2, by);
      for (let i = 0; i < peaks; i++) {
        const x = -cw / 2 + (cw * (i + 0.5)) / peaks;
        ctx.lineTo(x, by - ch); // spike up
        ctx.lineTo(-cw / 2 + (cw * (i + 1)) / peaks, by); // valley
      }
      ctx.closePath();
      ctx.fill();
      // jewels at each spike tip
      ctx.fillStyle = "#e23d6b";
      for (let i = 0; i < peaks; i++) {
        const x = -cw / 2 + (cw * (i + 0.5)) / peaks;
        ctx.beginPath();
        ctx.arc(x, by - ch, d * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (settings.accessory === "eyepatch") {
      const off = d * 0.55; // over the subject's left eye (image-right)
      const r = d * 0.42;
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.ellipse(off, 0, r * 0.75, r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      // strap across the brow
      ctx.strokeStyle = "#111";
      ctx.lineWidth = Math.max(2, d * 0.06);
      ctx.beginPath();
      ctx.moveTo(off + r * 0.6, -r * 0.7);
      ctx.lineTo(-d * 1.1, -r * 1.1);
      ctx.moveTo(off + r * 0.5, r * 0.5);
      ctx.lineTo(-d * 1.1, -r * 0.2);
      ctx.stroke();
    } else if (settings.accessory === "monocle") {
      const off = d * 0.55; // over the subject's left eye (image-right)
      const r = d * 0.42;
      ctx.lineWidth = Math.max(2, d * 0.07);
      ctx.strokeStyle = "#d4af37"; // gold rim
      ctx.beginPath();
      ctx.ellipse(off, 0, r * 0.62, r * 0.62, 0, 0, Math.PI * 2);
      ctx.stroke();
      // subtle glass tint
      ctx.fillStyle = "rgba(200,220,255,0.12)";
      ctx.beginPath();
      ctx.ellipse(off, 0, r * 0.62, r * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      // dangling chain
      ctx.strokeStyle = "#d4af37";
      ctx.lineWidth = Math.max(1, d * 0.03);
      ctx.beginPath();
      ctx.moveTo(off, r * 0.62);
      ctx.quadraticCurveTo(off + d * 0.3, d * 1.1, off - d * 0.1, d * 1.6);
      ctx.stroke();
    } else if (settings.accessory === "nose") {
      const tip = lm[NOSE_TIP];
      const nx = tip ? tip.x * W - cx : 0; // relative to eye centre (pre-rotate ~ ok)
      const ny = tip ? tip.y * H - cy : d * 0.9;
      ctx.fillStyle = "#e23d3d";
      ctx.beginPath();
      ctx.arc(nx, ny, d * 0.28, 0, Math.PI * 2);
      ctx.fill();
      // glossy highlight
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.beginPath();
      ctx.arc(nx - d * 0.09, ny - d * 0.09, d * 0.08, 0, Math.PI * 2);
      ctx.fill();
    } else if (settings.accessory === "mustache") {
      const ph = lm[PHILTRUM];
      const fh = lm[FOREHEAD];
      void fh;
      const my = ph ? ph.y * H - cy : d * 1.15; // relative to eye centre (pre-rotate frame ~ ok)
      ctx.fillStyle = "#2a1a12";
      ctx.beginPath();
      ctx.moveTo(0, my);
      ctx.bezierCurveTo(-d * 0.2, my - d * 0.22, -d * 0.55, my - d * 0.12, -d * 0.6, my + d * 0.12);
      ctx.bezierCurveTo(-d * 0.4, my + d * 0.04, -d * 0.16, my + d * 0.08, 0, my + d * 0.16);
      ctx.bezierCurveTo(d * 0.16, my + d * 0.08, d * 0.4, my + d * 0.04, d * 0.6, my + d * 0.12);
      ctx.bezierCurveTo(d * 0.55, my - d * 0.12, d * 0.2, my - d * 0.22, 0, my);
      ctx.fill();
    }

    ctx.restore();
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
