// Samplers feeding the Quality HUD — Evercast's "4K · 60fps · <100ms" band as a
// live readout. Each sampler returns a flat list of labelled stats; the HUD just
// renders whatever it gets, polling on an interval.

import type Hls from "hls.js";

export interface Stat {
  label: string;
  value: string;
}

// The subset of RTCStats fields we read (RTCStats itself only types type/id/timestamp).
interface RawStat {
  type: string;
  kind?: string;
  frameWidth?: number;
  frameHeight?: number;
  framesPerSecond?: number;
  bytesSent?: number;
  timestamp?: number;
  roundTripTime?: number;
  currentRoundTripTime?: number;
  packetsLost?: number;
  nominated?: boolean;
}

/**
 * Outbound (encoder) stats from a WebRTC sender — resolution, fps, bitrate, RTT,
 * lost packets. Closure keeps the previous byte/timestamp sample for bitrate.
 */
export function makeWebrtcOutboundSampler(
  getPc: () => RTCPeerConnection | null
): () => Promise<Stat[]> {
  let prevBytes = 0;
  let prevTs = 0;

  return async () => {
    const pc = getPc();
    if (!pc) return [];
    const report = await pc.getStats();

    let width = 0;
    let height = 0;
    let fps = 0;
    let bytes = 0;
    let ts = 0;
    let rtt = 0;
    let lost = 0;

    report.forEach((raw) => {
      const s = raw as RawStat;
      if (s.type === "outbound-rtp" && s.kind === "video") {
        width = s.frameWidth ?? width;
        height = s.frameHeight ?? height;
        fps = s.framesPerSecond ?? fps;
        bytes = s.bytesSent ?? bytes;
        ts = s.timestamp ?? ts;
      }
      if (s.type === "remote-inbound-rtp" && s.kind === "video") {
        rtt = s.roundTripTime ?? rtt;
        lost = s.packetsLost ?? lost;
      }
      if (s.type === "candidate-pair" && s.nominated && s.currentRoundTripTime) {
        rtt = s.currentRoundTripTime;
      }
    });

    let kbps = 0;
    if (prevTs && ts > prevTs) {
      kbps = ((bytes - prevBytes) * 8) / (ts - prevTs); // bytes*8 / ms = kbps
    }
    prevBytes = bytes;
    prevTs = ts;

    return [
      { label: "resolution", value: width ? `${width}×${height}` : "—" },
      { label: "fps", value: fps ? String(Math.round(fps)) : "—" },
      { label: "bitrate", value: kbps ? `${(kbps / 1000).toFixed(1)} Mbps` : "—" },
      { label: "rtt", value: rtt ? `${Math.round(rtt * 1000)} ms` : "—" },
      { label: "lost", value: String(lost) },
    ];
  };
}

/** LL-HLS playback stats from the <video> element + hls.js instance. */
export function makeHlsSampler(
  getVideo: () => HTMLVideoElement | null,
  getHls: () => Hls | null
): () => Stat[] {
  return () => {
    const video = getVideo();
    const hls = getHls();
    if (!video) return [];

    const w = video.videoWidth;
    const h = video.videoHeight;
    const buffered =
      video.buffered.length > 0
        ? video.buffered.end(video.buffered.length - 1) - video.currentTime
        : 0;

    const stats: Stat[] = [
      { label: "resolution", value: w ? `${w}×${h}` : "—" },
      { label: "buffer", value: `${buffered.toFixed(1)} s` },
    ];

    if (hls) {
      const latency = hls.latency;
      const bw = hls.bandwidthEstimate;
      stats.push({
        label: "latency",
        value: latency ? `${latency.toFixed(1)} s` : "—",
      });
      stats.push({
        label: "bandwidth",
        value: bw ? `${(bw / 1_000_000).toFixed(1)} Mbps` : "—",
      });
    }
    return stats;
  };
}
