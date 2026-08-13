// Thin promise-friendly wrappers around the vendored janus.js VideoRoom flow.
//
// Two flows are implemented:
//   - Publisher   : presenter joins as `publisher` and pushes camera/mic.
//   - Subscriber  : viewer discovers the active publisher and subscribes to it.
//
// The janus.js plugin handle is untyped (see janus.d.ts) so we call its
// callback-based methods directly and surface progress via the callbacks below.

import { JANUS_ROOM, JANUS_WS, iceServers } from "./config";
import type { JanusInstance, JanusPluginHandle } from "./janus-types";

const VIDEOROOM = "janus.plugin.videoroom";

let initialized = false;

/** Wait for the global janus.js to load, then run Janus.init once. */
export function ensureJanus(): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const wait = () => {
      if (typeof window === "undefined" || !window.Janus) {
        if (Date.now() - start > 10000) {
          reject(new Error("janus.js failed to load (timeout)"));
          return;
        }
        setTimeout(wait, 50);
        return;
      }
      if (initialized) {
        resolve();
        return;
      }
      if (!window.Janus.isWebrtcSupported()) {
        reject(new Error("This browser does not support WebRTC"));
        return;
      }
      window.Janus.init({
        debug: "all",
        callback: () => {
          initialized = true;
          resolve();
        },
      });
    };
    wait();
  });
}

/** Open a Janus session (WebSocket transport). */
export function createSession(): Promise<JanusInstance> {
  return new Promise((resolve, reject) => {
    const janus = new window.Janus({
      server: JANUS_WS,
      iceServers: iceServers(),
      success: () => resolve(janus),
      error: (err) => reject(new Error(String(err))),
    });
  });
}

export interface PublisherCallbacks {
  onLocalStream?: (stream: MediaStream) => void;
  onStatus?: (status: string) => void;
  onError?: (message: string) => void;
}

/**
 * Presenter: attach the VideoRoom plugin, join room as a publisher and push
 * the local camera/mic. Returns a stop() to tear everything down.
 */
