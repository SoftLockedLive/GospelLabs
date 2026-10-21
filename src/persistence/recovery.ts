/**
 * Applies safety copies left by pages that closed before their last edits
 * were saved (see unsaved-copy.ts). Runs once per page, before the app reads
 * any investigation, so every screen and every export sees recovered edits.
 *
 * Each copy goes through the normal conflict-checked save, against the
 * version it was based on: if anything changed since (another tab saved), the
 * copy is left for the editor, where the user chooses which version to keep.
 * A tab that's still open and saving the same edits is unaffected: saving
 * content identical to what's stored always succeeds.
 */
import { sameContent } from "./backup";
import type { InvestigationRepository } from "./investigation-repository";
import { dropUnsavedCopy, readUnsavedCopy, unsavedCopyIds } from "./unsaved-copy";

type Store = Parameters<typeof unsavedCopyIds>[0];

export async function recoverUnsavedCopies(
  repository: InvestigationRepository,
  { store }: { store?: Store } = {},
): Promise<void> {
  for (const id of unsavedCopyIds(store)) {
    const copy = readUnsavedCopy(id, store);
    if (!copy) continue;
    try {
      const current = await repository.get(id);
      // The page managed to save these edits after all.
      if (current.status === "found" && sameContent(current.investigation, copy.investigation)) {
        dropUnsavedCopy(id, store);
        continue;
      }
      const result = await repository.save(copy.investigation, copy.basedOn);
      if (result.ok) dropUnsavedCopy(id, store);
    } catch {
      // Storage trouble: keep the copy and try again next time.
    }
  }
}
