import { hlsPlaylist, JANUS_ROOM } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Server-side "who's live" probe. Reports whether a presenter is publishing in
// the Janus broadcast room and whether the MediaMTX buffered stream is live, so
// viewers can tell before they join. Cached briefly so many polling tabs don't
// hammer Janus with session churn.

const JANUS_HTTP = process.env.JANUS_HTTP ?? "http://localhost:8088/janus";
const CACHE_TTL = 2000;

export interface LiveStatus {
  broadcast: { live: boolean; publishers: number };
  buffered: { live: boolean };
}

interface JanusResp {
  data?: { id?: number };
  plugindata?: { data?: { participants?: Array<{ publisher?: boolean }> } };
}

let cache: { at: number; data: LiveStatus } | null = null;
let txCounter = 0;
const tx = () => `ls-${Date.now()}-${txCounter++}`;

async function postJanus(url: string, body: object): Promise<JanusResp> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Janus HTTP ${res.status}`);
  return (await res.json()) as JanusResp;
}

// Create a throwaway session, list the broadcast room's participants, destroy.
async function broadcastLive(): Promise<{ live: boolean; publishers: number }> {
  const created = await postJanus(JANUS_HTTP, {
    janus: "create",
    transaction: tx(),
  });
  const sessionId = created.data?.id;
  if (!sessionId) return { live: false, publishers: 0 };
  try {
    const attached = await postJanus(`${JANUS_HTTP}/${sessionId}`, {
      janus: "attach",
      plugin: "janus.plugin.videoroom",
      transaction: tx(),
    });
    const handleId = attached.data?.id;
    const listed = await postJanus(`${JANUS_HTTP}/${sessionId}/${handleId}`, {
      janus: "message",
      transaction: tx(),
      body: { request: "listparticipants", room: JANUS_ROOM },
    });
    const participants = listed.plugindata?.data?.participants ?? [];
    const publishers = participants.filter((p) => p.publisher).length;
    return { live: publishers > 0, publishers };
  } finally {
    await postJanus(`${JANUS_HTTP}/${sessionId}`, {
      janus: "destroy",
      transaction: tx(),
    }).catch(() => {});
  }
}

// The MediaMTX LL-HLS playlist is only served (200 + #EXTM3U) while live.
async function bufferedLive(): Promise<boolean> {
  try {
    const res = await fetch(hlsPlaylist(), { cache: "no-store" });
    if (!res.ok) return false;
    return (await res.text()).includes("#EXTM3U");
  } catch {
    return false;
  }
}

export async function GET() {
  if (cache && Date.now() - cache.at < CACHE_TTL) {
    return Response.json(cache.data);
  }
  const [broadcast, buffered] = await Promise.all([
    broadcastLive().catch(() => ({ live: false, publishers: 0 })),
    bufferedLive()
      .then((live) => ({ live }))
      .catch(() => ({ live: false })),
  ]);
  const data: LiveStatus = { broadcast, buffered };
  cache = { at: Date.now(), data };
  return Response.json(data);
}
