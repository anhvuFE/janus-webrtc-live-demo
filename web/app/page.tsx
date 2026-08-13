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

      <div className="cards">
        <Link className="card" href="/present">
          <h3>🎥 Present</h3>
          <p>
            Go live from your camera. Joins the room as a publisher and streams
            to everyone watching.
          </p>
        </Link>
        <Link className="card" href="/watch">
          <h3>👀 Watch</h3>
          <p>
            Join as a viewer. Finds the active presenter and subscribes to the
            live feed.
          </p>
        </Link>
      </div>

      <div className="stack">
        <span className="chip">Janus VideoRoom</span>
        <span className="chip">WebRTC</span>
        <span className="chip">coturn STUN/TURN</span>
        <span className="chip">Next.js + TypeScript</span>
        <span className="chip">Docker Compose</span>
      </div>
    </main>
  );
}
