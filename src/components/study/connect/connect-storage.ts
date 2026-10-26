"use client";

/**
 * What Connect with Christ stores on this device: that a session was opened
 * (so the rotation can offer something fresh), the learner's optional private
 * note, and, only when the learner asks, a Discovery Card for the scripture.
 * Nothing is counted, timed, or scored.
 */
import { connectDiscoveryCard, withConnectNote } from "@/domain/study/cards/connect";
import { explorationWithNote, openedExploration } from "@/domain/study/connect-helpers";
import type { ConnectSession, Source } from "@/domain/study/content-schema";
import { explorationId, type DiscoveryCard, type Exploration } from "@/domain/study/user-data";
import { createId } from "@/lib/ids";
import { getStudyRepository } from "@/persistence/client";
import { toStorageError } from "@/persistence/storage-errors";
import type { StudyRepository } from "@/persistence/study-repository";

/**
 * Reads and rewrites a session's exploration in one transaction, so a note and an "opened" stamp never
 * overwrite each other. `change` returns null to leave the record as it is.
 */
async function updateExploration(
  repository: StudyRepository,
  sessionId: string,
  change: (existing: Exploration | undefined) => Exploration | null,
): Promise<void> {
  const { explorations } = repository;
  try {
    await explorations.table.db.transaction("rw", explorations.table, async () => {
      // A stored record that doesn't validate makes get throw, so it is left untouched rather than replaced.
      const existing = await explorations.get(explorationId("connect", sessionId));
      const next = change(existing);
      if (next) await explorations.putInTransaction(next);
    });
  } catch (error) {
    throw toStorageError(error);
  }
}

/** Remembers that the session was opened now. Opening isn't an edit: it sets lastOpenedAt, not updatedAt. */
export function recordSessionOpened(sessionId: string, now = new Date(), repository = getStudyRepository()): Promise<void> {
  return updateExploration(repository, sessionId, (existing) => openedExploration(existing, sessionId, now));
}

/** Saves the learner's private note with the session. The same note again isn't an edit, so nothing is written. */
export function saveSessionNote(sessionId: string, note: string, now = new Date(), repository = getStudyRepository()): Promise<void> {
  return updateExploration(repository, sessionId, (existing) =>
    existing?.note === note ? null : explorationWithNote(existing, sessionId, note, now),
  );
}

/** Saves the session's scripture to the Notebook, or updates the note on the card already saved. */
export function saveSessionCard(input: {
  session: Pick<ConnectSession, "id" | "title" | "question">;
  source: Source;
  note: string;
  existing?: DiscoveryCard;
}): Promise<DiscoveryCard> {
  const now = new Date();
  const card = input.existing
    ? withConnectNote(input.existing, input.note, now)
    : connectDiscoveryCard({ session: input.session, source: input.source, note: input.note, id: createId(), now });
  return getStudyRepository().discoveries.put(card);
}
