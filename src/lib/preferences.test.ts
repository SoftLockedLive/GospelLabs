import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES, PREFERENCES_STORAGE_KEY, parsePreferences, readPreferences, updatePreferences } from "./preferences";

describe("preferences", () => {
  it("start new learners at Easy, and fall back to it when the stored level can't be read", () => {
    expect(DEFAULT_PREFERENCES.difficulty).toBe("easy");
    expect(parsePreferences({ difficulty: "impossible", studyLength: "deep" })).toMatchObject({ difficulty: "easy", studyLength: "deep" });
    expect(parsePreferences({ difficulty: "hard" }).difficulty).toBe("hard");
  });
});

describe("updatePreferences", () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = new Map();
    const localStorage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => void store.set(key, value) };
    Object.assign(globalThis, { window: { localStorage, dispatchEvent: () => true } });
  });
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("stores only what was changed, so untouched defaults aren't saved as choices", () => {
    updatePreferences({ lastMapVisit: "2026-10-26T21:00:00.000Z" });
    expect(JSON.parse(store.get(PREFERENCES_STORAGE_KEY)!)).toEqual({ lastMapVisit: "2026-10-26T21:00:00.000Z" });
    updatePreferences({ difficulty: "hard" });
    expect(JSON.parse(store.get(PREFERENCES_STORAGE_KEY)!)).toEqual({ lastMapVisit: "2026-10-26T21:00:00.000Z", difficulty: "hard" });
    expect(readPreferences()).toMatchObject({ difficulty: "hard", studyLength: "quick", motion: "system" });
  });

  it("keeps earlier choices when changing another", () => {
    store.set(PREFERENCES_STORAGE_KEY, JSON.stringify({ motion: "off", studyLength: "deep" }));
    updatePreferences((current) => ({ activity: { ...current.activity, offerBranches: false } }));
    expect(JSON.parse(store.get(PREFERENCES_STORAGE_KEY)!)).toEqual({
      motion: "off",
      studyLength: "deep",
      activity: { offerBranches: false, showReflections: true, suggestDifficulty: true },
    });
  });
});
