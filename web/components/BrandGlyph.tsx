// Janus Live brand glyph: a play triangle emitting two broadcast arcs — "live
// stream". White marks, meant to sit centered inside a coloured brand tile
// (.app-mark / .ev-mini-mark / .ev-dark-mark). Presentational, no state.
export function BrandGlyph({ size = "64%" }: { size?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      aria-hidden
    >
      <path d="M7 6 L7 18 L14.5 12 Z" fill="#fff" />
      <path
        d="M16 8.2 A 4.6 4.6 0 0 1 16 15.8"
        stroke="#fff"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M18.4 6 A 7.6 7.6 0 0 1 18.4 18"
        stroke="#fff"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}
