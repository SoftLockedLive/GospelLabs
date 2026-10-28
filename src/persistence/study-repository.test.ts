import Dexie from "dexie";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import type { JournalEntry } from "@/domain/study/journal";
import { STUDY_DATA_VERSION, type DiscoveryCard, type StudyProgress } from "@/domain/study/user-data";
import { GospelLabsDatabase } from "./db";
import { createInvestigationRepository } from "./investigation-repository";
import { createStudyRepository } from "./study-repository";
import { createTestStudyRepository } from "./study-test-utils";
import { RECORD_FROM_1_0 } from "./legacy-fixtures";

const NOW = "2026-10-25T12:00:00.000Z";

const progress = (overrides: Partial<StudyProgress> = {}): StudyProgress => ({
  id: "one-by-one",
  contentVersion: 1,
  startedAt: NOW,
  updatedAt: NOW,
  difficulty: "medium",
  length: "quick",
  position: { stepId: "notice" },
  steps: {},
  visitedBranches: [],
  ...overrides,
});

const card = (overrides: Partial<DiscoveryCard> = {}): DiscoveryCard => ({
  id: "card-1",
  createdAt: NOW,
  updatedAt: NOW,
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

const entry = (overrides: Partial<JournalEntry> = {}): JournalEntry => ({
  id: "entry-1",
  createdAt: NOW,
  updatedAt: NOW,
  kind: "tender-mercy",
  text: "A friend checked on me today.",
  ...overrides,
});

describe("study repository", () => {
  it("saves and reads progress, stamping the data version", async () => {
    const { study } = createTestStudyRepository();
    await study.progress.put(progress());
    const stored = await study.progress.get("one-by-one");
    expect(stored?.dataVersion).toBe(STUDY_DATA_VERSION);
    expect(stored?.position.stepId).toBe("notice");
  });

  it("rejects invalid records without writing them", async () => {
    const { study } = createTestStudyRepository();
    await expect(study.progress.put({ ...progress(), difficulty: "impossible" } as unknown as StudyProgress)).rejects.toMatchObject({
      kind: "invalid-data",
    });
    expect(await study.progress.get("one-by-one")).toBeUndefined();
  });

  it("never overwrites a record saved by a newer version", async () => {
    const { db, study } = createTestStudyRepository();
    await db.studyProgress.put({ ...progress(), dataVersion: STUDY_DATA_VERSION + 1 });
    await expect(study.progress.put(progress({ difficulty: "easy" }))).rejects.toMatchObject({ kind: "version" });
  });

  it("keeps fields added by a newer version when reading", async () => {
    const { db, study } = createTestStudyRepository();
    await db.discoveries.put({ ...card(), futureField: "kept" } as DiscoveryCard);
    const stored = await study.discoveries.get("card-1");
    expect((stored as unknown as { futureField: string }).futureField).toBe("kept");
  });

  it("completes an investigation and its Discovery Card together", async () => {
    const { study } = createTestStudyRepository();
    await study.completeInvestigation(progress({ completedAt: NOW }), card());
    expect((await study.progress.get("one-by-one"))?.discoveryId).toBe("card-1");
    expect(await study.discoveries.get("card-1")).toBeDefined();
  });

  it("forgets a deleted card's link without un-completing the investigation", async () => {
    const { study } = createTestStudyRepository();
    await study.completeInvestigation(progress({ completedAt: NOW }), card());
    await study.deleteDiscovery("card-1");
    const stored = await study.progress.get("one-by-one");
    expect(stored?.discoveryId).toBeUndefined();
    expect(stored?.completedAt).toBe(NOW);
  });

  it("counts unreadable records instead of failing the whole list", async () => {
    const { db, study } = createTestStudyRepository();
    await study.progress.put(progress());
    await db.studyProgress.put({ id: "broken" } as unknown as StudyProgress);
    const { records, unreadable } = await study.progress.list();
    expect(records.map((record) => record.id)).toEqual(["one-by-one"]);
    expect(unreadable).toBe(1);
  });
});

describe("journal entries", () => {
  it("are saved, read, listed newest first, and deleted, stamped with the data version", async () => {
    const { study } = createTestStudyRepository();
    await study.journal.put(entry());
    await study.journal.put(entry({ id: "entry-2", updatedAt: "2026-10-26T08:00:00.000Z", kind: "question", text: "  Why?  " }));
    const stored = await study.journal.get("entry-2");
    expect(stored).toMatchObject({ kind: "question", text: "Why?", dataVersion: STUDY_DATA_VERSION });
    expect((await study.journal.list()).records.map((record) => record.id)).toEqual(["entry-2", "entry-1"]);

    await study.journal.delete("entry-1");
    expect(await study.journal.get("entry-1")).toBeUndefined();
  });

  it("keep their link, and fields added by a newer version", async () => {
    const { db, study } = createTestStudyRepository();
    const link = { kind: "attribute" as const, contentId: "charity", label: "Charity · Character of Christ" };
    await db.journal.put({ ...entry({ link }), futureField: "kept" } as JournalEntry);
    expect(await study.journal.get("entry-1")).toMatchObject({ link, futureField: "kept" });
  });

  it("are refused without text, and never replace one saved by a newer version", async () => {
    const { db, study } = createTestStudyRepository();
    await expect(study.journal.put(entry({ text: "  " }))).rejects.toMatchObject({ kind: "invalid-data" });
    expect(await study.journal.get("entry-1")).toBeUndefined();
    await db.journal.put({ ...entry(), dataVersion: STUDY_DATA_VERSION + 1 });
    await expect(study.journal.put(entry({ text: "Edited" }))).rejects.toMatchObject({ kind: "version" });
  });
});

describe("bulk operations", () => {
  it("snapshots every valid record as stored, counts each table, and deletes all study data together", async () => {
    const { db, study } = createTestStudyRepository();
    await study.completeInvestigation(progress({ completedAt: NOW }), card());
    await db.discoveries.put({ ...card({ id: "card-2" }), futureField: 1 } as DiscoveryCard);
    await db.explorations.put({ id: "broken" } as never);
    await study.journal.put(entry());
    await db.journal.put({ id: "broken-entry", text: "" } as never);

    const { snapshot, unreadable } = await study.snapshot();
    expect(snapshot.progress.map((record) => record.id)).toEqual(["one-by-one"]);
    expect(snapshot.discoveries.map((record) => record.id).sort()).toEqual(["card-1", "card-2"]);
    expect(snapshot.discoveries.find((record) => record.id === "card-2")).toMatchObject({ futureField: 1 });
    expect(snapshot.journal).toEqual([{ ...entry(), dataVersion: STUDY_DATA_VERSION }]);
    expect(unreadable).toBe(2);
    expect(await study.counts()).toEqual({ progress: 1, discoveries: 2, personalConnections: 0, explorations: 1, journal: 2 });

    expect(await study.deleteAll()).toBe(6);
    expect(await study.counts()).toEqual({ progress: 0, discoveries: 0, personalConnections: 0, explorations: 0, journal: 0 });
  });

  it("never touches investigations when deleting study data", async () => {
    const { db, study } = createTestStudyRepository();
    const investigations = createInvestigationRepository(db);
    await db.investigations.put(structuredClone(RECORD_FROM_1_0) as never);
    await study.progress.put(progress());
    await study.journal.put(entry());
    await study.deleteAll();
    expect(await investigations.count()).toBe(1);
  });
});

describe("protecting data the app can't read", () => {
  it("reports a stored record that fails validation as an error, not as missing", async () => {
    const { db, study } = createTestStudyRepository();
    await db.studyProgress.put({ ...progress(), difficulty: "impossible" } as unknown as StudyProgress);
    await expect(study.progress.get("one-by-one")).rejects.toMatchObject({ kind: "invalid-data" });
  });

  it("refuses to replace a stored record it can't read, leaving it exactly as stored", async () => {
    const { db, study } = createTestStudyRepository();
    const damaged = { ...progress({ completedAt: NOW, discoveryId: "card-1" }), difficulty: "impossible" };
    await db.studyProgress.put(damaged as unknown as StudyProgress);
    await expect(study.progress.put(progress())).rejects.toMatchObject({ kind: "invalid-data" });
    expect(await db.studyProgress.get("one-by-one")).toEqual(damaged);
  });

  it("deleting a card leaves newer-version progress untouched and stamps the records it changes", async () => {
    const { db, study } = createTestStudyRepository();
    await study.completeInvestigation(progress({ completedAt: NOW }), card());
    await db.studyProgress.put({ ...progress({ id: "newer" }), discoveryId: "card-1", dataVersion: STUDY_DATA_VERSION + 1 });
    await study.deleteDiscovery("card-1");
    const changed = await db.studyProgress.get("one-by-one");
    expect(changed?.discoveryId).toBeUndefined();
    expect(Date.parse(changed!.updatedAt)).toBeGreaterThan(Date.parse(NOW));
    expect((await db.studyProgress.get("newer"))?.discoveryId).toBe("card-1");
  });

  it("finds a card by its origin, oldest first", async () => {
    const { study } = createTestStudyRepository();
    await study.discoveries.put(card({ id: "later", createdAt: "2026-10-26T00:00:00.000Z", updatedAt: "2026-10-26T00:00:00.000Z" }));
    await study.discoveries.put(card({ id: "first" }));
    await study.discoveries.put(card({ id: "other", origin: { kind: "passage", contentId: "one-by-one" } }));
    expect((await study.findDiscoveryByOrigin("investigation", "one-by-one"))?.id).toBe("first");
    expect(await study.findDiscoveryByOrigin("investigation", "missing")).toBeUndefined();
  });
});

describe("database versions 2 and 3", () => {
  it("upgrades a 1.x database without touching its investigations", async () => {
    const indexedDB = new IDBFactory();
    const name = `upgrade-${crypto.randomUUID()}`;
    const legacy = new Dexie(name, { indexedDB, IDBKeyRange });
    legacy.version(1).stores({ investigations: "id, updatedAt, status" });
    const record = structuredClone(RECORD_FROM_1_0);
    await legacy.table("investigations").put(record);
    legacy.close();

    const db = new GospelLabsDatabase(name, { indexedDB, IDBKeyRange });
    const repository = createInvestigationRepository(db);
    const loaded = await repository.get(record.id);
    expect(loaded.status).toBe("found");
    expect(await db.table("investigations").get(record.id)).toEqual(record);
    expect(db.tables.map((table) => table.name).sort()).toEqual(
      ["discoveries", "explorations", "investigations", "journal", "personalConnections", "studyProgress"].sort(),
    );
    db.close();
  });

  it("upgrades a 2.0–2.2 database without touching its records", async () => {
    const indexedDB = new IDBFactory();
    const name = `upgrade-2-${crypto.randomUUID()}`;
    const older = new Dexie(name, { indexedDB, IDBKeyRange });
    older.version(1).stores({ investigations: "id, updatedAt, status" });
    older.version(2).stores({ studyProgress: "id, updatedAt", discoveries: "id, updatedAt, createdAt", personalConnections: "id, updatedAt", explorations: "id, kind, updatedAt" });
    const saved = { ...card(), dataVersion: STUDY_DATA_VERSION };
    await older.table("discoveries").put(saved);
    older.close();

    const db = new GospelLabsDatabase(name, { indexedDB, IDBKeyRange });
    const study = createStudyRepository(db);
    expect(await db.table("discoveries").get("card-1")).toEqual(saved);
    expect(await study.journal.list()).toEqual({ records: [], unreadable: 0 });
    await study.journal.put(entry());
    expect(await study.counts()).toMatchObject({ discoveries: 1, journal: 1 });
    db.close();
  });

  it("can still be opened by a 1.x build after upgrading (rollback safety)", async () => {
    const indexedDB = new IDBFactory();
    const name = `rollback-${crypto.randomUUID()}`;
    const upgraded = new GospelLabsDatabase(name, { indexedDB, IDBKeyRange });
    const record = structuredClone(RECORD_FROM_1_0);
    await upgraded.table("investigations").put(record);
    upgraded.close();

    const legacy = new Dexie(name, { indexedDB, IDBKeyRange });
    legacy.version(1).stores({ investigations: "id, updatedAt, status" });
    expect(await legacy.table("investigations").get(record.id)).toEqual(record);
    legacy.close();
  });

  it("can still be opened by a 2.0–2.2 build after adding the journal (rollback safety)", async () => {
    const indexedDB = new IDBFactory();
    const name = `rollback-2-${crypto.randomUUID()}`;
    const upgraded = new GospelLabsDatabase(name, { indexedDB, IDBKeyRange });
    const study = createStudyRepository(upgraded);
    await study.discoveries.put(card());
    await study.journal.put(entry());
    upgraded.close();

    const older = new Dexie(name, { indexedDB, IDBKeyRange });
    older.version(1).stores({ investigations: "id, updatedAt, status" });
    older.version(2).stores({ studyProgress: "id, updatedAt", discoveries: "id, updatedAt, createdAt", personalConnections: "id, updatedAt", explorations: "id, kind, updatedAt" });
    expect(await older.table("discoveries").get("card-1")).toMatchObject({ title: "One by one" });
    older.close();

    // The journal is still there for the newer version.
    const reopened = new GospelLabsDatabase(name, { indexedDB, IDBKeyRange });
    expect(await createStudyRepository(reopened).journal.get("entry-1")).toMatchObject({ text: entry().text });
    reopened.close();
  });
});
