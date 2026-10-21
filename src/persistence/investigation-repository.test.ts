import { afterEach, describe, expect, it, vi } from "vitest";
import { RECORD_DATA_VERSION, type Investigation } from "@/domain/investigation";
import { investigationReducer } from "@/domain/investigation-reducer";
import { blankInvestigation, challengeSnapshot, richInvestigation, T1, T2 } from "@/domain/test-fixtures";
import {
  RECORD_BEFORE_CONNECTIONS,
  RECORD_BEFORE_CONNECTIONS_AS_READ,
  RECORD_BEFORE_REFLECTION,
  RECORD_BEFORE_REFLECTION_AS_READ,
  RECORD_BEFORE_TRAILS,
  RECORD_BEFORE_TRAILS_AS_READ,
  RECORD_FROM_1_0,
  RECORD_FROM_1_0_AS_READ,
} from "./legacy-fixtures";
import { StorageError } from "./storage-errors";
import { createTestRepository } from "./test-utils";

afterEach(() => vi.restoreAllMocks());

const edit = (investigation: Investigation, value: string, now = T2): Investigation =>
  investigationReducer(investigation, { type: "setText", field: "analysisNotes", value, now });

describe("saving and loading", () => {
  it("round-trips a fully populated investigation unchanged", async () => {
    const { repository } = createTestRepository();
    const investigation = richInvestigation("inv-1");
    expect(await repository.save(investigation, null)).toEqual({ ok: true });
    expect(await repository.get("inv-1")).toEqual({ status: "found", investigation });
  });

  it("restores the last active section", async () => {
    const { repository } = createTestRepository();
    const investigation = investigationReducer(blankInvestigation(), { type: "setSection", section: "research" });
    await repository.save(investigation, null);
    const loaded = await repository.get(investigation.id);
    expect(loaded.status === "found" && loaded.investigation.currentSection).toBe("research");
  });

  it("reports a missing investigation", async () => {
    const { repository } = createTestRepository();
    expect(await repository.get("nope")).toEqual({ status: "missing" });
  });

  it("lists investigations most recently edited first", async () => {
    const { repository } = createTestRepository();
    await repository.save(richInvestigation("old", { updatedAt: "2026-01-01T00:00:00.000Z" }), null);
    await repository.save(richInvestigation("new", { updatedAt: "2026-06-01T00:00:00.000Z" }), null);
    await repository.save(richInvestigation("mid", { updatedAt: "2026-03-01T00:00:00.000Z" }), null);
    const { investigations, unreadable } = await repository.list();
    expect(investigations.map((i) => i.id)).toEqual(["new", "mid", "old"]);
    expect(unreadable).toBe(0);
  });

  it("refuses to write invalid data", async () => {
    const { repository } = createTestRepository();
    const broken = { ...blankInvestigation(), status: "solved" } as unknown as Investigation;
    await expect(repository.save(broken, null)).rejects.toMatchObject({ kind: "invalid-data" });
    expect(await repository.count()).toBe(0);
  });
});

