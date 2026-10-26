import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import rawChangelog from "@/content/changelog.json";
import {
  assumedLastSeen,
  changelogSchema,
  compareVersions,
  isContentOnly,
  releaseKindBetween,
  releasesSince,
  type Changelog,
} from "./changelog";

const packageVersion = (JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as { version: string }).version;
const changelog = changelogSchema.parse(rawChangelog);

const release = (version: string, kind: "major" | "minor" | "content", date = "2026-10-26") => ({
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
});

describe("versions", () => {
  it("compare numerically, part by part", () => {
    expect(compareVersions("2.1.0", "2.0.9")).toBeGreaterThan(0);
    expect(compareVersions("2.0.10", "2.0.9")).toBeGreaterThan(0);
    expect(compareVersions("1.9.9", "2.0.0")).toBeLessThan(0);
    expect(compareVersions("2.1.0", "2.1.0")).toBe(0);
    expect(compareVersions("not a version", "0.0.1")).toBeLessThan(0);
  });

  it("name the kind of release by the first number that changed", () => {
    expect(releaseKindBetween("1.1.0", "2.0.0")).toBe("major");
    expect(releaseKindBetween("2.0.0", "2.1.0")).toBe("minor");
    expect(releaseKindBetween("2.1.0", "2.1.1")).toBe("content");
  });

  it("are checked against their kind and order in the changelog", () => {
    const wrongKind = { releases: [release("2.1.0", "content"), release("2.0.0", "major")] };
    const outOfOrder = { releases: [release("2.0.0", "major"), release("2.1.0", "minor")] };
    expect(changelogSchema.safeParse(wrongKind).success).toBe(false);
    expect(changelogSchema.safeParse(outOfOrder).success).toBe(false);
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
