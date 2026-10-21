import { describe, expect, it } from "vitest";
import { investigationReducer } from "@/domain/investigation-reducer";
import { richInvestigation, T2 } from "@/domain/test-fixtures";
import { dropUnsavedCopy, keepUnsavedCopy, readUnsavedCopy, resolveUnsavedCopy } from "./unsaved-copy";

function memoryStore() {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

const stored = richInvestigation("inv-1");
const edited = investigationReducer(stored, {
  type: "setText",
  field: "analysisNotes",
  value: "Typed just before closing",
  now: "2026-10-21T09:00:00.000Z",
});

describe("the safety copy", () => {
  it("keeps, reads back, and drops a copy", () => {
    const store = memoryStore();
    keepUnsavedCopy({ investigation: edited, basedOn: T2 }, store);
    expect(readUnsavedCopy("inv-1", store)).toEqual({ investigation: edited, basedOn: T2, keptAt: expect.any(String) });
    dropUnsavedCopy("inv-1", store);
    expect(readUnsavedCopy("inv-1", store)).toBeNull();
  });

  it("discards copies that are damaged or don't validate", () => {
    const store = memoryStore();
    store.setItem("gospel-labs:unsaved:inv-1", "{not json");
    expect(readUnsavedCopy("inv-1", store)).toBeNull();
    store.setItem("gospel-labs:unsaved:inv-1", JSON.stringify({ investigation: { id: "inv-1" }, basedOn: T2 }));
    expect(readUnsavedCopy("inv-1", store)).toBeNull();
    expect(store.items.size).toBe(0);
  });

  it("does nothing, rather than failing, without storage", () => {
    expect(() => keepUnsavedCopy({ investigation: edited, basedOn: T2 }, null)).not.toThrow();
    expect(readUnsavedCopy("inv-1", null)).toBeNull();
  });
});

describe("resolveUnsavedCopy", () => {
  it("opens the stored version when there's no copy, or the copy was already saved", () => {
    expect(resolveUnsavedCopy(stored, null)).toEqual({ initial: stored, basedOn: stored.updatedAt, restored: false });
    expect(resolveUnsavedCopy(edited, { investigation: edited, basedOn: T2 })).toMatchObject({ restored: false });
  });

  it("restores a copy against the version it was based on", () => {
    expect(resolveUnsavedCopy(stored, { investigation: edited, basedOn: stored.updatedAt })).toEqual({
      initial: edited,
      basedOn: stored.updatedAt,
      restored: true,
    });
    // Another tab saved since: the copy keeps its own base, so saving it will report a conflict.
    const newerElsewhere = { ...stored, updatedAt: "2026-10-21T10:00:00.000Z" };
    expect(resolveUnsavedCopy(newerElsewhere, { investigation: edited, basedOn: T2 })).toMatchObject({
      initial: edited,
      basedOn: T2,
    });
  });
});
