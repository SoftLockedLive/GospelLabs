/**
 * IndexedDB schema (via Dexie). Personal investigation data lives here; the
 * curated question bank is static JSON and is never stored in this database.
 *
 * Each investigation is one record, including its evidence cards, claims, and
 * challenge responses. New fields inside a record don't need a database
 * version: their defaults are filled in when older records are read (see
 * investigationSchema). To change tables or indexes, add
 * `this.version(2).stores(...).upgrade(...)`; never edit an existing version.
 */
import Dexie, { type DexieOptions, type Table } from "dexie";
import type { Investigation } from "@/domain/investigation";

export const DATABASE_NAME = "gospel-labs";

export class GospelLabsDatabase extends Dexie {
  investigations!: Table<Investigation, string>;

  constructor(name: string = DATABASE_NAME, options?: DexieOptions) {
    super(name, options);
    this.version(1).stores({
      // Primary key first, then indexes used for sorting and filtering.
      investigations: "id, updatedAt, status",
    });
  }
}
