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

type ChatLine =
  | { kind: "msg"; data: ChatMessage }
  | { kind: "system"; text: string };

function RemoteTile({ feed }: { feed: RemoteFeed }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = feed.stream;
  }, [feed.stream]);
  return (
    <div className="tile">
      <video ref={ref} autoPlay playsInline />
      <span className="tile-label">{feed.display ?? `Feed ${feed.id}`}</span>
    </div>
  );
}

export default function StagePage() {
  const gridRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const localRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<JanusInstance | null>(null);
  const stageRef = useRef<StageHandle | null>(null);
  const chatRef = useRef<ChatHandle | null>(null);

  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Enter a name and join the stage");
  const [error, setError] = useState<string | null>(null);
  const [feeds, setFeeds] = useState<Map<number, RemoteFeed>>(new Map());
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
      await ensureJanus();
      const session = await createSession();
      sessionRef.current = session;

      stageRef.current = await joinStage(session, name || "Guest", {
        onLocalStream: (stream) => {
          if (localRef.current) localRef.current.srcObject = stream;
        },
        onRemoteFeed: upsertFeed,
        onFeedLeft: removeFeed,
        onStatus: setStatus,
        onError: setError,
      });

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
    if (localRef.current) localRef.current.srcObject = null;
    setFeeds(new Map());
    setJoined(false);
    setStatus("Left the stage");
  }, []);

  useEffect(() => () => leave(), [leave]);

  const sendMessage = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    chatRef.current?.send(text);
    setDraft("");
  }, [draft]);

  const remoteFeeds = [...feeds.values()];

  // Keep the chat pinned to the newest message as it grows.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <main className="container" style={{ maxWidth: 1120 }}>
      <AppHeader
        badge={
          <span className={`badge ${joined ? "live" : ""}`}>
            {joined ? `● On stage · ${remoteFeeds.length + 1} live` : "Lobby"}
          </span>
        }
      />

      <h1 className="page-head">Multi-Presenter Stage</h1>
      <p className="lede" style={{ fontSize: 15, marginBottom: 20 }}>
        Everyone publishes their own camera and subscribes to all others
        (VideoRoom multistream), with live chat over a WebRTC data channel
        (TextRoom). Open this page in several tabs to see the grid fill up.
      </p>

      {!joined && (
        <div className="controls" style={{ marginBottom: 20 }}>
          <input
            className="text-input"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && join()}
          />
          <button className="primary" onClick={join} disabled={busy}>
            {busy ? "Joining…" : "Join stage"}
          </button>
        </div>
      )}

      {error && <div className="error">{error}</div>}
      <div className="status" style={{ marginBottom: 16 }}>
        <span>{status}</span>
      </div>

      <div className="stage-layout">
        <div className="grid" ref={gridRef}>
          <div className="tile tile-you">
            <video ref={localRef} autoPlay playsInline muted />
            <span className="tile-label">
              <i className="tile-dot" />
              You{name ? ` · ${name}` : ""}
            </span>
          </div>
          {remoteFeeds.map((feed) => (
            <RemoteTile key={feed.id} feed={feed} />
          ))}
          {joined && remoteFeeds.length === 0 && (
            <div className="tile tile-ghost">
              <svg
                className="tile-ghost-icon"
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
              <strong>Just you so far</strong>
              <span>Open this page in another tab or share the link to fill the stage.</span>
            </div>
          )}
        </div>

        <aside className="chat">
          <div className="chat-log" ref={logRef}>
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
                <div key={i} className="chat-system">
                  {line.text}
                </div>
              ) : (
                <div
                  key={i}
                  className={`chat-msg${line.data.own ? " own" : ""}`}
                >
                  <span className="chat-from">{line.data.from}</span>
                  <span className="chat-text">{line.data.text}</span>
                </div>
              )
            )}
          </div>
          <div className="chat-input">
            <input
              className="text-input"
              placeholder={joined ? "Message…" : "Join to chat"}
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

      {joined && (
        <div className="controls" style={{ marginTop: 20 }}>
          <button className="danger" onClick={leave}>
            Leave stage
          </button>
          <TheaterButton targetRef={gridRef} />
        </div>
      )}
    </main>
  );
}
