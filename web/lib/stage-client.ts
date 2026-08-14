// Multi-presenter "stage": every participant publishes their own camera AND
// subscribes to all other publishers, using Janus VideoRoom multistream (a
// single subscriber handle that carries every remote feed).
//
// Docs: https://janus.conf.meetecho.com/docs/videoroom.html (multistream)

import { JANUS_ROOM } from "./config";
import type { JanusInstance, JanusPluginHandle } from "./janus-types";

const VIDEOROOM = "janus.plugin.videoroom";

interface Publisher {
  id: number;
  display?: string;
}

export interface RemoteFeed {
  id: number;
  display?: string;
  stream: MediaStream;
}

export interface StageCallbacks {
  onLocalStream?: (stream: MediaStream) => void;
  onRemoteFeed?: (feed: RemoteFeed) => void;
  onFeedLeft?: (feedId: number) => void;
  onStatus?: (status: string) => void;
  onError?: (message: string) => void;
}

export interface StageHandle {
  leave: () => void;
}

export async function joinStage(
  session: JanusInstance,
  display: string,
  cb: StageCallbacks
): Promise<StageHandle> {
  const localStream = new MediaStream();
  const feeds = new Map<number, RemoteFeed>();
  const midToFeed = new Map<string, number>();

  let pubHandle: JanusPluginHandle = null;
  let subHandle: JanusPluginHandle = null;
  let privateId: number | undefined;
  // Feeds we've already subscribed to (dedup) + a guard/queue for the async
  // attach so two publishers arriving at once don't spawn two subscriber handles.
  const subscribed = new Set<number>();
  let subAttaching = false;
  let pending: Publisher[] = [];
  let left = false; // set by leave(); guards late async attach callbacks

  function ensureFeed(id: number, display?: string): RemoteFeed {
    let feed = feeds.get(id);
    if (!feed) {
      feed = { id, display, stream: new MediaStream() };
      feeds.set(id, feed);
    } else if (display) {
      feed.display = display;
    }
    return feed;
  }

  function removeFeed(id: number) {
    const feed = feeds.get(id);
    if (!feed) return;
    feed.stream.getTracks().forEach((t) => t.stop());
    for (const [mid, fid] of midToFeed) if (fid === id) midToFeed.delete(mid);
    feeds.delete(id);
    subscribed.delete(id); // allow re-subscribe if this feed republishes
    cb.onFeedLeft?.(id);
  }

  // Map subscriber stream descriptions (mid -> feed id) from attached/updated events.
  function mapStreams(streams: Array<Record<string, unknown>>) {
    for (const s of streams) {
      const mid = s["mid"] as string | undefined;
      const feedId = s["feed_id"] as number | undefined;
      if (mid != null && feedId != null) {
        midToFeed.set(mid, Number(feedId));
        ensureFeed(Number(feedId), s["feed_display"] as string | undefined);
      }
    }
  }

  function doSubscribe(list: Publisher[]) {
    list.forEach((p) => subscribed.add(p.id));
    subHandle.send({
      message: {
        request: "subscribe",
        streams: list.map((p) => ({ feed: p.id })),
      },
    });
  }

  function subscribeTo(publishers: Publisher[]) {
    publishers.forEach((p) => ensureFeed(p.id, p.display));
    // Only feeds we haven't already subscribed to (or queued for subscribe).
    const toAdd = publishers.filter(
      (p) => !subscribed.has(p.id) && !pending.some((q) => q.id === p.id)
    );
    if (toAdd.length === 0) return;

    if (subHandle) {
      doSubscribe(toAdd);
      return;
    }
    if (subAttaching) {
      pending.push(...toAdd);
      return;
    }

    // First subscriber: attach once and join with the initial feeds.
    subAttaching = true;
    toAdd.forEach((p) => subscribed.add(p.id));
    const streams = toAdd.map((p) => ({ feed: p.id }));
    session.attach({
      plugin: VIDEOROOM,
      opaqueId: `stage-sub-${Date.now()}`,
      success: (h: JanusPluginHandle) => {
        subAttaching = false;
        if (left) {
          // User already left before the attach completed — don't join.
          h.detach();
          return;
        }
        subHandle = h;
        h.send({
          message: {
            request: "join",
            room: JANUS_ROOM,
            ptype: "subscriber",
            private_id: privateId,
            streams,
          },
        });
        if (pending.length) {
          const queued = pending;
          pending = [];
          doSubscribe(queued);
        }
      },
      error: (err: unknown) => {
        // Attach failed: unwind state so the user can retry instead of being
        // permanently wedged (subAttaching stuck true, feeds poisoned).
        subAttaching = false;
        toAdd.forEach((p) => subscribed.delete(p.id));
        const queued = pending;
        pending = [];
        cb.onError?.(String(err));
        if (queued.length) subscribeTo(queued);
      },
      onmessage: (msg: Record<string, unknown>, jsep?: unknown) => {
        const streamsInfo = msg["streams"] as
          | Array<Record<string, unknown>>
          | undefined;
        if (streamsInfo) mapStreams(streamsInfo);
        if (jsep) {
          subHandle.createAnswer({
            jsep,
            tracks: [{ type: "data" }],
            success: (answer: unknown) => {
              subHandle.send({
                message: { request: "start", room: JANUS_ROOM },
                jsep: answer,
              });
            },
            error: (err: unknown) => cb.onError?.(String(err)),
          });
        }
      },
      onremotetrack: (track: MediaStreamTrack, mid: string, on: boolean) => {
        const feedId = midToFeed.get(mid);
        if (feedId == null) return;
        const feed = feeds.get(feedId);
        if (!feed) return;
        if (on) {
          feed.stream
            .getTracks()
            .filter((t) => t.kind === track.kind && t.id !== track.id)
            .forEach((t) => feed.stream.removeTrack(t));
          feed.stream.addTrack(track);
          cb.onRemoteFeed?.(feed);
        }
      },
    });
  }

  return new Promise((resolve, reject) => {
    session.attach({
      plugin: VIDEOROOM,
      opaqueId: `stage-pub-${Date.now()}`,
      success: (h: JanusPluginHandle) => {
        pubHandle = h;
        cb.onStatus?.("Joining stage…");
        h.send({
          message: {
            request: "join",
            room: JANUS_ROOM,
            ptype: "publisher",
            display,
          },
        });
      },
      error: (err: unknown) => reject(new Error(String(err))),
      onlocaltrack: (track: MediaStreamTrack, on: boolean) => {
        if (!on) return;
        localStream
          .getTracks()
          .filter((t) => t.kind === track.kind)
          .forEach((t) => localStream.removeTrack(t));
        localStream.addTrack(track);
        cb.onLocalStream?.(localStream);
      },
      webrtcState: (isUp: boolean) => {
        cb.onStatus?.(isUp ? "On stage — live" : "WebRTC down");
      },
      onmessage: (msg: Record<string, unknown>, jsep?: unknown) => {
        const event = msg["videoroom"];
        if (event === "joined") {
          privateId = msg["private_id"] as number;
          cb.onStatus?.("Joined — starting camera…");
          pubHandle.createOffer({
            tracks: [
              { type: "audio", capture: true, recv: false },
              { type: "video", capture: true, recv: false },
            ],
            success: (offer: unknown) => {
              pubHandle.send({
                message: { request: "configure", audio: true, video: true },
                jsep: offer,
              });
              resolve({
                leave: () => {
                  left = true;
                  subAttaching = false;
                  pending = [];
                  subscribed.clear();
                  try {
                    pubHandle.send({ message: { request: "leave" } });
                  } catch {
                    /* ignore */
                  }
                  localStream.getTracks().forEach((t) => t.stop());
                  feeds.forEach((f) =>
                    f.stream.getTracks().forEach((t) => t.stop())
                  );
                  subHandle?.detach();
                  pubHandle.hangup();
                  pubHandle.detach();
                },
              });
              // Subscribe to already-present publishers only after the publisher
              // side is committed, so subHandle can't leak on an offer failure.
              const existing = (msg["publishers"] as Publisher[]) ?? [];
              if (existing.length) subscribeTo(existing);
            },
            error: (err: unknown) => {
              cb.onError?.(`Failed to create offer: ${String(err)}`);
              reject(new Error(String(err)));
            },
          });
        } else if (event === "event") {
          const publishers = msg["publishers"] as Publisher[] | undefined;
          if (publishers && publishers.length) subscribeTo(publishers);
          const gone = msg["leaving"] ?? msg["unpublished"];
          if (gone != null && gone !== "ok") removeFeed(Number(gone));
          if (msg["error"]) cb.onError?.(String(msg["error"]));
        }
        if (jsep) pubHandle.handleRemoteJsep({ jsep });
      },
    });
  });
}
