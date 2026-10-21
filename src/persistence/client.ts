"use client";

/**
 * The browser's single database and repository, created on first use so
 * that nothing touches IndexedDB during server rendering. Before the first
 * operation runs, edits left unsaved by a page that closed too soon are
 * recovered (see recovery.ts), so every caller sees them.
 */
import { GospelLabsDatabase } from "./db";
import { createInvestigationRepository, type InvestigationRepository } from "./investigation-repository";
import { recoverUnsavedCopies } from "./recovery";

let repository: InvestigationRepository | null = null;

/**
 * Operations used inside Dexie liveQuery. They mustn't await anything else
 * (that would hide their reads from liveQuery), and needn't: live queries
 * re-run by themselves when recovery writes.
 */
const UNGATED = new Set(["list", "stamp"]);

export function getRepository(): InvestigationRepository {
  if (!repository) {
    const base = createInvestigationRepository(new GospelLabsDatabase());
    const ready = recoverUnsavedCopies(base);
    // Other operations wait for recovery; recovery itself uses the base repository.
    repository = Object.fromEntries(
      Object.entries(base).map(([name, operation]) => [
        name,
        UNGATED.has(name)
          ? operation
          : async (...args: unknown[]) => {
              await ready;
              return (operation as (...args: unknown[]) => unknown)(...args);
            },
      ]),
    ) as InvestigationRepository;
  }
  return repository;
}
