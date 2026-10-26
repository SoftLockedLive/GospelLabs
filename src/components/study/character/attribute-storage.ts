/**
 * Writes to an attribute's Exploration record. Each write reads the stored
 * record and saves the result in one transaction, so changes made in another
 * tab in between are never overwritten.
 *
 *   - A visit creates the record the first time (firstAt = updatedAt = now)
 *     and afterwards changes only lastOpenedAt. updatedAt moves only for real
 *     work, because backup merges keep the more recently updated copy and a
 *     visit must never outrank a copy with the learner's notes in it.
 *   - A change that leaves the record as it was isn't written at all.
 *   - A stored record that this version can't read is reported (StorageError
 *     "invalid-data"), never replaced by a fresh one.
 */
import { attributeExplorationId, newAttributeExploration } from "@/domain/study/character";
import type { Exploration } from "@/domain/study/user-data";
import { toStorageError } from "@/persistence/storage-errors";
import type { StudyRepository } from "@/persistence/study-repository";

/** Given the stored record (or undefined), the record to save, or null to leave it as it is. */
type Decide = (current: Exploration | undefined) => Exploration | null;

async function write(repository: StudyRepository, attributeId: string, decide: Decide): Promise<Exploration | undefined> {
  const { explorations } = repository;
  const id = attributeExplorationId(attributeId);
  try {
    return await explorations.table.db.transaction("rw", explorations.table, async () => {
      // Throws for a stored record that fails validation, so it is never mistaken for "no record yet".
      const current = await explorations.get(id);
      const next = decide(current);
      return next ? explorations.putInTransaction(next) : current;
    });
  } catch (error) {
    throw toStorageError(error);
  }
}

const unchanged = (a: Exploration, b: Exploration) => JSON.stringify(a) === JSON.stringify(b);

/** Records that the attribute page was opened. */
export function recordAttributeVisit(repository: StudyRepository, attributeId: string, now: Date): Promise<Exploration | undefined> {
  const at = now.toISOString();
  return write(repository, attributeId, (current) => ({ ...(current ?? newAttributeExploration(attributeId, now)), lastOpenedAt: at }));
}

/**
 * Applies the learner's change (a word opened, an activity finished, a note) and stamps updatedAt. Resolves
 * to the stored record, unchanged and unwritten if the change made no difference.
 */
export function changeAttributeExploration(
  repository: StudyRepository,
  attributeId: string,
  change: (exploration: Exploration) => Exploration,
  now: Date,
): Promise<Exploration | undefined> {
  return write(repository, attributeId, (current) => {
    const base = current ?? newAttributeExploration(attributeId, now);
    const next = change(base);
    return current && unchanged(next, current) ? null : { ...next, updatedAt: now.toISOString() };
  });
}
