"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createSession, ensureJanus } from "@/lib/janus-client";
import { joinStage, type RemoteFeed, type StageHandle } from "@/lib/stage-client";
import { joinChat, type ChatHandle, type ChatMessage } from "@/lib/textroom";
import type { JanusInstance } from "@/lib/janus-types";
import { TheaterButton } from "@/components/TheaterButton";
import { AppHeader } from "@/components/AppHeader";
import { PageHero } from "@/components/PageHero";
import { FilterPanel } from "@/components/FilterPanel";
import { useVideoFx } from "@/lib/use-video-fx";

type ChatLine =
  | { kind: "msg"; data: ChatMessage }
  | { kind: "system"; text: string };

// key "you" for the local participant, or the numeric feed id as a string.
interface Participant {
  key: string;
  label: string;
  stream: MediaStream | null;
  muted: boolean;
}

// Deterministic hue per display name, so chat avatars/handles get a stable
// colour (YouTube-style) without a lookup table.
function hueFor(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

// A single participant video used in the thumbnail strip. Binds the stream via
// a ref so switching the spotlight never re-attaches the wrong srcObject.
function Thumb({
  participant,
  onClick,
}: {
  participant: Participant;
  onClick: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = participant.stream;
  }, [participant.stream]);
  return (
    <button className="yt-thumb" onClick={onClick} title={`Spotlight ${participant.label}`}>
      <video ref={ref} autoPlay playsInline muted={participant.muted} />
      <span className="yt-tile-label">{participant.label}</span>
    </button>
  );
}