describe("records from earlier versions", () => {
  it("loads a record saved by Gospel Labs 1.0 unchanged, with no challenge responses", async () => {
    const { db, repository } = createTestRepository();
    await db.investigations.put(structuredClone(RECORD_FROM_1_0) as unknown as Investigation);

    expect(await repository.get(RECORD_FROM_1_0.id)).toEqual({ status: "found", investigation: RECORD_FROM_1_0_AS_READ });
    expect(await repository.list()).toEqual({ investigations: [RECORD_FROM_1_0_AS_READ], unreadable: 0 });
  });

  it("adds a challenge response to a 1.0 record without changing anything else", async () => {
    const { db, repository } = createTestRepository();
    await db.investigations.put(structuredClone(RECORD_FROM_1_0) as unknown as Investigation);
    const loaded = await repository.get(RECORD_FROM_1_0.id);
    if (loaded.status !== "found") throw new Error("not loaded");

    const edited = investigationReducer(loaded.investigation, {
      type: "respondToChallenge",
      id: "cr-1",
      challenge: challengeSnapshot(),
      response: "“Daily” stands out.",
      now: T2,
    });
    expect(await repository.save(edited, RECORD_FROM_1_0.updatedAt)).toEqual({ ok: true });

    expect(await db.investigations.get(RECORD_FROM_1_0.id)).toEqual({
      ...RECORD_FROM_1_0_AS_READ,
      dataVersion: RECORD_DATA_VERSION,
      updatedAt: T2,
      challengeResponses: [expect.objectContaining({ response: "“Daily” stands out." })],
    });
  });

  it("adds trail notes to a record saved before trails, keeping its challenge responses", async () => {
    const { db, repository } = createTestRepository();
    await db.investigations.put(structuredClone(RECORD_BEFORE_TRAILS) as unknown as Investigation);
    const loaded = await repository.get(RECORD_BEFORE_TRAILS.id);
    if (loaded.status !== "found") throw new Error("not loaded");
    expect(loaded.investigation).toEqual(RECORD_BEFORE_TRAILS_AS_READ);

    const edited = investigationReducer(loaded.investigation, {
      type: "recordTrailDiscoveries",
      trailId: "forgiveness-before-the-atonement",
      step: { stepId: "mark-2", title: "Sins forgiven", question: "What does Jesus say?" },
      discoveries: "Verse 10 links the healing to the power to forgive.",
      now: T2,
    });
    expect(await repository.save(edited, RECORD_BEFORE_TRAILS.updatedAt)).toEqual({ ok: true });

    const stored = (await db.investigations.get(RECORD_BEFORE_TRAILS.id))!;
    expect(stored.challengeResponses).toEqual(RECORD_BEFORE_TRAILS.challengeResponses);
    expect(stored.trailProgress[0].steps[0].discoveries).toBe("Verse 10 links the healing to the power to forgive.");
  });

  it("connects evidence in a record saved before connections, keeping its responses and trail notes", async () => {
    const { db, repository } = createTestRepository();
    await db.investigations.put(structuredClone(RECORD_BEFORE_CONNECTIONS) as unknown as Investigation);
    const loaded = await repository.get(RECORD_BEFORE_CONNECTIONS.id);
    if (loaded.status !== "found") throw new Error("not loaded");
    expect(loaded.investigation).toEqual(RECORD_BEFORE_CONNECTIONS_AS_READ);

    const edited = investigationReducer(loaded.investigation, {
      type: "addConnection",
      id: "conn-1",
      input: { fromEvidenceId: "ev-legacy", toEvidenceId: "ev-second", relationship: "supports", explanation: "" },
      now: T2,
    });
    expect(await repository.save(edited, RECORD_BEFORE_CONNECTIONS.updatedAt)).toEqual({ ok: true });

    const stored = (await db.investigations.get(RECORD_BEFORE_CONNECTIONS.id))!;
    expect(stored).toEqual({
      ...RECORD_BEFORE_CONNECTIONS_AS_READ,
      dataVersion: RECORD_DATA_VERSION,
      evidenceConnections: edited.evidenceConnections,
      updatedAt: T2,
    });
    expect(stored.evidenceConnections).toHaveLength(1);
  });

  it("adds a reflection and a discovery to a record saved before them, keeping everything else", async () => {
    const { db, repository } = createTestRepository();
    await db.investigations.put(structuredClone(RECORD_BEFORE_REFLECTION) as unknown as Investigation);
    const loaded = await repository.get(RECORD_BEFORE_REFLECTION.id);
    if (loaded.status !== "found") throw new Error("not loaded");
    expect(loaded.investigation).toEqual(RECORD_BEFORE_REFLECTION_AS_READ);

    let edited = investigationReducer(loaded.investigation, {
      type: "setReflection",
      promptId: "learned-about-christ",
      value: "He asks for daily discipleship.",
      now: T1,
    });
    edited = investigationReducer(edited, {
      type: "addHighlight",
      id: "hl-1",
      input: { title: "Daily", insight: "Both passages stress daily choice.", evidenceIds: ["ev-legacy", "ev-second"] },
      now: T2,
    });
    expect(await repository.save(edited, RECORD_BEFORE_REFLECTION.updatedAt)).toEqual({ ok: true });

    expect(await db.investigations.get(RECORD_BEFORE_REFLECTION.id)).toEqual({
      ...RECORD_BEFORE_REFLECTION_AS_READ,
      dataVersion: RECORD_DATA_VERSION,
      christReflection: { "learned-about-christ": "He asks for daily discipleship." },
      discoveryHighlights: edited.discoveryHighlights,
      updatedAt: T2,
    });
  });

  it("keeps fields written by a newer version through load, edit, and save", async () => {
    const { db, repository } = createTestRepository();
    const fromNewer = { ...richInvestigation("next"), fieldFromANewerVersion: { currentStep: 2 } };
    await db.investigations.put(fromNewer);

    const loaded = await repository.get("next");
    if (loaded.status !== "found") throw new Error("not loaded");
    await repository.save(edit(loaded.investigation, "Edited in an older tab"), fromNewer.updatedAt);

    expect(await db.investigations.get("next")).toMatchObject({
      analysisNotes: "Edited in an older tab",
      fieldFromANewerVersion: { currentStep: 2 },
    });
  });
});

