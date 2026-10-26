/**
 * Preferences in backups. They live in localStorage, not IndexedDB (the
 * theme under its 1.x key, everything else under gospel-labs:preferences),
 * so they are read here when exporting and restored here after an import.
 *
 * - Exports include only preferences actually stored on this device, and
 *   only valid ones; an untouched setting stays out of the file, so restoring
 *   it elsewhere leaves that device's choice alone.
 * - Restoring is opt-in (the import dialog asks) and happens only after the
 *   database import has succeeded. It changes only the fields the backup
 *   carries; activity options merge into the current ones.
 */
import { PREFERENCES_STORAGE_KEY, updatePreferences, type Preferences } from "@/lib/preferences";
import { setThemePreference, THEME_STORAGE_KEY, type ThemePreference } from "@/lib/theme";
import { hasPreferences, sanitizePreferences, type BackupPreferences } from "./backup";

type ReadableStorage = Pick<Storage, "getItem">;

function browserStorage(): ReadableStorage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined; // storage blocked
  }
}

function read(storage: ReadableStorage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

/** The valid preferences stored on this device, for a backup. Never throws. */
export function readStoredPreferences(storage: ReadableStorage | undefined = browserStorage()): BackupPreferences {
  if (!storage) return {};
  let stored: unknown = {};
  try {
    stored = JSON.parse(read(storage, PREFERENCES_STORAGE_KEY) ?? "{}");
  } catch {
    stored = {};
  }
  const fields: Record<string, unknown> = stored && typeof stored === "object" && !Array.isArray(stored) ? { ...stored } : {};
  // The theme has its own key; never take one from the preferences object.
  delete fields.theme;
  const theme = read(storage, THEME_STORAGE_KEY);
  if (theme !== null) fields.theme = theme;
  return sanitizePreferences(fields).preferences;
}

export interface PreferenceWriters {
  setTheme: (theme: ThemePreference) => void;
  update: (change: (current: Preferences) => Partial<Preferences>) => void;
}

const browserWriters: PreferenceWriters = { setTheme: setThemePreference, update: updatePreferences };

/**
 * Applies a backup's preferences on this device. Returns whether anything
 * was applied. Both writers tolerate unavailable storage (the setting then
 * applies for this visit only).
 */
export function restoreBackupPreferences(preferences: BackupPreferences, writers: PreferenceWriters = browserWriters): boolean {
  if (!hasPreferences(preferences)) return false;
  const { theme, activity, ...rest } = preferences;
  if (theme) writers.setTheme(theme);
  if (activity || Object.keys(rest).length > 0) {
    writers.update((current) => ({ ...rest, ...(activity ? { activity: { ...current.activity, ...activity } } : {}) }));
  }
  return true;
}
