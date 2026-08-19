import Link from "next/link";
import { MediaWall } from "@/components/MediaWall";
import { AppMarquee } from "@/components/AppMarquee";
import { Pricing } from "@/components/Pricing";
import { UseCases } from "@/components/UseCases";
import { BrandGlyph } from "@/components/BrandGlyph";

// Mock conferencing windows shown above the performance stats.
const CALLS = [
  { title: "Zoom Meeting", variant: "zoom", share: "green" },
  { title: "Teams Meeting", variant: "teams", share: "indigo" },
  { title: "Google Meet", variant: "meet", share: "red" },
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

      <section className="ev-calls">
        {CALLS.map((c) => (
          <div className={`ev-call ${c.variant}`} key={c.title}>
            <div className="ev-call-bar">
              <span className="ev-call-dots">
                <i />
                <i />
                <i />
              </span>
              <span className="ev-call-title">{c.title}</span>
            </div>
            <div className="ev-call-strip">
              {["/avatars/8.jpg", "/avatars/15.jpg", "/avatars/25.jpg"].map((a) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={a} src={a} alt="" />
              ))}
            </div>
            <div className="ev-call-stage">
              {/* Placeholder "shared screen" clip: Big Buck Bunny,
                  © Blender Foundation, CC-BY 3.0 (peach.blender.org). */}
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                src="/mock-share.mp4"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
              />
            </div>
            <div className="ev-call-toolbar">
              <i />
              <i />
              <i className={`share ${c.share}`} />
              <i />
              <i />
            </div>
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
        <div className="ev-cta-row" style={{ marginTop: 26 }}>
          <Link href="/broadcast">
            <button className="ev-btn">Try it for free →</button>
          </Link>
        </div>
      </section>

      <AppMarquee />

      <section className="ev-band">
        <span className="ev-eyebrow">For moments that matter</span>
        <h2 className="ev-h2">Showcase your best work</h2>
      </section>
      <UseCases />

      <Pricing />

      <section className="ev-band">
        <h2 className="ev-h2">Supercharge your streaming</h2>
        <p className="ev-sub">
          Share content with unparalleled quality — all within the tools and
          stack you already run.
        </p>
      </section>
      <section className="ev-super">
        <div className="ev-super-card">
          <div className="ev-super-vis ev-super-connect">
            <span className="ev-mini-mark">
              <BrandGlyph />
            </span>
            <span className="ev-super-arrow">→</span>
            <span className="ev-mini-app" style={{ background: "linear-gradient(160deg,#38bdf8,#1d4ed8)" }} />
          </div>
          <strong>Bring up the stack</strong>
          <span>
            <code>docker compose up</code> starts Janus, coturn and MediaMTX.
          </span>
        </div>

        <div className="ev-super-card">
          <div className="ev-super-vis ev-super-apps">
            {["#38bdf8", "#f97316", "#a855f7", "#22c55e", "#ef4444", "#6366f1"].map(
              (c, i) => (
                <span key={i} style={{ background: c }} />
              )
            )}
          </div>
          <strong>Pick a source</strong>
          <span>Camera, screen or any of 100+ apps — publish over WHIP.</span>
        </div>

        <div className="ev-super-card">
          <div className="ev-super-vis ev-super-player">
            <div
              className="ev-super-shot"
              style={{ backgroundImage: "url(/wall/9.jpg)" }}
            />
            <div className="ev-super-panel">
              <i />
              <i />
              <i />
            </div>
          </div>
          <strong>Adjust and go live</strong>
          <span>Set resolution, fps and bitrate, then present with a watermark.</span>
        </div>
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
        <div className="ev-dark-mark">
          <BrandGlyph />
        </div>
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
