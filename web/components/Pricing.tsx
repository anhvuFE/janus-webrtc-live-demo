"use client";

import Link from "next/link";
import { useState } from "react";

// Pricing block with a Monthly/Yearly toggle, mirroring the reference layout.
export function Pricing() {
  const [yearly, setYearly] = useState(true);
  const teamPrice = yearly ? 29 : 39;

  return (
    <section id="pricing" className="ev-band">
      <span className="ev-eyebrow">Plans &amp; pricing</span>
      <h2 className="ev-h2">For teams of all sizes</h2>
      <p className="ev-sub">
        Run the whole stack yourself for free, or let us host it at scale with
        multi-region relays and studio-grade security.
      </p>

      <div className="ev-toggle" role="tablist" aria-label="Billing period">
        <button
          className={`ev-toggle-item${!yearly ? " active" : ""}`}
          onClick={() => setYearly(false)}
        >
          Monthly
        </button>
        <button
          className={`ev-toggle-item${yearly ? " active" : ""}`}
          onClick={() => setYearly(true)}
        >
          Yearly
        </button>
      </div>

      <div className="ev-pricing">
        <div className="ev-price-card">
          <div className="ev-price-name">Self-host</div>
          <p className="ev-price-tagline">
            For builders who want the full stack, open source.
          </p>
          <div className="ev-price">
            $0<span>/forever</span>
          </div>
          <Link href="https://github.com/anhvuFE/janus-webrtc-live-demo">
            <button className="ev-btn" style={{ width: "100%" }}>
              Clone the repo
            </button>
          </Link>
          <ul className="ev-price-list">
            <li>Janus + MediaMTX + coturn via Docker</li>
            <li>Every feature in this demo</li>
            <li>Self-signed DTLS, single region</li>
            <li>Community support</li>
          </ul>
        </div>

        <div className="ev-price-card featured">
          <div className="ev-price-name">
            Team <span className="ev-price-badge">Popular</span>
          </div>
          <p className="ev-price-tagline">Managed streaming with room to grow.</p>
          <div className="ev-price">
            ${teamPrice}
            <span>/user · {yearly ? "yr billed" : "mo"}</span>
          </div>
          <Link href="#">
            <button className="ev-btn" style={{ width: "100%" }}>
              Start free trial
            </button>
          </Link>
          <ul className="ev-price-list">
            <li>Everything in Self-host</li>
            <li>Multi-region forwarding &amp; TURN</li>
            <li>DRM + forensic watermarking</li>
            <li>SSO, admin portal, priority support</li>
          </ul>
        </div>

        <div className="ev-price-card">
          <div className="ev-price-name">Enterprise</div>
          <p className="ev-price-tagline">
            For studios with custom scale and compliance.
          </p>
          <div className="ev-price ev-price-custom">Custom</div>
          <Link href="#">
            <button className="ev-btn ghost" style={{ width: "100%" }}>
              Let&apos;s talk
            </button>
          </Link>
          <ul className="ev-price-list">
            <li>On-prem / private cloud deployment</li>
            <li>Custom integrations &amp; SLAs</li>
            <li>Dedicated multi-region capacity</li>
            <li>PO billing &amp; security review</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
