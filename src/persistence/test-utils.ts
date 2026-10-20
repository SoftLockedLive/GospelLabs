/** Test helpers: an isolated in-memory IndexedDB per database. */
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { GospelLabsDatabase } from "./db";
import { createInvestigationRepository } from "./investigation-repository";

export function createTestDatabase(): GospelLabsDatabase {
  return new GospelLabsDatabase(`test-${crypto.randomUUID()}`, { indexedDB: new IDBFactory(), IDBKeyRange });
}

export function createTestRepository() {
  const db = createTestDatabase();
  return { db, repository: createInvestigationRepository(db) };
}
