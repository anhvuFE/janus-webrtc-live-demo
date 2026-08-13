// Minimal typings for the vendored janus.js. We type only the surface we use
// and keep the plugin handle loose (`any`) rather than re-declaring the whole
// callback-based API.

export interface JanusInitOptions {
  debug?: boolean | "all" | string[];
  dependencies?: unknown;
  callback?: () => void;
}

export interface JanusConstructorOptions {
  server: string | string[];
  iceServers?: RTCIceServer[];
  success?: () => void;
  error?: (err: unknown) => void;
  destroyed?: () => void;
}

// The plugin handle exposes many methods (send, createOffer, createAnswer,
// handleRemoteJsep, hangup, detach, ...). Typed as `any` on purpose here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JanusPluginHandle = any;

export interface AttachOptions {
  plugin: string;
  opaqueId?: string;
  success?: (handle: JanusPluginHandle) => void;
  error?: (err: unknown) => void;
  onmessage?: (msg: Record<string, unknown>, jsep?: unknown) => void;
  onlocaltrack?: (track: MediaStreamTrack, on: boolean) => void;
  onremotetrack?: (track: MediaStreamTrack, mid: string, on: boolean) => void;
  webrtcState?: (isUp: boolean) => void;
  oncleanup?: () => void;
}

export interface JanusInstance {
  getServer(): string;
  isConnected(): boolean;
  attach(options: AttachOptions): void;
  destroy(): void;
}

export interface JanusStatic {
  init(options: JanusInitOptions): void;
  isWebrtcSupported(): boolean;
  log(...args: unknown[]): void;
  error(...args: unknown[]): void;
  new (options: JanusConstructorOptions): JanusInstance;
}
