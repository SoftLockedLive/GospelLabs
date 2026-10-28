import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import rawChangelog from "@/content/changelog.json";
import {
  announcedSince,
  assumedLastSeen,
  changelogSchema,
  compareVersions,
  displayVersion,
  isContentOnly,
  isQuietUpdate,
  releaseKindBetween,
  releasesSince,
  type Changelog,
  type ReleaseKind,
} from "./changelog";

const packageVersion = (JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as { version: string }).version;
const changelog = changelogSchema.parse(rawChangelog);

const release = (version: string, kind: ReleaseKind, date = "2026-10-26") => ({
  version,
  date,
  kind,
  title: `Release ${version}`,
  highlights: ["Something changed."],
});

describe("the shipped changelog", () => {
  it("is valid, newest first, with kinds that match each version bump", () => {
    expect(changelogSchema.safeParse(rawChangelog).success).toBe(true);
  });

  it("starts with the version in package.json, so the app, the changelog, and the git tag agree", () => {
    expect(changelog.releases[0].version).toBe(packageVersion);
  });

  it("numbers the current release with four parts, MAJOR.MINOR.CONTENT.PATCH", () => {
    expect(packageVersion).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
  });
});

describe("versions", () => {
  it("compare numerically, part by part", () => {
    expect(compareVersions("2.1.0", "2.0.9")).toBeGreaterThan(0);
    expect(compareVersions("2.0.10", "2.0.9")).toBeGreaterThan(0);
    expect(compareVersions("1.9.9", "2.0.0")).toBeLessThan(0);
    expect(compareVersions("2.1.0", "2.1.0")).toBe(0);
    expect(compareVersions("not a version", "0.0.1")).toBeLessThan(0);
  });

  it("have a fourth part, PATCH, and read a three-part version (before 2.2.0.1) as PATCH 0", () => {
    expect(compareVersions("2.2.0.1", "2.2.0")).toBeGreaterThan(0);
    expect(compareVersions("2.2.1.0", "2.2.0.1")).toBeGreaterThan(0);
    expect(compareVersions("2.2.1.1", "2.2.1.0")).toBeGreaterThan(0);
    expect(compareVersions("2.2.1.10", "2.2.1.9")).toBeGreaterThan(0);
    expect(compareVersions("2.2.0", "2.2.0.0")).toBe(0);
    expect(compareVersions("2.3.0.0", "2.2.9.9")).toBeGreaterThan(0);
    expect(compareVersions("2.2.1.0.0", "2.2.1.0")).toBeLessThan(0);
  });

  it("name the kind of release by the first number that changed", () => {
    expect(releaseKindBetween("1.1.0", "2.0.0")).toBe("major");
    expect(releaseKindBetween("2.0.0", "2.1.0")).toBe("minor");
    expect(releaseKindBetween("2.1.0", "2.1.1")).toBe("content");
    expect(releaseKindBetween("2.2.0", "2.2.0.1")).toBe("patch");
    expect(releaseKindBetween("2.2.0.1", "2.2.1.0")).toBe("content");
    expect(releaseKindBetween("2.2.1.0", "2.2.1.1")).toBe("patch");
    expect(releaseKindBetween("2.2.1.3", "2.3.0.0")).toBe("minor");
  });

  it("are checked against their kind and order in the changelog", () => {
    const wrongKind = { releases: [release("2.1.0", "content"), release("2.0.0", "major")] };
    const outOfOrder = { releases: [release("2.0.0", "major"), release("2.1.0", "minor")] };
    expect(changelogSchema.safeParse(wrongKind).success).toBe(false);
    expect(changelogSchema.safeParse(outOfOrder).success).toBe(false);
    expect(changelogSchema.safeParse({ releases: [release("2.2.1.1", "content"), release("2.2.1.0", "content")] }).success).toBe(false);
    expect(changelogSchema.safeParse({ releases: [release("2.2.1.1", "patch"), release("2.2.1.0", "content"), release("2.2.0", "minor")] }).success).toBe(true);
  });

  it("have four parts after 2.2.0", () => {
    expect(changelogSchema.safeParse({ releases: [release("2.2.1", "content"), release("2.2.0", "minor")] }).success).toBe(false);
    expect(changelogSchema.safeParse({ releases: [release("2.2.1.0", "content"), release("2.2.0", "minor")] }).success).toBe(true);
  });
});

