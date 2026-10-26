"use client";

/**
 * A DebouncedSaver bound to the page's lifecycle: whatever is pending is
 * saved when the page is hidden or closed, when the component unmounts, and
 * before the app reloads itself for an update (registerAutosave).
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { registerAutosave } from "@/lib/unsaved-work";
import { DebouncedSaver, type SaveStatus } from "./debounced-saver";

export function useSaver<T>(write: (value: T) => Promise<unknown>): { saver: DebouncedSaver<T>; status: SaveStatus } {
  // The write function is fixed for the saver's lifetime; callers pass a stable operation.
  const [saver] = useState(() => new DebouncedSaver<T>(write));
  const status = useSyncExternalStore(saver.subscribe, saver.getStatus, saver.getStatus);

  useEffect(() => {
    const flush = () => void saver.flush();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    const unregister = registerAutosave(async () => {
      await saver.flush();
      return saver.getStatus().state !== "error";
    });
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      unregister();
      void saver.flush();
    };
  }, [saver]);

  return { saver, status };
}
