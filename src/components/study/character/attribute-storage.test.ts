import { describe, expect, it } from "vitest";
import { withNote, withVocabulary } from "@/domain/study/character";
import { createTestStudyRepository } from "@/persistence/study-test-utils";
import { changeAttributeExploration, recordAttributeVisit } from "./attribute-storage";

const FIRST = new Date("2026-10-20T10:00:00.000Z");
const LATER = new Date("2026-10-24T10:00:00.000Z");
const LATEST = new Date("2026-10-26T10:00:00.000Z");

describe("attribute exploration storage", () => {
  it("creates the record on the first visit", async () => {
    const { study } = createTestStudyRepository();
    await recordAttributeVisit(study, "meekness", FIRST);
    expect(await study.explorations.get("attribute:meekness")).toMatchObject({
      kind: "attribute",
      contentId: "meekness",
      firstAt: FIRST.toISOString(),
      updatedAt: FIRST.toISOString(),
      lastOpenedAt: FIRST.toISOString(),
    });
  });

  it("doesn't count a later visit as an edit, so a backup with newer work still wins a merge", async () => {
    const { study } = createTestStudyRepository();
    await recordAttributeVisit(study, "meekness", FIRST);
    await changeAttributeExploration(study, "meekness", (e) => withNote(e, "A thought"), LATER);
    await recordAttributeVisit(study, "meekness", LATEST);
    expect(await study.explorations.get("attribute:meekness")).toMatchObject({
      firstAt: FIRST.toISOString(),
      updatedAt: LATER.toISOString(),
      lastOpenedAt: LATEST.toISOString(),
      note: "A thought",
    });
  });

  it("stamps real changes, and doesn't write a change that makes no difference", async () => {
    const { study } = createTestStudyRepository();
    await changeAttributeExploration(study, "meekness", (e) => withVocabulary(e, "meekness-gentle"), FIRST);
    await changeAttributeExploration(study, "meekness", (e) => withVocabulary(e, "meekness-gentle"), LATER);
    await changeAttributeExploration(study, "meekness", (e) => withNote(e, ""), LATER);
    const stored = await study.explorations.get("attribute:meekness");
    expect(stored).toMatchObject({ vocabulary: ["meekness-gentle"], firstAt: FIRST.toISOString(), updatedAt: FIRST.toISOString() });

    await changeAttributeExploration(study, "meekness", (e) => withNote(e, "Gentle, not weak"), LATEST);
    expect(await study.explorations.get("attribute:meekness")).toMatchObject({ note: "Gentle, not weak", updatedAt: LATEST.toISOString() });
  });

  it("never replaces a stored record it can't read", async () => {
    const { db, study } = createTestStudyRepository();
    // Damaged, but it holds the learner's note.
    const damaged = { id: "attribute:meekness", kind: "attribute", contentId: "meekness", firstAt: "not a date", updatedAt: "x", note: "Keep me" };
    await db.explorations.put(damaged as never);

    await expect(recordAttributeVisit(study, "meekness", LATER)).rejects.toMatchObject({ kind: "invalid-data" });
    await expect(changeAttributeExploration(study, "meekness", (e) => withNote(e, "New"), LATER)).rejects.toMatchObject({
      kind: "invalid-data",
    });
    expect(await db.explorations.get("attribute:meekness")).toEqual(damaged);
  });
});