describe("what's new since a version", () => {
  const log: Changelog = changelogSchema.parse({
    releases: [release("2.1.1", "content"), release("2.1.0", "minor"), release("2.0.0", "major"), release("1.1.0", "minor", "2026-10-21")],
  });

  it("lists every release after the last one seen, up to the running one, newest first", () => {
    expect(releasesSince(log, "1.1.0", "2.1.1").map((r) => r.version)).toEqual(["2.1.1", "2.1.0", "2.0.0"]);
    expect(releasesSince(log, "2.0.0", "2.1.0").map((r) => r.version)).toEqual(["2.1.0"]);
    expect(releasesSince(log, "2.1.1", "2.1.1")).toEqual([]);
  });

  it("calls for only a short note when nothing but content changed", () => {
    expect(isContentOnly(releasesSince(log, "2.1.0", "2.1.1"))).toBe(true);
    expect(isContentOnly(releasesSince(log, "2.0.0", "2.1.1"))).toBe(false);
    expect(isContentOnly([])).toBe(false);
  });
});

describe("patches", () => {
  const log: Changelog = changelogSchema.parse({
    releases: [release("2.3.0.1", "patch"), release("2.3.0.0", "minor"), release("2.2.1.2", "patch"), release("2.2.1.1", "patch"), release("2.2.1.0", "content"), release("2.2.0", "minor")],
  });

  it("aren't announced in What's new, alone or among other releases", () => {
    expect(announcedSince(log, "2.2.1.0", "2.2.1.2")).toEqual([]);
    expect(announcedSince(log, "2.2.0", "2.2.1.2").map((r) => r.version)).toEqual(["2.2.1.0"]);
    expect(isContentOnly(announcedSince(log, "2.2.0", "2.2.1.2"))).toBe(true);
    expect(announcedSince(log, "2.2.1.1", "2.3.0.1").map((r) => r.version)).toEqual(["2.3.0.0"]);
    // Settings › About still lists them.
    expect(releasesSince(log, "2.2.1.0", "2.2.1.2").map((r) => r.version)).toEqual(["2.2.1.2", "2.2.1.1"]);
  });

  it("are deployed without an update notice in open copies, unless more than the patch changed", () => {
    expect(isQuietUpdate("2.2.1.0", "2.2.1.1")).toBe(true);
    expect(isQuietUpdate("2.2.1.1", "2.2.1.0")).toBe(true); // a patch rolled back
    expect(isQuietUpdate("2.2.0", "2.2.0.1")).toBe(true);
    expect(isQuietUpdate("2.2.1.0", "2.2.2.0")).toBe(false);
    expect(isQuietUpdate("2.2.1.0", "2.3.0.1")).toBe(false);
    // The same release redeployed, or a deployment that doesn't name its release: the notice shows, as before.
    expect(isQuietUpdate("2.2.1.0", "2.2.1.0")).toBe(false);
    expect(isQuietUpdate("2.2.1.0", undefined)).toBe(false);
    expect(isQuietUpdate("2.2.1.0", "next")).toBe(false);
  });
});

describe("returning learners whose last version wasn't recorded", () => {
  const none = { hasResearch: false, hasStudy: false, hasPreferences: false, hasTheme: false };

  it("treats a device with nothing stored as new", () => {
    expect(assumedLastSeen(none)).toBeNull();
  });

  it("assumes 1.1 for research notebooks or a chosen theme only, so they also see the 2.0 notes", () => {
    expect(assumedLastSeen({ ...none, hasResearch: true })).toBe("1.1.0");
    expect(assumedLastSeen({ ...none, hasTheme: true })).toBe("1.1.0");
  });

  it("assumes 2.0 when anything only 2.0 writes is present", () => {
    expect(assumedLastSeen({ ...none, hasStudy: true })).toBe("2.0.0");
    expect(assumedLastSeen({ ...none, hasPreferences: true, hasResearch: true })).toBe("2.0.0");
  });
});

describe("displayVersion", () => {
  it("drops trailing zeros, down to MAJOR.MINOR", () => {
    expect(displayVersion("3.0.0.0")).toBe("3.0");
    expect(displayVersion("2.2.1.0")).toBe("2.2.1");
    expect(displayVersion("2.2.0.1")).toBe("2.2.0.1");
    expect(displayVersion("2.2.0")).toBe("2.2");
    expect(displayVersion("1.0.0")).toBe("1.0");
  });

  it("shows an unreadable version as it is", () => {
    expect(displayVersion("dev")).toBe("dev");
  });
});
