// Shared helpers for locating server-side recordings on disk.
// MediaMTX writes fMP4 files under <repo>/recordings/<stream>/<timestamp>.mp4
// (mounted into the container as /recordings). The web app runs from web/, so
// the default lives one level up. Override with RECORDINGS_DIR.

import { promises as fs } from "node:fs";
import path from "node:path";

export function recordingsDir(): string {
  // NOTE: the default assumes cwd is the `web/` dir (as `next dev`/`next start`
  // set it). If you deploy with a different cwd, set RECORDINGS_DIR explicitly.
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

/**
 * Guard against path traversal (and symlink escape) when streaming a requested
 * recording id. Resolves symlinks with realpath so a symlink planted inside the
 * recordings dir can't point the stream at a file outside it.
 */
export async function resolveRecording(id: string): Promise<string | null> {
  const base = recordingsDir();
  const candidate = path.resolve(base, id);
  if (!candidate.endsWith(".mp4")) return null;
  let real: string;
  try {
    real = await fs.realpath(candidate); // follows symlinks; throws if missing
  } catch {
    return null;
  }
  const rel = path.relative(base, real);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return real;
}
