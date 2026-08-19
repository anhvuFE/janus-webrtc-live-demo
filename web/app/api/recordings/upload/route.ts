import { promises as fs } from "node:fs";
import path from "node:path";
import { recordingsDir, safeStreamName } from "@/lib/recordings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cap uploads so a runaway/hostile client can't fill the disk (demo-grade).
const MAX_BYTES = 500 * 1024 * 1024; // 500 MB

// POST /api/recordings/upload?stream=present
// Body: the raw recorded bytes (webm). Writes to
// <recordings>/<stream>/<timestamp>.webm so it shows up in /recordings.
export async function POST(request: Request) {
  const stream = safeStreamName(
    new URL(request.url).searchParams.get("stream") ?? "webrtc"
  );

  const buf = Buffer.from(await request.arrayBuffer());
  if (buf.byteLength === 0) return new Response("Empty body", { status: 400 });
  if (buf.byteLength > MAX_BYTES) {
    return new Response("Recording too large", { status: 413 });
  }

  const dir = path.join(recordingsDir(), stream);
  // ISO timestamp, filesystem-safe (no colons/dots in the time part).
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const file = `${ts}.webm`;

  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, file), buf);
  } catch (e) {
    return new Response(
      `Failed to save recording: ${e instanceof Error ? e.message : String(e)}`,
      { status: 500 }
    );
  }

  return Response.json({ id: `${stream}/${file}`, size: buf.byteLength });
}
