import { ImageResponse } from "next/og";

// Apple touch icon (home-screen bookmark). Rendered as a PNG from the brand
// glyph so there's no binary asset to maintain. Next injects the <link>.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const GLYPH =
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none'>" +
  "<path d='M7 6 L7 18 L14.5 12 Z' fill='#fff'/>" +
  "<path d='M16 8.2 A 4.6 4.6 0 0 1 16 15.8' stroke='#fff' stroke-width='1.9' stroke-linecap='round'/>" +
  "<path d='M18.4 6 A 7.6 7.6 0 0 1 18.4 18' stroke='#fff' stroke-width='1.9' stroke-linecap='round'/>" +
  "</svg>";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #6366f1, #22d3ee)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          width={116}
          height={116}
          src={`data:image/svg+xml;utf8,${encodeURIComponent(GLYPH)}`}
          alt=""
        />
      </div>
    ),
    size
  );
}
