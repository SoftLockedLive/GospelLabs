"use client";

/**
 * The browser's single database and its repositories, created on first use
 * so that nothing touches IndexedDB during server rendering. Before the first
 * investigation operation runs, edits left unsaved by a page that closed too
 * soon are recovered (see recovery.ts), so every caller sees them.
 */
import { GospelLabsDatabase } from "./db";
import { createInvestigationRepository, type InvestigationRepository } from "./investigation-repository";
import { recoverUnsavedCopies } from "./recovery";
import { createStudyRepository, type StudyRepository } from "./study-repository";

let database: GospelLabsDatabase | null = null;
let repository: InvestigationRepository | null = null;
let studyRepository: StudyRepository | null = null;

function getDatabase(): GospelLabsDatabase {
  database ??= new GospelLabsDatabase();
  return database;
}

/**
 * Operations used inside Dexie liveQuery. They mustn't await anything else
 * (that would hide their reads from liveQuery), and needn't: live queries
 * re-run by themselves when recovery writes.
 */
const UNGATED = new Set(["list", "stamp"]);

export function getRepository(): InvestigationRepository {
  if (!repository) {
    const base = createInvestigationRepository(getDatabase());
    // Start recovery from a timer callback, outside any Dexie zone: if the first caller is a liveQuery
    // (e.g. a list page), recovery's read-write saves would otherwise be refused inside its read-only
    // zone and quietly put off until a later page load.
    const ready = new Promise<void>((resolve) => setTimeout(() => resolve(recoverUnsavedCopies(base)), 0));
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

/** Study data (2.0): progress, Discovery Cards, personal connections, explorations. */
export function getStudyRepository(): StudyRepository {
  studyRepository ??= createStudyRepository(getDatabase());
  return studyRepository;
}
