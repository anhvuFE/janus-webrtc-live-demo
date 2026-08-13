// Two-row scrolling strip of "app" tiles and media thumbnails (with play
// buttons), mirroring the Evercast integrations marquee. Pure CSS animation.

type Item =
  | { type: "app"; label: string; grad: string }
  | { type: "thumb"; img: string };

const ROW1: Item[] = [
  { type: "app", label: "Kn", grad: "linear-gradient(160deg,#38bdf8,#1d4ed8)" },
  { type: "app", label: "Fig", grad: "linear-gradient(160deg,#2c2c2c,#0a0a0a)" },
  { type: "thumb", img: "/wall/5.jpg" },
  { type: "app", label: "PP", grad: "linear-gradient(160deg,#f97316,#c2410c)" },
  { type: "app", label: "Cap", grad: "linear-gradient(160deg,#60a5fa,#1e3a8a)" },
  { type: "app", label: "Ai", grad: "linear-gradient(160deg,#7c2d12,#f59e0b)" },
  { type: "app", label: "Tr", grad: "linear-gradient(160deg,#2563eb,#1e40af)" },
  { type: "thumb", img: "/wall/9.jpg" },
];

const ROW2: Item[] = [
  { type: "thumb", img: "/wall/3.jpg" },
  { type: "app", label: "Mi", grad: "linear-gradient(160deg,#facc15,#ca8a04)" },
  { type: "app", label: "Qt", grad: "linear-gradient(160deg,#e0f2fe,#38bdf8)" },
  { type: "app", label: "Ps", grad: "linear-gradient(160deg,#0c4a6e,#0369a1)" },
  { type: "app", label: "Au", grad: "linear-gradient(160deg,#818cf8,#4338ca)" },
  { type: "app", label: "Pg", grad: "linear-gradient(160deg,#fb923c,#ea580c)" },
  { type: "thumb", img: "/wall/6.jpg" },
  { type: "app", label: "Sf", grad: "linear-gradient(160deg,#e0f2fe,#2563eb)" },
];

function Tile({ item }: { item: Item }) {
  if (item.type === "app") {
    return (
      <div className="ev-marq-app" style={{ background: item.grad }}>
        {item.label}
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
  // Duplicate the list so the -50% translate loops seamlessly.
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