export async function startPublishing(
  session: JanusInstance,
  display: string,
  cb: PublisherCallbacks
): Promise<() => void> {
  const localStream = new MediaStream();

  return new Promise((resolve, reject) => {
    let handle: JanusPluginHandle = null;

    session.attach({
      plugin: VIDEOROOM,
      opaqueId: `publisher-${Date.now()}`,
      success: (pluginHandle: JanusPluginHandle) => {
        handle = pluginHandle;
        cb.onStatus?.("Joining room…");
        handle.send({
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
        // Avoid duplicate tracks of the same kind across renegotiations.
        localStream
          .getTracks()
          .filter((t) => t.kind === track.kind)
          .forEach((t) => localStream.removeTrack(t));
        localStream.addTrack(track);
        cb.onLocalStream?.(localStream);
      },
      webrtcState: (isUp: boolean) => {
        cb.onStatus?.(isUp ? "Live — publishing" : "WebRTC down");
      },
      onmessage: (msg: Record<string, unknown>, jsep?: unknown) => {
        const event = msg["videoroom"];
        if (event === "joined") {
          cb.onStatus?.("Joined — starting camera…");
          handle.createOffer({
            tracks: [
              { type: "audio", capture: true, recv: false },
              { type: "video", capture: true, recv: false },
            ],
            success: (offer: unknown) => {
              handle.send({
                message: { request: "configure", audio: true, video: true },
                jsep: offer,
              });
              resolve(() => {
                try {
                  handle.send({ message: { request: "unpublish" } });
                } catch {
                  /* ignore */
                }
                localStream.getTracks().forEach((t) => t.stop());
                handle.hangup();
                handle.detach();
              });
            },
            error: (err: unknown) => {
              cb.onError?.(`Failed to create offer: ${String(err)}`);
              reject(new Error(String(err)));
            },
          });
        } else if (event === "event" && msg["error"]) {
          cb.onError?.(String(msg["error"]));
        }
        if (jsep) {
          handle.handleRemoteJsep({ jsep });
        }
      },
    });
  });
}

export interface SubscriberCallbacks {
  onRemoteStream?: (stream: MediaStream) => void;
  onStatus?: (status: string) => void;
  onError?: (message: string) => void;
  onWaiting?: () => void;
}

/**
 * Viewer: find the active publisher in the room, then subscribe to its feed.
 * Polls `listparticipants` until a publisher appears. Returns a stop().
 */
export async function startWatching(
  session: JanusInstance,
  cb: SubscriberCallbacks
): Promise<() => void> {
  const remoteStream = new MediaStream();
  let stopped = false;

  const feedId = await waitForPublisher(session, cb, () => stopped);
  if (stopped) return () => undefined;
  if (feedId == null) {
    cb.onError?.("No active presenter found in the room.");
    return () => undefined;
  }

  return new Promise((resolve, reject) => {
    let handle: JanusPluginHandle = null;

    session.attach({
      plugin: VIDEOROOM,
      opaqueId: `subscriber-${Date.now()}`,
      success: (pluginHandle: JanusPluginHandle) => {
        handle = pluginHandle;
        cb.onStatus?.("Subscribing to presenter…");
        handle.send({
          message: {
            request: "join",
            room: JANUS_ROOM,
            ptype: "subscriber",
            streams: [{ feed: feedId }],
          },
        });
      },
      error: (err: unknown) => reject(new Error(String(err))),
      onremotetrack: (track: MediaStreamTrack, _mid: string, on: boolean) => {
        if (!on) return;
        remoteStream
          .getTracks()
          .filter((t) => t.kind === track.kind)
          .forEach((t) => remoteStream.removeTrack(t));
        remoteStream.addTrack(track);
        cb.onRemoteStream?.(remoteStream);
      },
      webrtcState: (isUp: boolean) => {
        cb.onStatus?.(isUp ? "Watching — live" : "WebRTC down");
      },
      onmessage: (msg: Record<string, unknown>, jsep?: unknown) => {
        if (msg["error"]) cb.onError?.(String(msg["error"]));
        if (jsep) {
          // Answer the subscriber offer (receive-only).
          handle.createAnswer({
            jsep,
            tracks: [{ type: "data" }],
            success: (answer: unknown) => {
              handle.send({
                message: { request: "start", room: JANUS_ROOM },
                jsep: answer,
              });
              resolve(() => {
                remoteStream.getTracks().forEach((t) => t.stop());
                handle.hangup();
                handle.detach();
              });
            },
            error: (err: unknown) => {
              cb.onError?.(`Failed to create answer: ${String(err)}`);
              reject(new Error(String(err)));
            },
          });
        }
      },
    });
  });
}

/** Polls the room until a participant is actively publishing; returns its feed id. */
function waitForPublisher(
  session: JanusInstance,
  cb: SubscriberCallbacks,
  isStopped: () => boolean
): Promise<number | null> {
  return new Promise((resolve) => {
    let probe: JanusPluginHandle = null;
    let attempts = 0;

    session.attach({
      plugin: VIDEOROOM,
      opaqueId: `probe-${Date.now()}`,
      success: (pluginHandle: JanusPluginHandle) => {
        probe = pluginHandle;
        poll();
      },
      error: () => resolve(null),
      onmessage: (msg: Record<string, unknown>) => {
        const participants = msg["participants"] as
          | Array<Record<string, unknown>>
          | undefined;
        if (!participants) return;
        const publisher = participants.find((p) => p["publisher"] === true);
        if (publisher) {
          probe.detach();
          resolve(Number(publisher["id"]));
        } else {
          cb.onWaiting?.();
          setTimeout(poll, 1500);
        }
      },
    });

    function poll() {
      if (isStopped()) {
        probe?.detach();
        resolve(null);
        return;
      }
      if (attempts++ > 120) {
        probe?.detach();
        resolve(null);
        return;
      }
      probe.send({ message: { request: "listparticipants", room: JANUS_ROOM } });
    }
  });
}
