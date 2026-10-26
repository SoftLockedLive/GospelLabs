import { describe, expect, it } from "vitest";
import { createTestStudyRepository } from "@/persistence/study-test-utils";
import { recordSessionOpened, saveSessionNote } from "./connect-storage";

const FIRST = new Date("2026-10-20T10:00:00.000Z");
const LATER = new Date("2026-10-24T10:00:00.000Z");
const LATEST = new Date("2026-10-26T10:00:00.000Z");
const ID = "connect:jesus-wept";

describe("Connect storage", () => {
  it("records openings without counting them as edits, and a note as an edit", async () => {
    const { study } = createTestStudyRepository();
    await recordSessionOpened("jesus-wept", FIRST, study);
    expect(await study.explorations.get(ID)).toMatchObject({ firstAt: FIRST.toISOString(), updatedAt: FIRST.toISOString(), lastOpenedAt: FIRST.toISOString() });

    await saveSessionNote("jesus-wept", "He wept with them.", LATER, study);
    await recordSessionOpened("jesus-wept", LATEST, study);
    // The same note again changes nothing.
    await saveSessionNote("jesus-wept", "He wept with them.", LATEST, study);
    // A merge keeps the more recently updated copy, so the visit mustn't make this copy look newer than the note.
    expect(await study.explorations.get(ID)).toMatchObject({
      firstAt: FIRST.toISOString(),
      updatedAt: LATER.toISOString(),
      lastOpenedAt: LATEST.toISOString(),
      note: "He wept with them.",
    });
  });

  it("never replaces a stored session record it can't read", async () => {
    const { db, study } = createTestStudyRepository();
    const damaged = { id: ID, kind: "connect", contentId: "jesus-wept", firstAt: "yesterday", updatedAt: "x", note: "Keep me" };
    await db.explorations.put(damaged as never);
    await expect(recordSessionOpened("jesus-wept", LATER, study)).rejects.toMatchObject({ kind: "invalid-data" });
    await expect(saveSessionNote("jesus-wept", "New", LATER, study)).rejects.toMatchObject({ kind: "invalid-data" });
    expect(await db.explorations.get(ID)).toEqual(damaged);
  });
});
