// Shared helpers for locating server-side recordings on disk.
// MediaMTX writes fMP4 files under <repo>/recordings/<stream>/<timestamp>.mp4
// (mounted into the container as /recordings). The web app runs from web/, so
// the default lives one level up. Override with RECORDINGS_DIR.

import path from "node:path";

export function recordingsDir(): string {
  return (
    process.env.RECORDINGS_DIR ??
    path.join(process.cwd(), "..", "recordings")
  );
}

export interface RecordingEntry {
  /** Path relative to recordingsDir(), used as the streaming id. */
  id: string;
  stream: string;
  size: number;
  modified: number;
}

/** Guard against path traversal when streaming a requested recording id. */
export function resolveRecording(id: string): string | null {
  const base = recordingsDir();
  const resolved = path.resolve(base, id);
  const rel = path.relative(base, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  if (!resolved.endsWith(".mp4")) return null;
  return resolved;
}
