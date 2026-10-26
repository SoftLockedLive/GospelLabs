/**
 * IndexedDB schema (via Dexie). Personal data lives here; curated content
 * (question bank, study investigations, attributes, passages) is static JSON
 * and is never stored in this database.
 *
 * Version history (never edit an existing version; add a new one):
 *   1  Gospel Labs 1.0/1.1: `investigations` (research notebooks).
 *   2  Gospel Labs 2.0: adds `studyProgress`, `discoveries`,
 *      `personalConnections`, and `explorations`. Purely additive: the
 *      investigations table and its records are untouched, so no data
 *      migration runs. Dexie 4 opens a database at a higher version than it
 *      declares, so a 1.1 tab (or a rollback to 1.1) can still open this
 *      database and read investigations; it simply ignores the new tables.
 *
 * New fields inside a record don't need a database version: their defaults
 * are filled in when older records are read (see the Zod schemas).
 */
import Dexie, { type DexieOptions, type Table } from "dexie";
import type { Investigation } from "@/domain/investigation";
import type { DiscoveryCard, Exploration, PersonalConnection, StudyProgress } from "@/domain/study/user-data";

export const DATABASE_NAME = "gospel-labs";

export class GospelLabsDatabase extends Dexie {
  investigations!: Table<Investigation, string>;
  studyProgress!: Table<StudyProgress, string>;
  discoveries!: Table<DiscoveryCard, string>;
  personalConnections!: Table<PersonalConnection, string>;
  explorations!: Table<Exploration, string>;

  constructor(name: string = DATABASE_NAME, options?: DexieOptions) {
    super(name, options);
    this.version(1).stores({
      // Primary key first, then indexes used for sorting and filtering.
      investigations: "id, updatedAt, status",
    });
    this.version(2).stores({
      studyProgress: "id, updatedAt",
      discoveries: "id, updatedAt, createdAt",
      personalConnections: "id, updatedAt",
      explorations: "id, kind, updatedAt",
    });
  }
}
