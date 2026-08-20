// Small inline-SVG status dot used to prefix live/recording labels.
// Inherits the surrounding text color via `currentColor`, so it picks up
// the Chip/badge tone automatically.
export function LiveDot({ size = 8 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 8 8"
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "middle", marginRight: 6 }}
    >
      <circle cx="4" cy="4" r="4" fill="currentColor" />
    </svg>
  );
}