describe("records from newer versions of the app", () => {
  it("stamps every write with this version's record format", async () => {
    const { db, repository } = createTestRepository();
    await repository.save({ ...richInvestigation("inv-1"), dataVersion: undefined }, null);
    expect((await db.investigations.get("inv-1"))?.dataVersion).toBe(RECORD_DATA_VERSION);
  });

  it("won't open, save over, or overwrite a record saved by a newer version", async () => {
    const { db, repository } = createTestRepository();
    const fromNewer = { ...richInvestigation("next"), dataVersion: RECORD_DATA_VERSION + 1 };
    await db.investigations.put(fromNewer);

    expect(await repository.get("next")).toEqual({ status: "newer" });
    const edited = edit(richInvestigation("next"), "Edited by an older tab");
    expect(await repository.save(edited, fromNewer.updatedAt)).toEqual({ ok: false, conflict: "newer-version" });
    await expect(repository.overwrite(edited)).rejects.toMatchObject({ kind: "version" });
    expect(await db.investigations.get("next")).toEqual(fromNewer);
  });

  it("reports a record's edit time and format for change watching", async () => {
    const { repository } = createTestRepository();
    expect(await repository.stamp("nope")).toBeNull();
    await repository.save(richInvestigation("inv-1"), null);
    expect(await repository.stamp("inv-1")).toEqual({ updatedAt: T2, dataVersion: RECORD_DATA_VERSION });
  });

  it("exports records exactly as stored, keeping fields this version doesn't know", async () => {
    const { db, repository } = createTestRepository();
    const record = richInvestigation("inv-1");
    const withFutureField = {
      ...record,
      evidence: record.evidence.map((card) => ({ ...card, pageNumber: 12 })),
    };
    await db.investigations.put(withFutureField);
    const { backup } = await repository.exportBackup("2026-10-20T12:00:00.000Z");
    expect(backup.investigations).toEqual([withFutureField]);
  });
});

describe("unreadable records", () => {
  it("skips records that fail validation without deleting them", async () => {
    const { db, repository } = createTestRepository();
    await repository.save(richInvestigation("good"), null);
    await db.investigations.put({ id: "bad", title: 42 } as unknown as Investigation);

    const { investigations, unreadable } = await repository.list();
    expect(investigations.map((i) => i.id)).toEqual(["good"]);
    expect(unreadable).toBe(1);
    expect(await repository.get("bad")).toEqual({ status: "unreadable" });
    expect(await db.investigations.count()).toBe(2);
  });
});

