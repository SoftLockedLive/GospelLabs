import { describe, expect, it } from "vitest";
import { registerAutosave, saveAllWork, unsavedDrafts } from "./unsaved-work";

describe("saveAllWork", () => {
  it("flushes every registered autosave and reports whether everything was saved", async () => {
    const calls: string[] = [];
    const removeA = registerAutosave(async () => (calls.push("a"), true));
    const removeB = registerAutosave(async () => (calls.push("b"), false));
    expect(await saveAllWork()).toBe(false);
    expect(calls).toEqual(["a", "b"]);

    removeB();
    expect(await saveAllWork()).toBe(true);
    removeA();
    expect(await saveAllWork()).toBe(true);
  });

  it("starts with no open drafts", () => {
    expect(unsavedDrafts()).toEqual([]);
  });
});
