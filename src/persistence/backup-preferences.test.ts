import { describe, expect, it, vi } from "vitest";
import { DEFAULT_PREFERENCES, PREFERENCES_STORAGE_KEY, type Preferences } from "@/lib/preferences";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import { readStoredPreferences, restoreBackupPreferences, type PreferenceWriters } from "./backup-preferences";
import { PREFERENCES_FROM_2_0 } from "./legacy-fixtures";

const storage = (values: Record<string, string>) => ({ getItem: (key: string) => values[key] ?? null });

describe("reading preferences for a backup", () => {
  it("includes the theme and every valid stored preference", () => {
    const stored = storage({
      [THEME_STORAGE_KEY]: "dawn",
      [PREFERENCES_STORAGE_KEY]: JSON.stringify({
        motion: "subtle",
        studyLength: "deep",
        difficulty: "hard",
        activity: { offerBranches: true, showReflections: false, suggestDifficulty: true },
        lastMapVisit: "2026-10-25T00:00:00.000Z",
      }),
    });
    expect(readStoredPreferences(stored)).toEqual(PREFERENCES_FROM_2_0);
  });

  it("leaves out what isn't stored, so restoring it elsewhere changes nothing there", () => {
    expect(readStoredPreferences(storage({}))).toEqual({});
    expect(readStoredPreferences(storage({ [THEME_STORAGE_KEY]: "light" }))).toEqual({ theme: "light" });
  });

  it("leaves out invalid and unknown values, and a theme stored anywhere but its own key", () => {
    const stored = storage({
      [THEME_STORAGE_KEY]: "neon",
      [PREFERENCES_STORAGE_KEY]: JSON.stringify({ theme: "dark", motion: "wild", difficulty: "easy", fontSize: 3 }),
    });
    expect(readStoredPreferences(stored)).toEqual({ difficulty: "easy" });
  });

  it("never throws: damaged JSON, blocked storage, or no storage give no preferences", () => {
    expect(readStoredPreferences(storage({ [PREFERENCES_STORAGE_KEY]: "{not json" }))).toEqual({});
    expect(readStoredPreferences(storage({ [PREFERENCES_STORAGE_KEY]: "[1]" }))).toEqual({});
    const blocked = {
      getItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
    };
    expect(readStoredPreferences(blocked)).toEqual({});
    expect(readStoredPreferences(undefined)).toEqual({});
  });
});

describe("restoring a backup's preferences", () => {
  function writers(current: Preferences = DEFAULT_PREFERENCES) {
    const applied: { theme?: string; preferences?: Preferences } = {};
    const fake: PreferenceWriters = {
      setTheme: vi.fn((theme) => {
        applied.theme = theme;
      }),
      update: vi.fn((change) => {
        applied.preferences = { ...current, ...change(current) };
      }),
    };
    return { fake, applied };
  }

  it("applies the theme and every preference in the backup", () => {
    const { fake, applied } = writers();
    expect(restoreBackupPreferences(PREFERENCES_FROM_2_0, fake)).toBe(true);
    expect(applied).toEqual({
      theme: "dawn",
      preferences: { ...DEFAULT_PREFERENCES, ...PREFERENCES_FROM_2_0, theme: undefined },
    });
  });

  it("changes only what the backup carries, merging activity options", () => {
    const current: Preferences = { ...DEFAULT_PREFERENCES, difficulty: "complex", lastMapVisit: "2026-10-01T00:00:00.000Z" };
    const { fake, applied } = writers(current);
    restoreBackupPreferences({ activity: { showReflections: false } }, fake);
    expect(fake.setTheme).not.toHaveBeenCalled();
    expect(applied.preferences).toEqual({ ...current, activity: { ...current.activity, showReflections: false } });
  });

  it("only sets the theme when that's all the backup has", () => {
    const { fake } = writers();
    restoreBackupPreferences({ theme: "evening" }, fake);
    expect(fake.setTheme).toHaveBeenCalledWith("evening");
    expect(fake.update).not.toHaveBeenCalled();
  });

  it("does nothing for a backup without preferences", () => {
    const { fake } = writers();
    expect(restoreBackupPreferences({}, fake)).toBe(false);
    expect(fake.setTheme).not.toHaveBeenCalled();
    expect(fake.update).not.toHaveBeenCalled();
  });
});
