/**
 * Releases and what changed in each. Version numbers are
 * MAJOR.MINOR.CONTENT.PATCH (docs/VERSIONING.md):
 *   MAJOR    a major update (2.0's redesign)
 *   MINOR    bug fixes and general changes
 *   CONTENT  content added or revised, with no change to how the app works
 *   PATCH    a small one-off fix, deployed quietly: no What's new, no update notice
 *
 * Releases before 2.2.0.1 had three parts (2.2.0), which read as PATCH 0.
 *
 * src/content/changelog.json lists every release, newest first. It drives
 * the What's new card, the update notice, and Settings › About. Pure: the
 * app passes in the parsed file and what it knows about this device.
 */
import { z } from "zod";

export const RELEASE_KINDS = ["major", "minor", "content", "patch"] as const;
export type ReleaseKind = (typeof RELEASE_KINDS)[number];

export const RELEASE_KIND_LABELS: Record<ReleaseKind, string> = {
  major: "Major update",
  minor: "Improvements and fixes",
  content: "New content",
  patch: "Small fix",
};

const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?$/;

/** The last release numbered with three parts; every later one has four. */
const LAST_THREE_PART_RELEASE = "2.2.0";

export const releaseSchema = z.strictObject({
  version: z.string().regex(VERSION_PATTERN, { error: "Use MAJOR.MINOR.CONTENT.PATCH, e.g. 2.2.0.1" }),
  date: z.iso.date(),
  kind: z.enum(RELEASE_KINDS),
  title: z.string().trim().min(1).max(80),
  highlights: z.array(z.string().trim().min(1).max(240)).min(1).max(8),
});
export type Release = z.infer<typeof releaseSchema>;

export const changelogSchema = z
  .strictObject({ note: z.string().optional(), releases: z.array(releaseSchema).min(1) })
  .superRefine(({ releases }, ctx) => {
    for (let i = 1; i < releases.length; i++) {
      const newer = releases[i - 1];
      const older = releases[i];
      if (compareVersions(newer.version, older.version) <= 0) {
        ctx.addIssue({ code: "custom", message: `${newer.version} must be newer than ${older.version} (newest first, no duplicates)` });
        continue;
      }
      const expected = releaseKindBetween(older.version, newer.version);
      if (expected !== newer.kind) {
        ctx.addIssue({ code: "custom", message: `${newer.version} follows ${older.version}, so its kind must be "${expected}", not "${newer.kind}"` });
      }
      if (newer.date < older.date) ctx.addIssue({ code: "custom", message: `${newer.version} is dated before ${older.version}` });
    }
    for (const { version } of releases) {
      if (version.split(".").length === 3 && compareVersions(version, LAST_THREE_PART_RELEASE) > 0) {
        ctx.addIssue({ code: "custom", message: `${version}: releases after ${LAST_THREE_PART_RELEASE} have four parts (MAJOR.MINOR.CONTENT.PATCH)` });
      }
    }
  });
export type Changelog = z.infer<typeof changelogSchema>;

/** [MAJOR, MINOR, CONTENT, PATCH], or null. A three-part version (before 2.2.0.1) has PATCH 0, so 2.2.0 equals 2.2.0.0. */
export function parseVersion(version: string): [number, number, number, number] | null {
  const match = VERSION_PATTERN.exec(version);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4] ?? 0)] : null;
}

/** Negative if a is older than b, positive if newer, 0 if equal. Unparseable versions sort as oldest. */
export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a) ?? [-1, -1, -1, -1];
  const pb = parseVersion(b) ?? [-1, -1, -1, -1];
  for (let i = 0; i < 4; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

/** What kind of release `newer` is after `older`: whichever number changed first. */
export function releaseKindBetween(older: string, newer: string): ReleaseKind {
  const [oa, ob, oc] = parseVersion(older) ?? [0, 0, 0, 0];
  const [na, nb, nc] = parseVersion(newer) ?? [0, 0, 0, 0];
  if (na !== oa) return "major";
  if (nb !== ob) return "minor";
  if (nc !== oc) return "content";
  return "patch";
}

/** Releases after `lastSeen` up to and including `current`, newest first. */
export function releasesSince(changelog: Changelog, lastSeen: string, current: string): Release[] {
  return changelog.releases.filter(
    (release) => compareVersions(release.version, lastSeen) > 0 && compareVersions(release.version, current) <= 0,
  );
}

/** Whether learners are told about a release. Patches are deployed quietly, and listed only in Settings › About. */
export const isAnnounced = (release: Release) => release.kind !== "patch";

/** What What's new tells a learner: the releases they haven't seen, without patches. */
export const announcedSince = (changelog: Changelog, lastSeen: string, current: string) =>
  releasesSince(changelog, lastSeen, current).filter(isAnnounced);

/**
 * Whether an open copy running `current` should stay quiet about `deployed`: true when the two differ only in
 * PATCH. The learner then gets the fix the next time Gospel Labs loads, without a notice. A version that can't
 * be read isn't quiet, so the notice still shows.
 */
export function isQuietUpdate(current: string, deployed: string | undefined): boolean {
  if (!deployed || !parseVersion(current) || !parseVersion(deployed)) return false;
  return compareVersions(current, deployed) !== 0 && releaseKindBetween(current, deployed) === "patch";
}

/** True when every unseen release only added content, so a short note is enough. */
export const isContentOnly = (releases: readonly Release[]) => releases.length > 0 && releases.every((r) => r.kind === "content");

/** What this device shows about it having used Gospel Labs before the last-seen version was recorded. */
export interface DeviceHistory {
  /** Research notebooks (1.x) are stored. */
  hasResearch: boolean;
  /** 2.0 study data is stored: progress, Discovery Cards, map connections, or explorations. */
  hasStudy: boolean;
  /** 2.0 study preferences were saved (only 2.0 and later write them). */
  hasPreferences: boolean;
  /** A theme was chosen (any version). */
  hasTheme: boolean;
}

/**
 * The version a returning learner last saw, when it wasn't recorded (releases
 * before 2.1 didn't record it), or null for someone new. Anything 2.0 wrote
 * means they've seen 2.0; otherwise they last used 1.x, so they see the 2.0
 * notes too.
 */
export function assumedLastSeen(history: DeviceHistory): string | null {
  if (history.hasStudy || history.hasPreferences) return "2.0.0";
  if (history.hasResearch || history.hasTheme) return "1.1.0";
  return null;
}
