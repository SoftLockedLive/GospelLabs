"use client";

/**
 * One learner's session in one investigation. Until the learner acts, the
 * session follows the stored progress live (so another tab's progress shows
 * up); from the first action on, this page owns the progress, every change
 * goes through the pure study reducer, and autosave writes it (typing after a
 * short pause, everything else at once, and whatever is pending when the page
 * is hidden or closed). If storage fails, the study keeps working in memory
 * and the failure is reported.
 *
 * The session never writes over what it couldn't read. While the stored
 * record can't be loaded, it can't be resumed or replaced; the learner may
 * only study without saving for this visit. Progress saved by a newer version
 * of the investigation is shown as it is, read-only: never brought "down to
 * date", never saved over.
 */
import { useMemo, useRef, useState } from "react";
import type { StudyInvestigation } from "@/domain/study/content-schema";
import {
  isFromNewerContent,
  reconcileContentVersion,
  startProgress,
  studyReducer,
  type StudyAction,
  type StudyCommand,
} from "@/domain/study/engine/progress";
import type { StudyProgress } from "@/domain/study/user-data";
import type { Difficulty, StudyLength } from "@/domain/study/vocabulary";
import { getStudyRepository } from "@/persistence/client";
import { useStudyProgress } from "@/persistence/study-hooks";
import type { SaveStatus } from "./debounced-saver";
import { NEWER_CONTENT_MESSAGE, saveProgress } from "./progress-storage";
import { useSaver } from "./use-saver";

/** Why the stored progress can't be started, resumed, or saved over from this page. */
export interface SessionBlock {
  reason: "unreadable" | "newer-content";
  message: string;
}

export interface StudySession {
  /** undefined while loading; null when not started on this device (or when the stored record couldn't be read). */
  progress: StudyProgress | null | undefined;
  /** The stored progress couldn't be read. */
  loadError: string | null;
  /**
   * Until this page takes over: why it can't start or resume as usual. "unreadable": the stored record
   * couldn't be read, so starting studies without saving. "newer-content": a newer version of Gospel Labs
   * saved it, so it is read-only here.
   */
  blocked: SessionBlock | null;
  /** This page is studying without saving (chosen while the stored record couldn't be read): why. */
  unsaved: string | null;
  /** The stored progress was made against an earlier version of this investigation. */
  contentUpdated: boolean;
  saveStatus: SaveStatus;
  retrySave: () => void;
  /** Applies commands in order, stamped with the current time, and saves the result. Null when there is nothing to act on. */
  dispatch: (commands: StudyCommand | readonly StudyCommand[], options?: { typing?: boolean }) => StudyProgress | null;
  /** Starts (or, with existing progress, resumes with these settings). Null for progress from a newer version. */
  start: (options: { difficulty: Difficulty; length: StudyLength }) => StudyProgress | null;
  /** Takes over a record saved elsewhere (with its Discovery Card). */
  adopt: (progress: StudyProgress) => void;
  /** Saves anything pending now. */
  flush: () => Promise<void>;
}

/** Fixed when this page takes over: whether the stored record was older content, and why (if at all) nothing is saved. */
interface Takeover {
  contentUpdated: boolean;
  unsaved: string | null;
}

const now = () => new Date().toISOString();

function apply(investigation: StudyInvestigation, progress: StudyProgress, commands: readonly StudyCommand[], time: string): StudyProgress {
  return commands.reduce((state, command) => studyReducer(investigation, state, { ...command, now: time } as StudyAction), progress);
}

export function useStudySession(investigation: StudyInvestigation): StudySession {
  const stored = useStudyProgress(investigation.id);
  // undefined: follow the stored record; otherwise this page's own copy.
  const [local, setLocal] = useState<StudyProgress | undefined>(undefined);
  const latest = useRef<StudyProgress | undefined>(undefined);
  const takeover = useRef<Takeover | null>(null);
  const [taken, setTaken] = useState<Takeover | null>(null);
  // Completion stamps and card links this page has had, so saving keeps only the ones another tab added.
  const seen = useRef({ completedAt: new Set<string>(), discoveryId: new Set<string>() });
  const [write] = useState(() => (record: StudyProgress) => saveProgress(getStudyRepository(), record, seen.current));
  const { saver, status: saveStatus } = useSaver<StudyProgress>(write);

  const storedValue = stored.status === "ready" ? stored.value : undefined;
  const loadError = stored.status === "error" ? stored.error.message : null;
  const storedIsNewer = !!storedValue && isFromNewerContent(storedValue, investigation);
  const storedIsOlder = !!storedValue && storedValue.contentVersion < investigation.contentVersion;
  // Brought up to date with the content for display; stamped with the record's own time so rendering stays pure.
  // Progress from newer content comes back unchanged.
  const fromStorage = useMemo(
    () => (storedValue ? reconcileContentVersion(investigation, storedValue, storedValue.updatedAt) : null),
    [investigation, storedValue],
  );
  const progress = local ?? (stored.status === "loading" ? undefined : fromStorage);
  const blocked: SessionBlock | null = taken
    ? null
    : loadError !== null
      ? { reason: "unreadable", message: loadError }
      : storedIsNewer
        ? { reason: "newer-content", message: NEWER_CONTENT_MESSAGE }
        : null;

  function note(record: StudyProgress | undefined) {
    if (record?.completedAt) seen.current.completedAt.add(record.completedAt);
    if (record?.discoveryId) seen.current.discoveryId.add(record.discoveryId);
  }

  function takeOver(): Takeover {
    if (takeover.current) return takeover.current;
    const decided: Takeover = { contentUpdated: storedIsOlder, unsaved: loadError };
    takeover.current = decided;
    setTaken(decided);
    // The record this page starts from: its completion is known here, so clearing it (restarting) is deliberate.
    note(storedValue);
    return decided;
  }

  function commit(next: StudyProgress, typing: boolean) {
    const { unsaved } = takeOver();
    latest.current = next;
    note(next);
    setLocal(next);
    if (unsaved === null) saver.update(next, { immediate: !typing });
  }

  /** The progress actions apply to: this page's copy, else the stored one brought up to date (never newer-content progress). */
  function current(): StudyProgress | null {
    if (latest.current) return latest.current;
    if (!storedValue || storedIsNewer) return null;
    return reconcileContentVersion(investigation, storedValue, now());
  }

  return {
    progress,
    loadError,
    blocked,
    unsaved: taken?.unsaved ?? null,
    contentUpdated: taken ? taken.contentUpdated : storedIsOlder,
    saveStatus,
    retrySave: () => void saver.retry(),
    dispatch(commands, options = {}) {
      const base = current();
      if (!base) return null;
      const time = now();
      const list = Array.isArray(commands) ? commands : [commands as StudyCommand];
      const next = apply(investigation, base, list, time);
      if (next !== base || !latest.current) commit(next, !!options.typing);
      return next;
    },
    start({ difficulty, length }) {
      if (!latest.current && storedIsNewer) return null;
      const base = current();
      const time = now();
      const settings: StudyCommand[] = [
        { type: "setDifficulty", difficulty },
        { type: "setLength", length },
      ];
      const next = base ? apply(investigation, base, settings, time) : startProgress(investigation, { difficulty, length, now: time });
      commit(next, false);
      return next;
    },
    adopt(record) {
      takeOver();
      latest.current = record;
      note(record);
      setLocal(record);
      saver.markSaved(record);
    },
    flush: () => saver.flush(),
  };
}
