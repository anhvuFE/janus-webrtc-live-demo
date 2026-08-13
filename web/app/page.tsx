import Link from "next/link";

export default function Home() {
  return (
    <main className="container">
      <div className="brand">
        <span className="dot" />
        JANUS · WEBRTC LIVE
      </div>

      <h1>
        1-to-many live streaming
        <br />
        on WebRTC + Janus.
      </h1>
      <p className="lede">
        A presenter pushes camera &amp; mic into a Janus VideoRoom over WebRTC;
        any number of viewers subscribe and watch in near real time. STUN/TURN
        via coturn handles NAT traversal. This is a minimal, runnable slice of a
        larger streaming platform.
      </p>

      <h2 className="section-title">Low-latency path · Janus</h2>
      <div className="cards">
        <Link className="card" href="/present">
          <h3>🎥 Present</h3>
          <p>
            Go live from your camera. Joins the Janus room as a publisher and
            streams to everyone watching.
          </p>
        </Link>
        <Link className="card" href="/watch">
          <h3>👀 Watch</h3>
          <p>
            Join as a viewer. Finds the active presenter and subscribes to the
            live WebRTC feed.
          </p>
        </Link>
        <Link className="card" href="/stage">
          <h3>👥 Stage</h3>
          <p>
            Multi-presenter grid — everyone publishes and subscribes to all
            others, with live data-channel chat.
          </p>
        </Link>
      </div>

      <h2 className="section-title">Buffered path · MediaMTX</h2>
      <div className="cards">
        <Link className="card" href="/broadcast">
          <h3>📡 Broadcast (WHIP)</h3>
          <p>
            Ingest your camera straight into MediaMTX over WHIP; it remuxes to
            Low-Latency HLS.
          </p>
        </Link>
        <Link className="card" href="/hls">
          <h3>📺 LL-HLS Player</h3>
          <p>
            Watch the buffered, CDN-friendly Low-Latency HLS stream via hls.js.
          </p>
        </Link>
        <Link className="card" href="/recordings">
          <h3>⏺ Recordings</h3>
          <p>
            Browse and play back sessions archived server-side by MediaMTX as
            fragmented MP4.
          </p>
        </Link>
      </div>

      <div className="stack">
        <span className="chip">Janus VideoRoom</span>
        <span className="chip">TextRoom chat</span>
        <span className="chip">WHIP / WebRTC</span>
        <span className="chip">MediaMTX LL-HLS</span>
        <span className="chip">Server-side recording</span>
        <span className="chip">coturn STUN/TURN</span>
        <span className="chip">Next.js + TypeScript</span>
        <span className="chip">Docker Compose</span>
      </div>
    </main>
  );
}