describe("conflict detection", () => {
  it("saves follow-up edits when the stored copy is the one last seen", async () => {
    const { repository } = createTestRepository();
    const first = richInvestigation("inv-1");
    await repository.save(first, null);
    const second = edit(first, "More notes");
    expect(await repository.save(second, first.updatedAt)).toEqual({ ok: true });
  });

  it("refuses to overwrite a newer version saved elsewhere", async () => {
    const { repository } = createTestRepository();
    const original = richInvestigation("inv-1");
    await repository.save(original, null);
    await repository.save(edit(original, "Edited in tab A", "2026-10-20T09:00:00.000Z"), original.updatedAt);

    const tabB = edit(original, "Edited in tab B", "2026-10-20T09:01:00.000Z");
    expect(await repository.save(tabB, original.updatedAt)).toEqual({ ok: false, conflict: "modified" });
    const stored = await repository.get("inv-1");
    expect(stored.status === "found" && stored.investigation.analysisNotes).toBe("Edited in tab A");
  });

  it("does not resurrect an investigation deleted elsewhere", async () => {
    const { repository } = createTestRepository();
    const original = richInvestigation("inv-1");
    await repository.save(original, null);
    await repository.delete("inv-1");
    expect(await repository.save(edit(original, "Late edit"), original.updatedAt)).toEqual({
      ok: false,
      conflict: "deleted",
    });
    expect(await repository.count()).toBe(0);
  });

  it("treats saving exactly what's already stored as success, not a conflict", async () => {
    const { repository } = createTestRepository();
    const original = richInvestigation("inv-1");
    await repository.save(original, null);
    const edited = edit(original, "Written by a recovered copy", "2026-10-20T09:00:00.000Z");
    await repository.save(edited, original.updatedAt);
    expect(await repository.save(edited, original.updatedAt)).toEqual({ ok: true });
    expect(await repository.save(edited, null)).toEqual({ ok: true });
    expect(await repository.save(edit(original, "Something else", "2026-10-20T09:01:00.000Z"), original.updatedAt)).toEqual({
      ok: false,
      conflict: "modified",
    });
  });

  it("refuses to create a new investigation over an existing id", async () => {
    const { repository } = createTestRepository();
    await repository.save(richInvestigation("inv-1"), null);
    const different = richInvestigation("inv-1", { title: "A different investigation with the same id" });
    expect(await repository.save(different, null)).toEqual({ ok: false, conflict: "exists" });
  });

  it("overwrite writes regardless, for when the user chooses their version", async () => {
    const { repository } = createTestRepository();
    const original = richInvestigation("inv-1");
    await repository.save(original, null);
    await repository.delete("inv-1");
    await repository.overwrite(original);
    expect(await repository.get("inv-1")).toEqual({ status: "found", investigation: original });
  });
});

describe("deleting", () => {
  it("deletes one investigation", async () => {
    const { repository } = createTestRepository();
    await repository.save(richInvestigation("a"), null);
    await repository.save(richInvestigation("b"), null);
    await repository.delete("a");
    expect((await repository.list()).investigations.map((i) => i.id)).toEqual(["b"]);
  });

  it("deletes everything and reports how many were removed", async () => {
    const { repository } = createTestRepository();
    await repository.save(richInvestigation("a"), null);
    await repository.save(richInvestigation("b"), null);
    expect(await repository.deleteAll()).toBe(2);
    expect(await repository.count()).toBe(0);
  });
});

describe("storage errors", () => {
  it("reports a full disk as a quota error", async () => {
    const { db, repository } = createTestRepository();
    vi.spyOn(db.investigations, "put").mockRejectedValue(new DOMException("No space", "QuotaExceededError"));
    const error = await repository.save(richInvestigation("inv-1"), null).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(StorageError);
    expect(error).toMatchObject({ kind: "quota" });
  });

  it("reports unavailable storage", async () => {
    const { db, repository } = createTestRepository();
    vi.spyOn(db.investigations, "toArray").mockRejectedValue(Object.assign(new Error("blocked"), { name: "MissingAPIError" }));
    await expect(repository.list()).rejects.toMatchObject({ kind: "unavailable" });
  });

  it("reports data written by a newer app version", async () => {
    const { db, repository } = createTestRepository();
    vi.spyOn(db.investigations, "get").mockRejectedValue(
      Object.assign(new Error("open failed"), { name: "OpenFailedError", inner: { name: "VersionError" } }),
    );
    await expect(repository.get("x")).rejects.toMatchObject({ kind: "version" });
  });
});

describe("timestamps", () => {
  it("stores timestamps exactly as given", async () => {
    const { repository } = createTestRepository();
    const investigation = richInvestigation("inv-1");
    await repository.save(investigation, null);
    const loaded = await repository.get("inv-1");
    expect(loaded.status === "found" && [loaded.investigation.createdAt, loaded.investigation.updatedAt]).toEqual([
      investigation.createdAt,
      T2,
    ]);
    expect(investigation.evidence[0].createdAt).toBe(T1);
  });
});
