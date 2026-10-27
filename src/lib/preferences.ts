/**
 * Study preferences: motion, preferred session length, difficulty, and
 * activity options. Stored in localStorage (like the theme) so they apply
 * before first paint and without waiting for IndexedDB; included in backups.
 * The theme keeps its own key for compatibility; see theme.ts.
 */
import { useSyncExternalStore } from "react";
import { z } from "zod";
import { DIFFICULTIES, STUDY_LENGTHS } from "@/domain/study/vocabulary";

export const PREFERENCES_STORAGE_KEY = "gospel-labs:preferences";
const PREFERENCES_CHANGE_EVENT = "gospel-labs:preferences-change";

export const MOTION_PREFERENCES = ["system", "full", "subtle", "off"] as const;
export type MotionPreference = (typeof MOTION_PREFERENCES)[number];
/** The motion level actually applied, as <html data-motion>. */
export type MotionLevel = Exclude<MotionPreference, "system">;

export const MOTION_LABELS: Record<MotionPreference, string> = {
  system: "Follow my device",
  full: "Full",
  subtle: "Subtle",
  off: "Off",
};

export const preferencesSchema = z.object({
  motion: z.enum(MOTION_PREFERENCES).catch("system").default("system"),
  studyLength: z.enum(STUDY_LENGTHS).catch("quick").default("quick"),
  /** New learners start at Easy (most are young teens). The level an investigation is begun or resumed at is saved here (see StartScreen). */
  difficulty: z.enum(DIFFICULTIES).catch("easy").default("easy"),
  activity: z
    .object({
      /** Offer optional side questions during investigations. */
      offerBranches: z.boolean().catch(true).default(true),
      /** Show optional written-reflection prompts. */
      showReflections: z.boolean().catch(true).default(true),
      /** Show light difficulty suggestions based on completed activities. */
      suggestDifficulty: z.boolean().catch(true).default(true),
    })
    .catch({ offerBranches: true, showReflections: true, suggestDifficulty: true })
    .default({ offerBranches: true, showReflections: true, suggestDifficulty: true }),
  /** When the Discovery Map was last opened, so newly added nodes can be marked. */
  lastMapVisit: z.iso.datetime().optional().catch(undefined),
});
export type Preferences = z.infer<typeof preferencesSchema>;

export const DEFAULT_PREFERENCES: Preferences = preferencesSchema.parse({});

/** Reads preferences, filling defaults for anything missing or invalid. Never throws. */
export function parsePreferences(value: unknown): Preferences {
  const result = preferencesSchema.safeParse(value ?? {});
  return result.success ? result.data : DEFAULT_PREFERENCES;
}

let cachedRaw: string | null | undefined;
let cachedValue: Preferences = DEFAULT_PREFERENCES;

export function readPreferences(): Preferences {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
  } catch {
    raw = null;
  }
  // useSyncExternalStore needs a stable value between changes.
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  try {
    cachedValue = parsePreferences(raw ? JSON.parse(raw) : {});
  } catch {
    cachedValue = DEFAULT_PREFERENCES;
  }
  return cachedValue;
}

export function writePreferences(next: Preferences): void {
  const value = parsePreferences(next);
  try {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Storage may be unavailable (private mode); keep the value for this visit.
    cachedRaw = JSON.stringify(value);
    cachedValue = value;
  }
  window.__gospelLabsApplyMotion?.(value.motion);
  window.dispatchEvent(new Event(PREFERENCES_CHANGE_EVENT));
}

/** What's actually stored (only fields that were ever set), or {} if nothing or something unreadable is. */
function storedFields(): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(PREFERENCES_STORAGE_KEY) ?? "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? { ...value } : {};
  } catch {
    return {};
  }
}

/**
 * Changes some preferences. Only the changed fields are added to what's
 * stored, so defaults the learner never chose aren't saved as if they had
 * been (a backup would carry them to another device as choices, and a
 * device that merely opened the Map would look like it had set preferences).
 */
export function updatePreferences(change: Partial<Preferences> | ((current: Preferences) => Partial<Preferences>)): void {
  const current = readPreferences();
  const patch = typeof change === "function" ? change(current) : change;
  const merged = { ...storedFields(), ...patch };
  const value = parsePreferences(merged);
  // Store the merged fields as valid values (an invalid stored field falls back to its default when read).
  const valid = Object.fromEntries(Object.keys(merged).filter((key) => key in value).map((key) => [key, value[key as keyof Preferences]]));
  try {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(valid));
  } catch {
    cachedRaw = JSON.stringify(valid);
    cachedValue = value;
  }
  window.__gospelLabsApplyMotion?.(value.motion);
  window.dispatchEvent(new Event(PREFERENCES_CHANGE_EVENT));
}

export function subscribeToPreferences(onChange: () => void): () => void {
  window.addEventListener(PREFERENCES_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(PREFERENCES_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Current preferences; re-renders when they change in this or another tab. Defaults during server rendering. */
export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribeToPreferences, readPreferences, () => DEFAULT_PREFERENCES);
}

/** The applied motion level from <html data-motion>, for components that animate from script. */
export function currentMotionLevel(): MotionLevel {
  if (typeof document === "undefined") return "off";
  const level = document.documentElement.dataset.motion;
  return level === "full" || level === "subtle" || level === "off" ? level : "subtle";
}
