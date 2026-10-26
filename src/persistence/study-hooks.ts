"use client";

/**
 * React hooks for Gospel Labs 2.0 study data. Every hook follows the stored
 * data live (including changes made in other tabs) via Dexie liveQuery, and
 * reports storage failures instead of loading forever. A failure ends a live
 * query, so each hook can read again: `retry()`, and by itself whenever the
 * page is shown again.
 */
import { liveQuery } from "dexie";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DiscoveryCard, Exploration, ExplorationKind, PersonalConnection, StudyProgress } from "@/domain/study/user-data";
import { getStudyRepository } from "./client";
import type { AsyncState } from "./hooks";
import type { RecordList } from "./study-repository";
import { toStorageError } from "./storage-errors";

/** An AsyncState that can be read again after an error. */
export type LiveState<T> = AsyncState<T> & {
  /**
   * Starts the query again. Until it answers, the current state (such as the error) stays, so the page
   * doesn't flash back to loading or lose what is on screen.
   */
  retry: () => void;
};

const LOADING = { status: "loading" } as const;

/**
 * Follows a query live. `key` identifies the query: when it changes, the
 * query restarts. The query must only read from IndexedDB (no other awaits),
 * so liveQuery can track what it reads.
 */
export function useLiveStudyQuery<T>(query: () => Promise<T>, key: string): LiveState<T> {
  const [state, setState] = useState<{ key: string; attempt: number; value: AsyncState<T> }>({ key, attempt: 0, value: LOADING });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const subscription = liveQuery(query).subscribe({
      next: (value) => active && setState({ key, attempt, value: { status: "ready", value } }),
      error: (error: unknown) => active && setState({ key, attempt, value: { status: "error", error: toStorageError(error) } }),
    });
    // liveQuery never reports anything when IndexedDB is missing entirely; load once directly too.
    query().then(
      (value) =>
        active &&
        setState((current) =>
          current.key === key && current.attempt === attempt && current.value.status !== "loading"
            ? current
            : { key, attempt, value: { status: "ready", value } },
        ),
      (error: unknown) => {
        if (!active) return;
        subscription.unsubscribe();
        setState({ key, attempt, value: { status: "error", error: toStorageError(error) } });
      },
    );
    return () => {
      active = false;
      subscription.unsubscribe();
    };
    // The query is identified by `key`; a new function identity alone mustn't restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  const value: AsyncState<T> = state.key === key ? state.value : LOADING;
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  // Storage that failed (for example, closed while another tab upgraded the database) often works again
  // later: try again when the learner comes back to the page.
  const failed = value.status === "error";
  useEffect(() => {
    if (!failed) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") retry();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [failed, retry]);

  // One object per state, so callers can use it as a memo or effect dependency.
  return useMemo(() => ({ ...value, retry }), [value, retry]);
}

const study = () => getStudyRepository();

export function useStudyProgressList(): LiveState<RecordList<StudyProgress>> {
  return useLiveStudyQuery(() => study().progress.readAll(), "progress:all");
}

export function useStudyProgress(investigationId: string): LiveState<StudyProgress | undefined> {
  return useLiveStudyQuery(() => study().progress.get(investigationId), `progress:${investigationId}`);
}

export function useDiscoveryCards(): LiveState<RecordList<DiscoveryCard>> {
  return useLiveStudyQuery(() => study().discoveries.readAll(), "discoveries:all");
}

export function useDiscoveryCard(id: string): LiveState<DiscoveryCard | undefined> {
  return useLiveStudyQuery(() => study().discoveries.get(id), `discoveries:${id}`);
}

export function usePersonalConnections(): LiveState<RecordList<PersonalConnection>> {
  return useLiveStudyQuery(() => study().personalConnections.readAll(), "connections:all");
}

export function useExplorations(kind?: ExplorationKind): LiveState<Exploration[]> {
  return useLiveStudyQuery(
    async () => (await study().explorations.readAll()).records.filter((record) => !kind || record.kind === kind),
    `explorations:${kind ?? "all"}`,
  );
}

export function useExploration(id: string): LiveState<Exploration | undefined> {
  return useLiveStudyQuery(() => study().explorations.get(id), `exploration:${id}`);
}
