import { describe, expect, it } from "vitest";
import { investigationReducer } from "@/domain/investigation-reducer";
import { blankInvestigation, richInvestigation } from "@/domain/test-fixtures";
import { recoverUnsavedCopies } from "./recovery";
import { createTestRepository } from "./test-utils";
import { keepUnsavedCopy, readUnsavedCopy } from "./unsaved-copy";

function memoryStore() {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    key: (index: number) => [...items.keys()][index] ?? null,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

const note = (investigation = richInvestigation("inv-1"), value = "Recovered", now = "2026-10-21T09:00:00.000Z") =>
  investigationReducer(investigation, { type: "setText", field: "analysisNotes", value, now });

describe("recoverUnsavedCopies", () => {
  it("saves a copy that continues from the stored version, then removes it", async () => {
    const { repository } = createTestRepository();
    const stored = richInvestigation("inv-1");
    await repository.save(stored, null);
    const store = memoryStore();
    keepUnsavedCopy({ investigation: note(), basedOn: stored.updatedAt }, store);

    await recoverUnsavedCopies(repository, { store });
    const loaded = await repository.get("inv-1");
    expect(loaded.status === "found" && loaded.investigation.analysisNotes).toBe("Recovered");
    expect(readUnsavedCopy("inv-1", store)).toBeNull();
  });

  it("recovers a new draft whose first save never finished", async () => {
    const { repository } = createTestRepository();
    const store = memoryStore();
    keepUnsavedCopy({ investigation: note(blankInvestigation(), "First words"), basedOn: null }, store);
    await recoverUnsavedCopies(repository, { store });
    expect((await repository.get("inv-1")).status).toBe("found");
  });

  it("leaves a copy alone when another tab has saved since, so the user can choose", async () => {
    const { repository } = createTestRepository();
    const stored = richInvestigation("inv-1");
    await repository.save(stored, null);
    const newer = note(stored, "Saved by another tab", "2026-10-21T09:00:01.000Z");
    await repository.save(newer, stored.updatedAt);
    const store = memoryStore();
    keepUnsavedCopy({ investigation: note(stored, "From the closed tab"), basedOn: stored.updatedAt }, store);

    await recoverUnsavedCopies(repository, { store });
    const loaded = await repository.get("inv-1");
    expect(loaded.status === "found" && loaded.investigation.analysisNotes).toBe("Saved by another tab");
    expect(readUnsavedCopy("inv-1", store)?.investigation.analysisNotes).toBe("From the closed tab");
  });

  it("keeps a copy whose edit time matches the stored copy but whose content differs", async () => {
    const { repository } = createTestRepository();
    const stored = richInvestigation("inv-1");
    await repository.save(stored, null);
    const sameTime = note(stored, "Saved elsewhere");
    await repository.save(sameTime, stored.updatedAt);
    const store = memoryStore();
    keepUnsavedCopy({ investigation: note(stored, "Different words, same moment"), basedOn: stored.updatedAt }, store);
    await recoverUnsavedCopies(repository, { store });
    expect(readUnsavedCopy("inv-1", store)?.investigation.analysisNotes).toBe("Different words, same moment");
  });

  it("removes copies whose edits were saved after all", async () => {
    const { repository } = createTestRepository();
    const saved = note();
    await repository.save(saved, null);
    const store = memoryStore();
    keepUnsavedCopy({ investigation: saved, basedOn: null }, store);
    await recoverUnsavedCopies(repository, { store });
    expect(readUnsavedCopy("inv-1", store)).toBeNull();
  });

  it("doesn't disturb a tab that is still saving the same edits", async () => {
    const { repository } = createTestRepository();
    const stored = richInvestigation("inv-1");
    await repository.save(stored, null);
    const edited = note(stored);
    const store = memoryStore();
    keepUnsavedCopy({ investigation: edited, basedOn: stored.updatedAt }, store); // the tab was only hidden
    await recoverUnsavedCopies(repository, { store }); // another tab recovers it first
    // The original tab's own save of the same edits then succeeds instead of conflicting.
    expect(await repository.save(edited, stored.updatedAt)).toEqual({ ok: true });
  });
});
