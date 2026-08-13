import Link from "next/link";

// Colourful "media stills" for the 3D gallery fan (abstract, stand-in thumbnails).
const TILE_GRADIENTS = [
  "linear-gradient(160deg,#f97316,#7c2d12)",
  "linear-gradient(160deg,#0ea5e9,#0c4a6e)",
  "linear-gradient(160deg,#a855f7,#3b0764)",
  "linear-gradient(160deg,#f43f5e,#7f1d1d)",
  "linear-gradient(160deg,#22c55e,#14532d)",
  "linear-gradient(160deg,#eab308,#713f12)",
  "linear-gradient(160deg,#06b6d4,#164e63)",
  "linear-gradient(160deg,#ec4899,#831843)",
  "linear-gradient(160deg,#6366f1,#312e81)",
];

const SHOTS = [
  {
    grad: "linear-gradient(135deg,#1e293b,#0f172a)",
    title: "Sub-second WebRTC",
    desc: "Present or watch live over Janus VideoRoom with sub-second glass-to-glass latency.",
  },
  {
    grad: "linear-gradient(135deg,#3b0764,#1e1b4b)",
    title: "Multi-presenter stage",
    desc: "Everyone publishes and subscribes — a real video village with data-channel chat.",
  },
  {
    grad: "linear-gradient(135deg,#0c4a6e,#082f49)",
    title: "LL-HLS + recording",
    desc: "WHIP ingest remuxed to Low-Latency HLS, archived server-side as fragmented MP4.",
  },
];

export default function Home() {
  const center = (TILE_GRADIENTS.length - 1) / 2;

  return (
    <div className="evercast">
      <nav className="ev-nav">
        <div className="ev-logo">
          Janus&nbsp;Live <small>by anhvuFE</small>
        </div>
        <div className="ev-navlinks">
          <a href="#meet">Product</a>
          <a href="#stats">Performance</a>
          <a
            href="https://github.com/anhvuFE/janus-webrtc-live-demo"
            target="_blank"
            rel="noreferrer"
          >
            Source
          </a>
        </div>
        <div className="ev-navactions">
          <Link href="/watch" className="ev-link">
            Sign in
          </Link>
          <Link href="/present">
            <button className="ev-btn">Get started</button>
          </Link>
        </div>
      </nav>

      <header className="ev-hero">
        <div className="ev-avail">
          Currently running on
          <span className="ev-pill">WebRTC</span>
          <span className="ev-pill">Janus</span>
          <span className="ev-pill">MediaMTX</span>
        </div>
        <h1 className="ev-h1">
          Flawless live streaming
          <br />
          on every connection
        </h1>
        <p className="ev-sub">
          A runnable slice of a live-streaming platform — share 4K video and
          high-impact presentations with unparalleled quality and near-zero lag.
        </p>
        <div className="ev-cta-row">
          <Link href="/present">
            <button className="ev-btn">Get started for free</button>
          </Link>
          <Link href="/hls">
            <button className="ev-btn ghost">Watch demo</button>
          </Link>
        </div>
      </header>

      <div className="ev-gallery" aria-hidden>
        <div className="ev-stage">
          {TILE_GRADIENTS.map((g, i) => {
            const d = i - center; // <0 left, >0 right
            return (
              <div
                key={i}
                className="ev-tile"
                style={{
                  background: g,
                  // Concave "wall of screens": edges rotate inward, come forward
                  // (bigger) and rise; the centre recedes.
                  transform: `rotateY(${-d * 26}deg) translateZ(${
                    Math.abs(d) * 30
                  }px) translateY(${-Math.abs(d) * 6}px)`,
                  zIndex: Math.round(Math.abs(d)),
                }}
              />
            );
          })}
        </div>
      </div>

      <section id="meet" className="ev-meet">
        <span className="ev-eyebrow">Meet Janus Live</span>
        <h2 className="ev-h2">Your work deserves better than screenshare</h2>
        <p className="ev-sub">
          Conferencing tools compress, drop frames and lag. This stack keeps a
          dedicated media path — sub-second WebRTC for live, Low-Latency HLS for
          scale — so quality survives the trip.
        </p>
      </section>

      <section className="ev-cards">
        {SHOTS.map((s) => (
          <div className="ev-card" key={s.title}>
            <div className="ev-shot" style={{ background: s.grad }}>
              <div className="ev-shot-bar">
                <span />
                <span />
                <span />
              </div>
            </div>
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
          </div>
        ))}
      </section>

      <section id="stats" className="ev-stats">
        <div className="ev-stat">
          <b>4K</b>
          <span>resolution</span>
        </div>
        <div className="ev-stat">
          <b>60</b>
          <span>frames per second</span>
        </div>
        <div className="ev-stat">
          <b>&lt;1s</b>
          <span>glass-to-glass latency</span>
        </div>
      </section>

      <section className="ev-final">
        <h2 className="ev-h2">Focus on the content, not the playback quality</h2>
        <div className="ev-cta-row">
          <Link href="/broadcast">
            <button className="ev-btn">Try it now</button>
          </Link>
          <Link href="/stage">
            <button className="ev-btn ghost">Open a stage</button>
          </Link>
        </div>
      </section>

      <footer className="ev-footer">
        <span>Janus WebRTC Live Demo · Next.js + TypeScript</span>
        <div className="ev-footer-links">
          <a href="https://janus.conf.meetecho.com/" target="_blank" rel="noreferrer">
            Janus
          </a>
          <a href="https://github.com/bluenviron/mediamtx" target="_blank" rel="noreferrer">
            MediaMTX
          </a>
          <a
            href="https://github.com/anhvuFE/janus-webrtc-live-demo"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
