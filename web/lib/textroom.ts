// TextRoom chat over a Janus WebRTC data channel.
// Control messages (join/message/leave) are sent as JSON payloads *through the
// data channel* via handle.data(), not as plugin requests.
//
// Docs: https://janus.conf.meetecho.com/docs/textroom.html

import { JANUS_STAGE_ROOM } from "./config";
import type { JanusInstance, JanusPluginHandle } from "./janus-types";

const TEXTROOM = "janus.plugin.textroom";

export interface ChatMessage {
  from: string;
  text: string;
  date: string;
  own: boolean;
}

export interface ChatCallbacks {
  onMessage?: (m: ChatMessage) => void;
  onSystem?: (text: string) => void;
  onError?: (message: string) => void;
}

export interface ChatHandle {
  send: (text: string) => void;
  leave: () => void;
}

const tx = () => Math.random().toString(36).slice(2, 12);

export async function joinChat(
  session: JanusInstance,
  username: string,
  display: string,
  cb: ChatCallbacks
): Promise<ChatHandle> {
  return new Promise((resolve, reject) => {
    let handle: JanusPluginHandle = null;

    session.attach({
      plugin: TEXTROOM,
      opaqueId: `chat-${Date.now()}`,
      success: (h: JanusPluginHandle) => {
        handle = h;
        // Kick off the data-channel negotiation.
        h.send({ message: { request: "setup" } });
      },
      error: (err: unknown) => reject(new Error(String(err))),
      onmessage: (msg: Record<string, unknown>, jsep?: unknown) => {
        if (msg["error"]) cb.onError?.(String(msg["error"]));
        if (jsep) {
          handle.createAnswer({
            jsep,
            tracks: [{ type: "data" }],
            success: (answer: unknown) => {
              handle.send({ message: { request: "ack" }, jsep: answer });
            },
            error: (err: unknown) => reject(new Error(String(err))),
          });
        }
      },
      ondataopen: () => {
        // Data channel is up — join the chat room.
        handle.data({
          text: JSON.stringify({
            textroom: "join",
            transaction: tx(),
            room: JANUS_STAGE_ROOM,
            username,
            display,
          }),
          error: (err: unknown) => cb.onError?.(String(err)),
        });
        resolve({
          send: (text: string) =>
            handle.data({
              text: JSON.stringify({
                textroom: "message",
                transaction: tx(),
                room: JANUS_STAGE_ROOM,
                text,
              }),
            }),
          leave: () => {
            try {
              handle.data({
                text: JSON.stringify({
                  textroom: "leave",
                  transaction: tx(),
                  room: JANUS_STAGE_ROOM,
                }),
              });
            } catch {
              /* ignore */
            }
            handle.detach();
          },
        });
      },
      ondata: (data: string) => {
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(data);
        } catch {
          return;
        }
        switch (msg["textroom"]) {
          case "message":
            cb.onMessage?.({
              from: String(msg["display"] ?? msg["from"] ?? "anon"),
              text: String(msg["text"] ?? ""),
              date: String(msg["date"] ?? ""),
              own: msg["from"] === username,
            });
            break;
          case "join":
            cb.onSystem?.(`${msg["display"] ?? msg["username"]} joined`);
            break;
          case "leave":
            cb.onSystem?.(`${msg["username"]} left`);
            break;
        }
      },
    });
  });
}
