// Two-row scrolling strip of real app icons (Simple Icons glyphs on brand-colour
// tiles) and media thumbnails with play buttons — the Evercast integrations look.

type Item =
  | { type: "app"; icon: string; color: string }
  | { type: "thumb"; img: string };

const ROW1: Item[] = [
  { type: "app", icon: "/apps/figma.svg", color: "#1E1E1E" },
  { type: "app", icon: "/apps/zoom.svg", color: "#2D8CFF" },
  { type: "thumb", img: "/wall/5.jpg" },
  { type: "app", icon: "/apps/chrome.svg", color: "#4285F4" },
  { type: "app", icon: "/apps/blender.svg", color: "#E87D0D" },
  { type: "app", icon: "/apps/resolve.svg", color: "#1A2A3A" },
  { type: "app", icon: "/apps/discord.svg", color: "#5865F2" },
  { type: "thumb", img: "/wall/9.jpg" },
];

const ROW2: Item[] = [
  { type: "thumb", img: "/wall/3.jpg" },
  { type: "app", icon: "/apps/obs.svg", color: "#302E31" },
  { type: "app", icon: "/apps/notion.svg", color: "#111111" },
  { type: "app", icon: "/apps/spotify.svg", color: "#1DB954" },
  { type: "app", icon: "/apps/miro.svg", color: "#050038" },
  { type: "app", icon: "/apps/unreal.svg", color: "#101820" },
  { type: "thumb", img: "/wall/6.jpg" },
  { type: "app", icon: "/apps/meet.svg", color: "#00A67E" },
];

function Tile({ item }: { item: Item }) {
  if (item.type === "app") {
    return (
      <div className="ev-marq-app" style={{ background: item.color }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.icon} alt="" />
      </div>
    );
  }
  return (
    <div className="ev-marq-thumb" style={{ backgroundImage: `url(${item.img})` }}>
      <span className="ev-play" />
    </div>
  );
}

function Row({ items, reverse }: { items: Item[]; reverse?: boolean }) {
  const doubled = [...items, ...items];
  return (
    <div className="ev-marq-track">
      <div className={`ev-marq-row${reverse ? " rev" : ""}`}>
        {doubled.map((it, i) => (
          <Tile key={i} item={it} />
        ))}
      </div>
    </div>
  );
}

export function AppMarquee() {
  return (
    <div className="ev-marquee" aria-hidden>
      <Row items={ROW1} />
      <Row items={ROW2} reverse />
    </div>
  );
}
