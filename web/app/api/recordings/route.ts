import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  recordingsDir,
  type RecordingEntry,
} from "@/lib/recordings";

export const dynamic = "force-dynamic";

// GET /api/recordings — list all recorded .mp4 files (grouped by stream folder).
export async function GET() {
  const base = recordingsDir();
  const entries: RecordingEntry[] = [];

  let streamDirs: string[] = [];
  try {
    const dirents = await fs.readdir(base, { withFileTypes: true });
    streamDirs = dirents.filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
    // recordings dir doesn't exist yet — no recordings.
    return NextResponse.json({ recordings: [] });
  }

  for (const stream of streamDirs) {
    let files: string[] = [];
    try {
      files = await fs.readdir(path.join(base, stream));
    } catch {
      continue;
    }
    for (const file of files) {
      if (!file.endsWith(".mp4")) continue;
      try {
        const stat = await fs.stat(path.join(base, stream, file));
        entries.push({
          id: `${stream}/${file}`,
          stream,
          size: stat.size,
          modified: stat.mtimeMs,
        });
      } catch {
        /* skip unreadable */
      }
    }
  }

  entries.sort((a, b) => b.modified - a.modified);
  return NextResponse.json({ recordings: entries });
}
