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

  function subscribeTo(publishers: Publisher[]) {
    const fresh = publishers.filter((p) => {
      ensureFeed(p.id, p.display);
      return true;
    });
    if (fresh.length === 0) return;
    const streams = fresh.map((p) => ({ feed: p.id }));

    if (!subHandle) {
      session.attach({
        plugin: VIDEOROOM,
        opaqueId: `stage-sub-${Date.now()}`,
        success: (h: JanusPluginHandle) => {
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
        },
        error: (err: unknown) => cb.onError?.(String(err)),
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
    } else {
      // Already subscribed to someone — just add the new feeds.
      subHandle.send({ message: { request: "subscribe", streams } });
    }
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
            },
            error: (err: unknown) => {
              cb.onError?.(`Failed to create offer: ${String(err)}`);
              reject(new Error(String(err)));
            },
          });
          const existing = (msg["publishers"] as Publisher[]) ?? [];
          if (existing.length) subscribeTo(existing);
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
