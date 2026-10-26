/** Test helpers for study data: an isolated in-memory database and repository. */
import { createTestDatabase } from "./test-utils";
import { createStudyRepository } from "./study-repository";

export function createTestStudyRepository() {
  const db = createTestDatabase();
  return { db, study: createStudyRepository(db) };
}
