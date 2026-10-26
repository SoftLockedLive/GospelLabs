"use client";

/**
 * The learner's Exploration of one passage: loaded live from IndexedDB, edited
 * in memory, and autosaved (debounced; discrete actions such as saving a
 * highlight go out on the next tick). Editing is allowed only once the stored
 * record has been read. While it loads, or if it can't be read, nothing is
 * written, so an existing exploration is never replaced by a fresh one.
 */
import { useCallback, useRef, useState } from "react";
import { newPassageExploration, passageExplorationId } from "@/domain/study/explorer";
import type { Exploration } from "@/domain/study/user-data";
import { useSaver } from "@/components/study/player/use-saver";
import { getStudyRepository } from "@/persistence/client";
import { useExploration } from "@/persistence/study-hooks";

const writeExploration = (record: Exploration) => getStudyRepository().explorations.put(record);

export type ExplorationChange = (exploration: Exploration, now: string) => Exploration;

export function usePassageExploration(passageId: string) {
  const stored = useExploration(passageExplorationId(passageId));
  const { saver, status } = useSaver(writeExploration);
  // Once the learner changes something, the in-memory copy is the latest. (Study records are last-write-wins.)
  const [local, setLocal] = useState<Exploration | null>(null);
  const latest = useRef<Exploration | null>(null);

  const storedValue = stored.status === "ready" ? stored.value : undefined;
  const exploration = local ?? storedValue;
  /**
   * True only while storage has answered with the record (or that there is none). Not after a failed read:
   * "unknown" isn't "none", and starting a fresh record then would replace the learner's highlights and notes.
   */
  const ready = stored.status === "ready";

  /** Applies a change and schedules its save. Returns false, changing nothing, while editing isn't possible. */
  const update = useCallback(
    (change: ExplorationChange, options: { immediate?: boolean } = {}): boolean => {
      if (!ready) return false;
      const now = new Date().toISOString();
      const base = latest.current ?? storedValue ?? newPassageExploration(passageId, now);
      const next = change(base, now);
      latest.current = next;
      setLocal(next);
      saver.update(next, options);
      return true;
    },
    [passageId, ready, saver, storedValue],
  );

  /** Saves anything pending now (before a related write, such as the Discovery Card). */
  const flush = useCallback(() => saver.flush(), [saver]);

  return {
    exploration,
    ready,
    /** Why stored data couldn't be read, if it couldn't. Editing stays off until it can be. */
    loadError: stored.status === "error" ? stored.error.message : null,
    /** Reads the stored record again after loadError. */
    reload: stored.retry,
    status,
    update,
    flush,
    retry: () => void saver.retry(),
  };
}
