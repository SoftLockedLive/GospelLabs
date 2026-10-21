/**
 * Work on this page that hasn't reached storage yet: autosave queues, which
 * can be flushed, and open forms whose input exists only on screen. Reloading
 * (for example, to update the app) checks here first so nothing is lost.
 */
import { useEffect } from "react";

/** Saves whatever is pending; resolves true when nothing is left unsaved. */
type Flush = () => Promise<boolean>;

const flushes = new Set<Flush>();
const openDrafts = new Map<symbol, string>();

export function registerAutosave(flush: Flush): () => void {
  flushes.add(flush);
  return () => void flushes.delete(flush);
}

/** Names of open forms with input that would be lost on reload, e.g. "New evidence". */
export function unsavedDrafts(): string[] {
  return [...new Set(openDrafts.values())];
}

/** Flushes every autosave queue. Resolves false if anything couldn't be saved. */
export async function saveAllWork(): Promise<boolean> {
  const results = await Promise.all([...flushes].map((flush) => flush()));
  return results.every(Boolean);
}

/**
 * Marks a form as holding unsaved input while `dirty` is true: the browser
 * asks before closing or reloading the page, and the update notice names it.
 */
export function useUnsavedDraft(dirty: boolean, label: string): void {
  useEffect(() => {
    if (!dirty) return;
    const key = Symbol(label);
    openDrafts.set(key, label);
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      openDrafts.delete(key);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [dirty, label]);
}
