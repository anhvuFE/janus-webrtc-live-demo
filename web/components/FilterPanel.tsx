"use client";

import {
  ACCESSORIES,
  BACKGROUNDS,
  COLOR_PRESETS,
  DECALS,
  EFFECTS,
  FRAMES,
  type DecalKind,
  type FxSettings,
} from "@/lib/fx-presets";

// Control surface for the live video FX pipeline. Presentational only — state
// lives in the page's useVideoFx() hook.
export function FilterPanel({
  settings,
  onChange,
}: {
  settings: FxSettings;
  onChange: (next: FxSettings) => void;
}) {
  const set = (patch: Partial<FxSettings>) => onChange({ ...settings, ...patch });

  const addSticker = (kind: DecalKind) => {
    const jitter = () => 0.5 + (Math.random() - 0.5) * 0.24;
    set({
      stickers: [
        ...settings.stickers,
        {
          id: `${kind}-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
          kind,
          x: jitter(),
          y: jitter(),
          scale: 1,
        },
      ],
    });
  };

  return (
    <div className="fx-panel">
      <div className="fx-group">
        <span className="fx-label">Filter</span>
        <div className="fx-chips">
          {COLOR_PRESETS.map((p) => (
            <button
              key={p.id}
              className={`fx-chip${settings.preset === p.id ? " active" : ""}`}
              onClick={() => set({ preset: p.id })}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="fx-group">
        <span className="fx-label">Adjust</span>
        <Slider label="Brightness" min={0.6} max={1.4} value={settings.brightness} onChange={(v) => set({ brightness: v })} />
        <Slider label="Contrast" min={0.6} max={1.4} value={settings.contrast} onChange={(v) => set({ contrast: v })} />
        <Slider label="Saturation" min={0} max={2} value={settings.saturate} onChange={(v) => set({ saturate: v })} />
        <Slider label="Skin smoothing" min={0} max={1} value={settings.smooth} onChange={(v) => set({ smooth: v })} />
      </div>

      <div className="fx-group">
        <span className="fx-label">Background</span>
        <div className="fx-chips">
          {BACKGROUNDS.map((b) => {
            const active =
              (b.id === "none" && settings.background === "none") ||
              (b.id === "blur" && settings.background === "blur") ||
              (settings.background === "image" && settings.backgroundImage === b.url);
            return (
              <button
                key={b.id}
                className={`fx-chip${active ? " active" : ""}`}
                onClick={() =>
                  set(
                    b.id === "none"
                      ? { background: "none", backgroundImage: undefined }
                      : b.id === "blur"
                      ? { background: "blur", backgroundImage: undefined }
                      : { background: "image", backgroundImage: b.url }
                  )
                }
              >
                {b.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="fx-group">
        <span className="fx-label">Face accessory</span>
        <div className="fx-chips">
          {ACCESSORIES.map((a) => (
            <button
              key={a.id}
              className={`fx-chip${settings.accessory === a.id ? " active" : ""}`}
              onClick={() => set({ accessory: a.id })}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="fx-group">
        <span className="fx-label">Frame</span>
        <div className="fx-chips">
          {FRAMES.map((f) => (
            <button
              key={f.id}
              className={`fx-chip${settings.frame === f.id ? " active" : ""}`}
              onClick={() => set({ frame: f.id })}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="fx-group">
        <span className="fx-label">Effect</span>
        <div className="fx-chips">
          {EFFECTS.map((e) => (
            <button
              key={e.id}
              className={`fx-chip${settings.effect === e.id ? " active" : ""}`}
              onClick={() => set({ effect: e.id })}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      <div className="fx-group">
        <span className="fx-label">
          Stickers{settings.stickers.length ? ` · ${settings.stickers.length}` : ""}
        </span>
        <div className="fx-chips">
          {DECALS.map((d) => (
            <button
              key={d.kind}
              className="fx-chip"
              onClick={() => addSticker(d.kind)}
            >
              {d.label}
            </button>
          ))}
          {settings.stickers.length > 0 && (
            <button
              className="fx-chip"
              onClick={() => set({ stickers: [] })}
              style={{ borderColor: "rgba(244,63,94,0.5)", color: "#ffd7dd" }}
            >
              Clear
            </button>
          )}
        </div>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          Tap to add · drag on the video to move
        </span>
      </div>
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="fx-slider">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
