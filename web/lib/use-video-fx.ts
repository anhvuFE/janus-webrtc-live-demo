"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_FX, type FxSettings } from "./fx-presets";
import { VideoFx } from "./video-fx";

/**
 * Owns a VideoFx instance across a page. `attach` wraps a raw camera stream and
 * returns the processed stream to publish; settings changes are pushed live.
 */
export function useVideoFx(onError?: (m: string) => void) {
  const [settings, setSettings] = useState<FxSettings>(DEFAULT_FX);
  const fxRef = useRef<VideoFx | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const attach = useCallback(
    async (raw: MediaStream): Promise<MediaStream> => {
      fxRef.current?.stop();
      const fx = new VideoFx(raw, settingsRef.current, onError);
      fxRef.current = fx;
      return fx.start();
    },
    [onError]
  );

  const release = useCallback(() => {
    fxRef.current?.stop();
    fxRef.current = null;
  }, []);

  // Push live setting changes into the running pipeline.
  useEffect(() => {
    fxRef.current?.update(settings);
  }, [settings]);

  return { settings, setSettings, attach, release };
}
