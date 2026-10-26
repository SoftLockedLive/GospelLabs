import { describe, expect, it } from "vitest";
import type { SeenCompletion } from "@/domain/study/engine/progress";
import type { DiscoveryCard, StudyProgress } from "@/domain/study/user-data";
import { createTestStudyRepository } from "@/persistence/study-test-utils";
import { NEWER_CONTENT_MESSAGE, saveCompletion, saveProgress } from "./progress-storage";

const T0 = "2026-10-26T10:00:00.000Z";
const T1 = "2026-10-26T11:00:00.000Z";

const progress = (overrides: Partial<StudyProgress> = {}): StudyProgress => ({
  id: "one-by-one",
  contentVersion: 1,
  startedAt: T0,
  updatedAt: T0,
  difficulty: "medium",
  length: "quick",
  position: { stepId: "notice" },
  steps: {},
  visitedBranches: [],
  ...overrides,
});

const card = (overrides: Partial<DiscoveryCard> = {}): DiscoveryCard => ({
  id: "card-1",
  createdAt: T0,
  updatedAt: T0,
  origin: { kind: "investigation", contentId: "one-by-one", contentVersion: 1, difficulty: "medium" },
  title: "One by one",
  summary: "",
  sources: [],
  concepts: [],
  connections: [],
  highlights: [],
  notes: "",
  ...overrides,
});

const seen = (completedAt: string[] = [], discoveryId: string[] = []): SeenCompletion => ({
  completedAt: new Set(completedAt),
  discoveryId: new Set(discoveryId),
});

describe("saveProgress", () => {
  it("saves a new record", async () => {
    const { study } = createTestStudyRepository();
    await saveProgress(study, progress(), seen());
    expect((await study.progress.get("one-by-one"))?.position.stepId).toBe("notice");
  });

  it("keeps a completion and card link another tab saved meanwhile", async () => {
    const { study } = createTestStudyRepository();
    await study.progress.put(progress({ completedAt: T0, discoveryId: "card-1" }));
    await saveProgress(study, progress({ updatedAt: T1, position: { stepId: "connect" } }), seen());
    expect(await study.progress.get("one-by-one")).toMatchObject({ completedAt: T0, discoveryId: "card-1", position: { stepId: "connect" } });
  });

  it("doesn't bring back a completion this page cleared by restarting", async () => {
    const { study } = createTestStudyRepository();
    await study.progress.put(progress({ completedAt: T0, discoveryId: "card-1" }));
    await saveProgress(study, progress({ updatedAt: T1, discoveryId: "card-1" }), seen([T0], ["card-1"]));
    const stored = await study.progress.get("one-by-one");
    expect(stored?.completedAt).toBeUndefined();
    expect(stored?.discoveryId).toBe("card-1");
  });

  it("never replaces progress made against a newer version of the investigation", async () => {
    const { db, study } = createTestStudyRepository();
    const newer = progress({ contentVersion: 2, steps: { "new-step": { status: "complete", difficulty: "hard", attempts: 1, hintsShown: 0, revealed: false, skipped: false, updatedAt: T0 } } });
    await study.progress.put(newer);
    const before = await db.studyProgress.get("one-by-one");
    await expect(saveProgress(study, progress({ updatedAt: T1 }), seen())).rejects.toMatchObject({ kind: "version", message: NEWER_CONTENT_MESSAGE });
    expect(await db.studyProgress.get("one-by-one")).toEqual(before);
  });

  it("leaves a stored record it can't read untouched", async () => {
    const { db, study } = createTestStudyRepository();
    const damaged = { ...progress({ completedAt: T0 }), difficulty: "impossible" };
    await db.studyProgress.put(damaged as unknown as StudyProgress);
    await expect(saveProgress(study, progress(), seen())).rejects.toMatchObject({ kind: "invalid-data" });
    expect(await db.studyProgress.get("one-by-one")).toEqual(damaged);
  });
});

describe("saveCompletion", () => {
  it("saves the progress and its card together", async () => {
    const { study } = createTestStudyRepository();
    const saved = await saveCompletion(study, progress({ completedAt: T1 }), card());
    expect(saved.progress.discoveryId).toBe("card-1");
    expect(await study.discoveries.get("card-1")).toBeDefined();
    expect((await study.progress.get("one-by-one"))?.discoveryId).toBe("card-1");
  });

  it("writes neither the card nor the progress when newer progress is stored", async () => {
    const { db, study } = createTestStudyRepository();
    await study.progress.put(progress({ contentVersion: 2 }));
    const before = await db.studyProgress.get("one-by-one");
    await expect(saveCompletion(study, progress({ completedAt: T1 }), card())).rejects.toMatchObject({ kind: "version" });
    expect(await db.studyProgress.get("one-by-one")).toEqual(before);
    expect(await db.discoveries.count()).toBe(0);
  });
});
