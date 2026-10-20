"use client";

import { liveQuery } from "dexie";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Investigation } from "@/domain/investigation";
import { AutosaveController, type AutosaveOptions } from "./autosave";
import { getRepository } from "./client";
import type { InvestigationList, LoadResult } from "./investigation-repository";
import { StorageError, toStorageError } from "./storage-errors";

export type AsyncState<T> =
  | { status: "loading" }
  | { status: "ready"; value: T }
  | { status: "error"; error: StorageError };

const listInvestigations = () => getRepository().list();

/**
 * All stored investigations, kept up to date as they change, including
 * changes made in other tabs.
 */
export function useInvestigationList(): AsyncState<InvestigationList> {
  const [state, setState] = useState<AsyncState<InvestigationList>>({ status: "loading" });

  useEffect(() => {
    let active = true;
    const subscription = liveQuery(listInvestigations).subscribe({
      next: (value) => setState({ status: "ready", value }),
      error: (error: unknown) => setState({ status: "error", error: toStorageError(error) }),
    });
    // liveQuery never reports anything when IndexedDB is missing entirely, so
    // also load once directly: that surfaces the error instead of loading forever.
    listInvestigations().then(
      (value) => active && setState((current) => (current.status === "loading" ? { status: "ready", value } : current)),
      (error: unknown) => {
        if (!active) return;
        subscription.unsubscribe();
        setState({ status: "error", error: toStorageError(error) });
      },
    );
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}

/**
 * Loads one investigation once. It deliberately doesn't follow later changes:
 * the open editor owns the data, and autosave detects edits made elsewhere.
 */
export function useStoredInvestigation(id: string): AsyncState<LoadResult> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<LoadResult>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const loadedRef = useRef<string | null>(null);

  useEffect(() => {
    // When a hidden route is shown again its effects re-run; keep the editor's state.
    const key = `${id}#${attempt}`;
    if (loadedRef.current === key) return;
    let cancelled = false;
    getRepository()
      .get(id)
      .then(
        (value) => {
          if (cancelled) return;
          loadedRef.current = key;
          setState({ status: "ready", value });
        },
        (error: unknown) => !cancelled && setState({ status: "error", error: toStorageError(error) }),
      );
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  return { ...state, reload: () => setAttempt((n) => n + 1) };
}

type AutosaveHookOptions = Omit<AutosaveOptions, "save" | "overwrite">;

/**
 * Autosaves `investigation` whenever it changes. Pending edits are flushed
 * when the page is hidden or closed and when the editor unmounts or is
 * hidden by client-side navigation.
 */
export function useAutosave(investigation: Investigation, options: AutosaveHookOptions) {
  const [controller] = useState(
    () =>
      new AutosaveController({
        ...options,
        save: (record, expected) => getRepository().save(record, expected),
        overwrite: (record) => getRepository().overwrite(record),
      }),
  );

  useEffect(() => {
    controller.update(investigation);
  }, [controller, investigation]);

  useEffect(() => {
    const flush = () => void controller.flush();
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!controller.hasUnsavedChanges()) return;
      flush();
      event.preventDefault(); // asks the browser to confirm leaving
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", onBeforeUnload);
      flush();
    };
  }, [controller]);

  const status = useSyncExternalStore(controller.subscribe, controller.getStatus, controller.getStatus);
  return {
    status,
    retry: () => void controller.retry(),
    keepMine: () => void controller.keepMine(),
    /** Drops unsaved edits and reloads the page to show the stored version. */
    discardAndReload: () => {
      controller.discard();
      window.location.reload();
    },
  };
}
