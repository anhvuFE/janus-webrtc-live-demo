import Link from "next/link";

// Hand-drawn line icons (stroke = brand gradient), no emoji / pastel boxes.
const ICON_PATHS: Record<string, React.ReactNode> = {
  present: (
    <>
      <rect x="1.5" y="6" width="14" height="12" rx="2.5" />
      <path d="M15.5 10.5 22 7v10l-6.5-3.5" />
    </>
  ),
  watch: (
    <>
      <path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  stage: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20v-1.5a4 4 0 0 1 4-4h3a4 4 0 0 1 4 4V20" />
      <path d="M16.5 5.2a3.2 3.2 0 0 1 0 6.1" />
      <path d="M18 14.6a4 4 0 0 1 2.5 3.7V20" />
    </>
  ),
  broadcast: (
    <>
      <path d="M4.5 11.5a8 8 0 0 1 8 8" />
      <path d="M4.5 5a15 15 0 0 1 15 15" />
      <circle cx="5.5" cy="18.5" r="1.4" />
    </>
  ),
  play: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M10 8.5 16 12l-6 3.5V8.5Z" />
    </>
  ),
  record: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="12" cy="12" r="3.4" fill="url(#brandStroke)" stroke="none" />
    </>
  ),
};

function Icon({ name }: { name: keyof typeof ICON_PATHS }) {
  return (
    <span className="card-icon">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="url(#brandStroke)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {ICON_PATHS[name]}
      </svg>
    </span>
  );
}

export default function Home() {
  return (
    <>
      {/* Shared gradient used by every line icon's stroke. */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <defs>
          <linearGradient id="brandStroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f21ec9" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>

      <nav className="nav glass">
        <div className="nav-logo">
          <span className="nav-mark">JW</span>
          JANUS&nbsp;LIVE
        </div>
        <div className="nav-links">
          <a href="#low-latency">Live</a>
          <a href="#buffered">Buffered</a>
          <a href="#stack">Stack</a>
        </div>
        <div className="nav-actions">
          <Link className="back" href="/watch" style={{ fontSize: 14 }}>
            Watch
          </Link>
          <Link href="/present">
            <button className="primary">Go live</button>
          </Link>
        </div>
      </nav>

      <main className="container">
        <section className="hero">
          <span className="hero-eyebrow glass">
            <span className="dot" /> WebRTC · Janus · MediaMTX
          </span>
          <h1>
            Watch &amp; stream,
            <br />
            together in real time.
          </h1>
          <p className="lede">
            A runnable slice of a live-streaming platform — sub-second WebRTC
            rooms, a multi-presenter stage with chat, and a buffered
            Low-Latency HLS path with server-side recording.
          </p>
          <div className="hero-search glass">
            <input
              className="text-input"
              placeholder="Room name, video, or presenter…"
              aria-label="Search"
            />
            <Link href="/stage">
              <button className="primary">Join a stage</button>
            </Link>
          </div>
        </section>

        <section id="low-latency">
          <h2 className="section-title">
            Low-latency path · <span className="accent">Janus</span>
          </h2>
          <p className="section-sub">
            Sub-second 1-to-many and many-to-many over WebRTC, powered by the
            Janus VideoRoom &amp; TextRoom plugins.
          </p>
          <div className="cards">
            <Link className="card" href="/present">
              <Icon name="present" />
              <h3>Present</h3>
              <p>
                Go live from your camera. Joins the Janus room as a publisher
                and streams to everyone watching.
              </p>
              <div className="tags">
                <span className="tag">WebRTC</span>
                <span className="tag">Publisher</span>
                <span className="tag">Sub-second</span>
              </div>
            </Link>
            <Link className="card" href="/watch">
              <Icon name="watch" />
              <h3>Watch</h3>
              <p>
                Join as a viewer. Finds the active presenter and subscribes to
                the live WebRTC feed.
              </p>
              <div className="tags">
                <span className="tag">Subscriber</span>
                <span className="tag">Auto-discover</span>
              </div>
            </Link>
            <Link className="card" href="/stage">
              <Icon name="stage" />
              <h3>Stage</h3>
              <p>
                Multi-presenter grid — everyone publishes and subscribes to all
                others, with live data-channel chat.
              </p>
              <div className="tags">
                <span className="tag">Multistream</span>
                <span className="tag">TextRoom chat</span>
              </div>
            </Link>
          </div>
        </section>

        <section id="buffered">
          <h2 className="section-title">
            Buffered path · <span className="accent">MediaMTX</span>
          </h2>
          <p className="section-sub">
            WHIP ingest remuxed to CDN-friendly Low-Latency HLS, with every
            broadcast archived server-side.
          </p>
          <div className="cards">
            <Link className="card" href="/broadcast">
              <Icon name="broadcast" />
              <h3>Broadcast (WHIP)</h3>
              <p>
                Presenter-style ingest — push your camera or a screen/app window
                into MediaMTX over WHIP; remuxed to Low-Latency HLS.
              </p>
              <div className="tags">
                <span className="tag">WHIP</span>
                <span className="tag">Screen share</span>
                <span className="tag">Live stats</span>
              </div>
            </Link>
            <Link className="card" href="/hls">
              <Icon name="play" />
              <h3>LL-HLS Player</h3>
              <p>
                Watch the buffered LL-HLS stream via hls.js — with a live quality
                HUD, forensic watermark and theater mode.
              </p>
              <div className="tags">
                <span className="tag">LL-HLS</span>
                <span className="tag">Watermark</span>
                <span className="tag">Theater</span>
              </div>
            </Link>
            <Link className="card" href="/recordings">
              <Icon name="record" />
              <h3>Recordings</h3>
              <p>
                Browse and play sessions archived server-side by MediaMTX as
                fragmented MP4.
              </p>
              <div className="tags">
                <span className="tag">fMP4</span>
                <span className="tag">Range streaming</span>
              </div>
            </Link>
          </div>
        </section>

        <section className="cta">
          <h2>Ready to go live?</h2>
          <p>
            Spin up the stack with <code>docker compose up</code>, start the
            client, and open a room in two tabs — presenter and viewer.
          </p>
          <Link href="/present">
            <button className="primary">Start now</button>
          </Link>
        </section>

        <p className="quote">
          Some streams watched alone are ordinary —{" "}
          <span className="accent">watching together becomes memories.</span>
        </p>

        <section id="stack">
          <div className="stack" style={{ justifyContent: "center" }}>
            <span className="chip">Janus VideoRoom</span>
            <span className="chip">TextRoom chat</span>
            <span className="chip">WHIP / WebRTC</span>
            <span className="chip">MediaMTX LL-HLS</span>
            <span className="chip">Server-side recording</span>
            <span className="chip">coturn STUN/TURN</span>
            <span className="chip">Next.js + TypeScript</span>
            <span className="chip">Docker Compose</span>
          </div>
        </section>

        <footer className="footer">
          <div className="footer-links">
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
              Source
            </a>
          </div>
          <span>Janus WebRTC Live Demo · Next.js 15 + TypeScript</span>
        </footer>
      </main>
    </>
  );
}
