import { createReadStream } from "node:fs";
import { promises as fs } from "node:fs";
import { Readable } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { resolveRecording } from "@/lib/recordings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/recordings/file?id=<stream>/<file>.mp4 — stream a recording with
// HTTP Range support so the <video> element can seek.
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return new Response("Missing id", { status: 400 });

  const filePath = resolveRecording(id);
  if (!filePath) return new Response("Invalid id", { status: 400 });

  let size: number;
  try {
    size = (await fs.stat(filePath)).size;
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const range = request.headers.get("range");
  const baseHeaders: Record<string, string> = {
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",
  };

  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    let start: number;
    let end: number;
    if (match && match[1] === "" && match[2] !== "") {
      // Suffix range: `bytes=-N` means the last N bytes (Safari, some clients).
      const n = parseInt(match[2], 10);
      start = Math.max(0, size - n);
      end = size - 1;
    } else {
      start = match && match[1] ? parseInt(match[1], 10) : 0;
      end = match && match[2] ? parseInt(match[2], 10) : size - 1;
    }
    if (end >= size) end = size - 1; // clamp to last byte
    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
      return new Response("Range Not Satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }
    const stream = Readable.toWeb(
      createReadStream(filePath, { start, end })
    ) as WebReadableStream<Uint8Array>;
    return new Response(stream as unknown as BodyInit, {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(end - start + 1),
      },
    });
  }

  const stream = Readable.toWeb(
    createReadStream(filePath)
  ) as WebReadableStream<Uint8Array>;
  return new Response(stream as unknown as BodyInit, {
    status: 200,
    headers: { ...baseHeaders, "Content-Length": String(size) },
  });
}
