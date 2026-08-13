import Link from "next/link";
import { MediaWall } from "@/components/MediaWall";
import { Pricing } from "@/components/Pricing";

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

const SOURCES = [
  "Camera",
  "Screen",
  "OBS",
  "Premiere",
  "Resolve",
  "After Effects",
  "Chrome",
  "Keynote",
  "Figma",
  "Unreal",
  "vMix",
  "Any WHIP",
];

const USE_CASES = [
  { g: "linear-gradient(135deg,#f59e0b,#7c2d12)", t: "Live events", d: "Broadcast keynotes to many viewers." },
  { g: "linear-gradient(135deg,#0ea5e9,#0c4a6e)", t: "Client reviews", d: "Frame-accurate remote approvals." },
  { g: "linear-gradient(135deg,#a855f7,#3b0764)", t: "Town halls", d: "All-hands with low latency at scale." },
  { g: "linear-gradient(135deg,#10b981,#064e3b)", t: "Creative sessions", d: "Shoulder-to-shoulder editing remotely." },
  { g: "linear-gradient(135deg,#f43f5e,#831843)", t: "Product demos", d: "Show a screen/app in crisp quality." },
  { g: "linear-gradient(135deg,#6366f1,#312e81)", t: "Remote teaching", d: "Lectures with chat and recording." },
  { g: "linear-gradient(135deg,#eab308,#713f12)", t: "Watch parties", d: "Synced playback with reactions." },
  { g: "linear-gradient(135deg,#06b6d4,#164e63)", t: "Live sports", d: "Multi-cam feeds, minimal delay." },
];

const STEPS = [
  { n: "01", t: "Bring up the stack", d: "docker compose up starts Janus, coturn and MediaMTX." },
  { n: "02", t: "Open a room", d: "Head to /present or /stage and allow your camera." },
  { n: "03", t: "Go live", d: "Viewers watch on /watch or the buffered /hls path." },
];

const FAQS = [
  { q: "How low is the latency?", a: "The WebRTC path is sub-second glass-to-glass; the buffered LL-HLS path adds a second or two for CDN-friendly scale." },
  { q: "Can I share a screen or app window?", a: "Yes — the WHIP broadcaster can ingest a camera or any screen/application window via getDisplayMedia." },
  { q: "Does it record?", a: "MediaMTX archives every broadcast to fragmented MP4 server-side; browse and review them at /recordings." },
  { q: "Is the media secured?", a: "The demo ships a forensic watermark overlay; a managed deployment adds DRM (Widevine/FairPlay) and encrypted delivery." },
  { q: "How many presenters at once?", a: "The multi-presenter stage uses Janus VideoRoom multistream — everyone publishes and subscribes to all others." },
  { q: "What does it run on?", a: "Everything is Dockerised and works on Intel and Apple Silicon; the client is Next.js + TypeScript." },
];

export default function Home() {
  return (
    <div className="evercast">
      <nav className="ev-nav">
        <div className="ev-logo">
          Janus&nbsp;Live <small>by anhvuFE</small>
        </div>
        <div className="ev-navlinks">
          <a href="#meet">Product</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
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
            <button className="ev-btn">Get started for free →</button>
          </Link>
          <Link href="/hls">
            <button className="ev-btn ghost">Watch demo →</button>
          </Link>
        </div>
      </header>

      <MediaWall />

      <section id="meet" className="ev-band">
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
          <b>&lt;100ms</b>
          <span>average global latency</span>
        </div>
      </section>

      <section className="ev-band">
        <span className="ev-eyebrow">Share media without lag or compression</span>
        <h2 className="ev-h2">Focus on the content, not the playback quality</h2>
        <p className="ev-sub">
          Stream any source — a camera, a screen, or any of 100+ apps — with
          adaptive bitrate and enterprise-grade delivery.
        </p>
        <div className="ev-apps">
          {SOURCES.map((s) => (
            <span className="ev-app" key={s}>
              {s}
            </span>
          ))}
        </div>
      </section>

      <section className="ev-band">
        <span className="ev-eyebrow">For moments that matter</span>
        <h2 className="ev-h2">Showcase your best work</h2>
      </section>
      <section className="ev-usecases">
        {USE_CASES.map((u) => (
          <div className="ev-uc" key={u.t}>
            <div className="ev-uc-img" style={{ background: u.g }} />
            <strong>{u.t}</strong>
            <span>{u.d}</span>
          </div>
        ))}
      </section>

      <Pricing />

      <section className="ev-band">
        <span className="ev-eyebrow">One stack, three steps</span>
        <h2 className="ev-h2">Supercharge your streaming</h2>
      </section>
      <section className="ev-steps">
        {STEPS.map((s) => (
          <div className="ev-step" key={s.n}>
            <span className="ev-step-n">{s.n}</span>
            <strong>{s.t}</strong>
            <span>{s.d}</span>
          </div>
        ))}
      </section>

      <section id="faq" className="ev-band">
        <span className="ev-eyebrow">FAQs</span>
        <h2 className="ev-h2">Have questions?</h2>
      </section>
      <section className="ev-faq">
        {FAQS.map((f) => (
          <details className="ev-faq-item" key={f.q}>
            <summary>
              {f.q}
              <span className="ev-faq-mark" />
            </summary>
            <p>{f.a}</p>
          </details>
        ))}
      </section>

      <section className="ev-dark">
        <div className="ev-dark-mark">JW</div>
        <h2>Looking for full production-grade streaming?</h2>
        <p>
          The same architecture scales to multi-region relays, DRM and 10-bit
          colour. Explore the source and take it all the way.
        </p>
        <Link href="https://github.com/anhvuFE/janus-webrtc-live-demo">
          <button className="ev-btn light">Discover the stack →</button>
        </Link>
      </section>

      <footer className="ev-footer">
        <span>Janus WebRTC Live Demo · Next.js + TypeScript · © 2026 anhvuFE</span>
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