export default function StagePage() {
  const stageElRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<JanusInstance | null>(null);
  const stageRef = useRef<StageHandle | null>(null);
  const chatRef = useRef<ChatHandle | null>(null);
  const rawRef = useRef<MediaStream | null>(null);
  const { settings, setSettings, attach, release } = useVideoFx((m) =>
    setError(m)
  );

  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Enter a name and join the stage");
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [feeds, setFeeds] = useState<Map<number, RemoteFeed>>(new Map());
  const [activeKey, setActiveKey] = useState("you");
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [draft, setDraft] = useState("");

  const username = useMemo(
    () => `${name || "guest"}-${Math.floor(Math.random() * 1e4)}`,
    [name]
  );

  const upsertFeed = useCallback((feed: RemoteFeed) => {
    setFeeds((prev) => {
      const next = new Map(prev);
      next.set(feed.id, feed);
      return next;
    });
  }, []);

  const removeFeed = useCallback((id: number) => {
    setFeeds((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const join = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const raw = await navigator.mediaDevices.getUserMedia({
        video: { frameRate: { ideal: 30 }, width: { ideal: 1280 } },
        audio: true,
      });
      rawRef.current = raw;
      // Run the raw camera through the FX pipeline; preview + publish the
      // processed canvas stream (it drives the local "you" participant tile).
      const processed = await attach(raw);
      setLocalStream(processed);

      await ensureJanus();
      const session = await createSession();
      sessionRef.current = session;

      stageRef.current = await joinStage(
        session,
        name || "Guest",
        {
          onRemoteFeed: upsertFeed,
          onFeedLeft: removeFeed,
          onStatus: setStatus,
          onError: setError,
        },
        processed
      );

      chatRef.current = await joinChat(session, username, name || "Guest", {
        onMessage: (m) =>
          setLines((prev) => [...prev, { kind: "msg", data: m }]),
        onSystem: (text) =>
          setLines((prev) => [...prev, { kind: "system", text }]),
        onError: setError,
      });

      setJoined(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("Failed to join");
    } finally {
      setBusy(false);
    }
  }, [name, username, upsertFeed, removeFeed]);

  const leave = useCallback(() => {
    chatRef.current?.leave();
    chatRef.current = null;
    stageRef.current?.leave();
    stageRef.current = null;
    sessionRef.current?.destroy();
    sessionRef.current = null;
    release();
    rawRef.current?.getTracks().forEach((t) => t.stop());
    rawRef.current = null;
    setLocalStream(null);
    setFeeds(new Map());
    setActiveKey("you");
    setJoined(false);
    setStatus("Left the stage");
  }, [release]);

  useEffect(() => () => leave(), [leave]);

  const sendMessage = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    chatRef.current?.send(text);
    setDraft("");
  }, [draft]);

  const remoteFeeds = [...feeds.values()];
  const participants: Participant[] = [
    {
      key: "you",
      label: `You${name ? ` · ${name}` : ""}`,
      stream: localStream,
      muted: true,
    },
    ...remoteFeeds.map((f) => ({
      key: String(f.id),
      label: f.display ?? `Feed ${f.id}`,
      stream: f.stream,
      muted: false,
    })),
  ];
  // Whoever is in the spotlight; fall back to "You" if the active feed just left.
  const active =
    participants.find((p) => p.key === activeKey) ?? participants[0];
  const thumbs = participants.filter((p) => p.key !== active.key);
  const count = participants.length;

  // Bind the spotlight video to the active participant's stream.
  useEffect(() => {
    if (spotlightRef.current) spotlightRef.current.srcObject = active.stream;
  }, [active.stream, active.key]);

  // Keep the chat pinned to the newest message as it grows.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <main className="container">
      <AppHeader />

      <PageHero
        icon="users"
        eyebrow="Live room"
        title="Stage"
        subtitle="Join the multi-party room — everyone shares camera + chat, YouTube-Live style."
        badge={
          <span className={`badge ${joined ? "live" : ""}`}>
            {joined ? `● Live · ${count}` : "Lobby"}
          </span>
        }
      />

      {error && (
        <div className="error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div className="yt-live">
        <div className="yt-main">
          <div className="yt-stage" ref={stageElRef}>
            <video
              ref={spotlightRef}
              autoPlay
              playsInline
              muted={active.muted}
            />
            {joined && <span className="yt-live-badge">● LIVE</span>}
            <span className="yt-viewers">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {count}
            </span>
            {active.key !== "you" && (
              <span className="yt-spot-label">{active.label}</span>
            )}
            {!active.stream && (
              <div className="video-placeholder">
                <svg
                  className="video-placeholder-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1" />
                  <circle cx="9" cy="7.5" r="3.5" />
                  <path d="M22 19v-1a4 4 0 0 0-3-3.87M16.5 4a4 4 0 0 1 0 7" />
                </svg>
                <strong>{joined ? "Starting your camera…" : "The stage is empty"}</strong>
                <span>
                  {joined
                    ? "Your video will appear here in a moment."
                    : "Enter a name and join to go on stage and start the live."}
                </span>
              </div>
            )}
          </div>

          {thumbs.length > 0 && (
            <div className="yt-thumbs">
              {thumbs.map((p) => (
                <Thumb
                  key={p.key}
                  participant={p}
                  onClick={() => setActiveKey(p.key)}
                />
              ))}
            </div>
          )}

          <div className="yt-meta">
            <h1 className="yt-title">Live on the Janus stage</h1>
            <div className="yt-meta-row">
              <div className="yt-channel">
                <span className="yt-ch-avatar">JL</span>
                <div className="yt-ch-info">
                  <strong>Janus Live</strong>
                  <span>2.5M subscribers</span>
                </div>
                <button className="yt-subscribe" type="button">
                  Subscribe
                </button>
              </div>

              <div className="yt-actions">
                {/* Static YouTube-style affordances (visual only). */}
                <span className="yt-pill yt-like">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3z" />
                    <path d="M7 11l4-8a2 2 0 0 1 2 2v4h5.5a2 2 0 0 1 2 2.3l-1.1 6a2 2 0 0 1-2 1.7H7" />
                  </svg>
                  469
                  <span className="yt-sep" />
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M17 13V4h3a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-3z" />
                    <path d="M17 13l-4 8a2 2 0 0 1-2-2v-4H5.5a2 2 0 0 1-2-2.3l1.1-6a2 2 0 0 1 2-1.7H17" />
                  </svg>
                </span>
                <span className="yt-pill">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
                    <path d="M16 6l-4-4-4 4" />
                    <path d="M12 2v14" />
                  </svg>
                  Share
                </span>
                {joined ? (
                  <>
                    <TheaterButton targetRef={stageElRef} />
                    <button className="danger" onClick={leave}>
                      Leave
                    </button>
                  </>
                ) : (
                  <div className="yt-join">
                    <input
                      className="text-input"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && join()}
                    />
                    <button className="primary" onClick={join} disabled={busy}>
                      {busy ? "Joining…" : "Join"}
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="status" style={{ marginTop: 10 }}>
              <span>{status}</span>
            </div>
          </div>
        </div>

        <aside className="yt-chat">
          <div className="yt-chat-head">
            <span>Live chat</span>
            <span className="yt-chat-count">{count} here</span>
          </div>
          <div className="yt-chat-log" ref={logRef}>
            {lines.length === 0 && (
              <div className="chat-empty">
                <svg
                  className="chat-empty-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M21 11.5a8.5 8.5 0 0 1-11.5 8L4 21l1.5-4.5A8.5 8.5 0 1 1 21 11.5z" />
                </svg>
                <p>{joined ? "Say hi to the room!" : "Join the stage to start chatting."}</p>
              </div>
            )}
            {lines.map((line, i) =>
              line.kind === "system" ? (
                <div key={i} className="yt-msg-sys">
                  {line.text}
                </div>
              ) : (
                <div key={i} className={`yt-msg${line.data.own ? " own" : ""}`}>
                  <span
                    className="yt-msg-av"
                    style={{ background: `hsl(${hueFor(line.data.from)} 52% 42%)` }}
                  >
                    {line.data.from.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="yt-msg-body">
                    <span
                      className="yt-msg-name"
                      style={{ color: `hsl(${hueFor(line.data.from)} 70% 72%)` }}
                    >
                      {line.data.from}
                    </span>
                    <span className="yt-msg-text">{line.data.text}</span>
                  </span>
                </div>
              )
            )}
          </div>
          <div className="yt-chat-input">
            <input
              className="text-input"
              placeholder={joined ? "Chat…" : "Join to chat"}
              value={draft}
              disabled={!joined}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage} disabled={!joined}>
              Send
            </button>
          </div>
        </aside>
      </div>

      <FilterPanel settings={settings} onChange={setSettings} />
    </main>
  );
}
