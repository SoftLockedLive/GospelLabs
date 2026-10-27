/**
 * Which release this device last saw, and whether its welcome is pending.
 * Kept in localStorage beside the theme, as small per-device UI state (not
 * study data, so it isn't in backups).
 *
 * - Returning learners see what changed since the version they last saw.
 *   Releases before 2.1 didn't record it, so for them it's inferred from what
 *   is stored on the device (see assumedLastSeen in src/domain/changelog.ts).
 * - New learners get the welcome instead, never the What's new card.
 */
import { changelogSchema, compareVersions, parseVersion, type Changelog, type DeviceHistory } from "@/domain/changelog";
import rawChangelog from "@/content/changelog.json";
import { getRepository, getStudyRepository } from "@/persistence/client";
import { APP_RELEASE } from "./app-version";
import { PREFERENCES_STORAGE_KEY } from "./preferences";
import { THEME_STORAGE_KEY } from "./theme";

export const LAST_SEEN_KEY = "gospel-labs:last-seen-version";
export const WELCOME_KEY = "gospel-labs:welcome";
const CHANGE_EVENT = "gospel-labs:release-state-change";

export const CHANGELOG: Changelog = changelogSchema.parse(rawChangelog);

export type WelcomeState = "pending" | "done";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage may be unavailable (private mode); the cards then simply show again next visit.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** The last release this device saw, or null if none was recorded (or it's malformed). */
export function readLastSeen(): string | null {
  const value = read(LAST_SEEN_KEY);
  return value && parseVersion(value) ? value : null;
}

/** Records that this device has seen the running release (or a given one). Never moves backwards. */
export function markSeen(version: string = APP_RELEASE): void {
  const current = readLastSeen();
  if (current && compareVersions(current, version) >= 0) return;
  write(LAST_SEEN_KEY, version);
}

export function readWelcome(): WelcomeState | null {
  const value = read(WELCOME_KEY);
  return value === "pending" || value === "done" ? value : null;
}

export function setWelcome(state: WelcomeState): void {
  write(WELCOME_KEY, state);
}

export function subscribeToReleaseState(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Whether anything shows this device used Gospel Labs before. Storage errors count as "nothing". */
/**
 * Stored preferences beyond the Map's "last visit" time (which only opening the
 * Map writes, in any version from 2.0 on; a 1.x learner who opens the Map first
 * must still be recognized as coming from 1.x).
 */
export function hasChosenPreferences(raw: string | null): boolean {
  if (raw === null) return false;
  try {
    const value: unknown = JSON.parse(raw);
    return !!value && typeof value === "object" && Object.keys(value).some((key) => key !== "lastMapVisit");
  } catch {
    return true;
  }
}

export async function readDeviceHistory(): Promise<DeviceHistory> {
  const [research, study] = await Promise.all([
    getRepository()
      .count()
      .catch(() => 0),
    getStudyRepository()
      .counts()
      .then((counts) => counts.progress + counts.discoveries + counts.personalConnections + counts.explorations)
      .catch(() => 0),
  ]);
  return {
    hasResearch: research > 0,
    hasStudy: study > 0,
    hasPreferences: hasChosenPreferences(read(PREFERENCES_STORAGE_KEY)),
    hasTheme: read(THEME_STORAGE_KEY) !== null,
  };
}
