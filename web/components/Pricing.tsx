"use client";

import Link from "next/link";
import { useState } from "react";

const AVATARS = ["/avatars/12.jpg", "/avatars/32.jpg", "/avatars/45.jpg", "/avatars/5.jpg"];

const ENTERPRISE_FEATURES = [
  "Single sign-on",
  "Forensic watermarking",
  "DRM support",
  "Custom integrations",
  "PO billing",
  "Multi-region relays",
];

function Check() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="9" stroke="#111318" strokeWidth="1.4" />
      <path d="M6 10.2l2.6 2.6L14 7.4" stroke="#111318" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Pricing() {
  const [yearly, setYearly] = useState(true);

  return (
    <section id="pricing" className="ev-band" style={{ maxWidth: 1040 }}>
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
        {/* Starter */}
        <div className="ev-price-card">
          <div className="ev-plan-name">Starter Plan</div>
          <p className="ev-price-tagline">
            For individuals and small teams looking to stream with quality,
            clarity and consistency.
          </p>
          <div className="ev-price">
            ${yearly ? 39 : 49}
            {yearly && <span className="ev-save">Save 20%</span>}
          </div>
          <div className="ev-price-note">
            per user per month{yearly ? ", billed yearly" : ""}
          </div>
          <div className="ev-rating">
            <div className="ev-avatars">
              {AVATARS.map((a) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={a} src={a} alt="" className="ev-avatar" />
              ))}
            </div>
            <span className="ev-stars">★★★★★</span>
            <span className="ev-rating-num">4.9/5</span>
          </div>
          <Link href="/present" className="ev-cta-link">
            <button className="ev-btn ev-btn-block">Try it for free →</button>
          </Link>
        </div>

        {/* Enterprise */}
        <div className="ev-price-card">
          <div className="ev-plan-name">Enterprise Plan</div>
          <p className="ev-price-tagline">
            For organizations looking to scale streaming with custom features
            and services.
          </p>
          <div className="ev-price ev-price-custom">Custom</div>
          <div className="ev-price-note">
            pricing based on seats, usage and feature selection
          </div>
          <div className="ev-feat-grid">
            {ENTERPRISE_FEATURES.map((f) => (
              <div className="ev-feat" key={f}>
                <Check />
                <span>{f}</span>
              </div>
            ))}
          </div>
          <Link href="#">
            <button className="ev-btn ev-btn-block">Let&apos;s talk →</button>
          </Link>
        </div>
      </div>
    </section>
  );
}
