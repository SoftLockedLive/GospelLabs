/**
 * How the player writes progress. Each write reads the stored record in the
 * same transaction, so a save from this page never quietly undoes what
 * another tab stored meanwhile:
 *   - progress made against a newer version of the investigation (a tab
 *     running a newer Gospel Labs) is never replaced; the save fails with a
 *     "version" error and the study carries on in memory;
 *   - a completion or Discovery Card link another tab added is kept
 *     (keepCompletionFromElsewhere).
 * The repository adds its own guards (records it can't read, or written by a
 * newer data version, are never replaced).
 */
import { isFromNewerContent, keepCompletionFromElsewhere, type SeenCompletion } from "@/domain/study/engine/progress";
import type { DiscoveryCard, StudyProgress } from "@/domain/study/user-data";
import { StorageError, toStorageError } from "@/persistence/storage-errors";
import type { StudyRepository } from "@/persistence/study-repository";

export const NEWER_CONTENT_MESSAGE = "This investigation was saved by a newer version of Gospel Labs. Reload to update before continuing.";

async function guard<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw toStorageError(error);
  }
}

function refuseNewerContent(record: StudyProgress, stored: StudyProgress | undefined) {
  if (stored && isFromNewerContent(stored, record)) throw new StorageError("version", { message: NEWER_CONTENT_MESSAGE });
}

/** Saves this page's copy of the progress over the stored record (see above). */
export function saveProgress(repository: StudyRepository, record: StudyProgress, seen: SeenCompletion): Promise<StudyProgress> {
  const { progress } = repository;
  return guard(() =>
    progress.table.db.transaction("rw", progress.table, async () => {
      const stored = await progress.get(record.id);
      refuseNewerContent(record, stored);
      return progress.putInTransaction(keepCompletionFromElsewhere(record, stored, seen));
    }),
  );
}

/** Saves a completed investigation's progress and its Discovery Card together, unless newer progress is stored. */
export function saveCompletion(repository: StudyRepository, record: StudyProgress, card: DiscoveryCard) {
  const { progress, discoveries } = repository;
  return guard(() =>
    progress.table.db.transaction("rw", progress.table, discoveries.table, async () => {
      refuseNewerContent(record, await progress.get(record.id));
      // Runs inside this transaction, so the check and both writes happen together.
      return repository.completeInvestigation(record, card);
    }),
  );
}
