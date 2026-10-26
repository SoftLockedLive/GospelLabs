/**
 * Whole backups against a real (in-memory) IndexedDB: export, import in both
 * modes, previews, atomic rollback, and deleting everything, across the
 * investigations and all four study tables.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { RECORD_DATA_VERSION, type Investigation } from "@/domain/investigation";
import { STUDY_DATA_VERSION } from "@/domain/study/user-data";
import { richInvestigation } from "@/domain/test-fixtures";
import { parseBackup, serializeBackup, STUDY_KINDS, type ParsedBackup, type StudyData, type StudyKind } from "./backup";
import type { GospelLabsDatabase } from "./db";
import {
  BACKUP_FROM_1_0,
  BACKUP_FROM_1_1,
  BACKUP_FROM_2_0,
  BACKUP_V2_BEFORE_CONNECTIONS,
  BACKUP_V2_BEFORE_REFLECTION,
  BACKUP_V2_BEFORE_TRAILS,
  PREFERENCES_FROM_2_0,
  RECORD_BEFORE_CONNECTIONS_AS_READ,
  RECORD_BEFORE_REFLECTION_AS_READ,
  RECORD_BEFORE_TRAILS_AS_READ,
  RECORD_FROM_1_0_AS_READ,
  RECORD_FROM_1_1,
  RECORD_FROM_1_1_AS_READ,
  STUDY_FROM_2_0,
} from "./legacy-fixtures";
import { createTestRepository } from "./test-utils";

afterEach(() => vi.restoreAllMocks());

const EXPORTED_AT = "2026-10-26T12:00:00.000Z";

const TABLES: Record<StudyKind, "studyProgress" | "discoveries" | "personalConnections" | "explorations"> = {
  progress: "studyProgress",
  discoveries: "discoveries",
  personalConnections: "personalConnections",
  explorations: "explorations",
};
const ALL_TABLES = ["investigations", ...Object.values(TABLES)] as const;

const studyFixture = () => structuredClone(STUDY_FROM_2_0) as unknown as StudyData;

/** Stores records directly, exactly as given. */
async function putRaw(db: GospelLabsDatabase, table: (typeof ALL_TABLES)[number], records: readonly unknown[]) {
  await (db[table] as unknown as { bulkPut: (records: unknown[]) => Promise<unknown> }).bulkPut(structuredClone([...records]));
}

async function seedStudy(db: GospelLabsDatabase, study: StudyData = studyFixture()) {
  for (const kind of STUDY_KINDS) await putRaw(db, TABLES[kind], study[kind]);
}

/** Every table's raw contents, for comparing before and after. */
async function contents(db: GospelLabsDatabase) {
  const entries = await Promise.all(ALL_TABLES.map(async (name) => [name, await db[name].toArray()] as const));
  return Object.fromEntries(entries);
}

function parsed(text: string): ParsedBackup {
  const result = parseBackup(text);
  if (!result.ok) throw new Error(result.error.message);
  return result.backup;
}

async function exportText(repository: ReturnType<typeof createTestRepository>["repository"]) {
  const { backup } = await repository.exportBackup(EXPORTED_AT, { preferences: PREFERENCES_FROM_2_0 });
  return serializeBackup(backup);
}

const kindSummary = (added = 0, updated = 0, kept = 0, removed = 0) => ({ added, updated, kept, removed });

describe("export", () => {
  it("includes every table, every record exactly as stored, and the given preferences", async () => {
    const { db, repository } = createTestRepository();
    const withFutureField = { ...richInvestigation("a"), laterField: [1, 2] } as Investigation;
    await putRaw(db, "investigations", [withFutureField]);
    const study = studyFixture();
    study.discoveries = study.discoveries.map((card) => ({ ...card, futureField: "kept", origin: { ...card.origin, extra: 1 } }));
    await seedStudy(db, study);

    const { backup, counts, unreadable } = await repository.exportBackup(EXPORTED_AT, { preferences: PREFERENCES_FROM_2_0 });
    expect(backup).toEqual({
      format: "gospel-labs-backup",
      version: 3,
      exportedAt: EXPORTED_AT,
      investigations: [withFutureField],
      study: {
        ...study,
        // Most recently updated first, like everywhere else.
        explorations: [...study.explorations].reverse(),
      },
      preferences: PREFERENCES_FROM_2_0,
    });
    expect(counts).toEqual({ investigations: 1, progress: 1, discoveries: 1, personalConnections: 1, explorations: 2 });
    expect(unreadable).toBe(0);
  });

  it("leaves damaged records out and counts them by kind", async () => {
    const { db, repository } = createTestRepository();
    await seedStudy(db);
    await putRaw(db, "discoveries", [{ id: "damaged-card" }]);
    await putRaw(db, "investigations", [{ id: "damaged-investigation" }]);
    const { backup, unreadable, unreadableByKind } = await repository.exportBackup(EXPORTED_AT);
    expect(backup.study.discoveries.map((card) => card.id)).toEqual([STUDY_FROM_2_0.discoveries[0].id]);
    expect(backup.investigations).toEqual([]);
    expect(unreadable).toBe(2);
    expect(unreadableByKind).toMatchObject({ investigations: 1, discoveries: 1, progress: 0 });
  });

  it("keeps records saved by a newer version, even ones this version can't read", async () => {
    const { db, repository } = createTestRepository();
    const fromTheFuture = { id: "future", dataVersion: STUDY_DATA_VERSION + 1, shape: "unknown to this version" };
    await putRaw(db, "personalConnections", [fromTheFuture]);
    const { backup, unreadable } = await repository.exportBackup(EXPORTED_AT);
    expect(backup.study.personalConnections).toEqual([fromTheFuture]);
    expect(unreadable).toBe(0);
    // This version then skips it on import rather than writing it back over anything.
    expect(parsed(serializeBackup(backup)).studySkipped).toEqual([
      expect.objectContaining({ kind: "personalConnections", id: "future", reason: expect.stringContaining("newer version") }),
    ]);
  });
});

describe("export → delete everything → import → export", () => {
  it.each(["merge", "replace"] as const)("reproduces everything exactly (%s)", async (mode) => {
    const { db, repository } = createTestRepository();
    for (const id of ["a", "b"]) await repository.save(richInvestigation(id), null);
    await putRaw(db, "investigations", [RECORD_FROM_1_1]);
    const study = studyFixture();
    // Fields a newer version added at the top level of each kind of record are kept.
    for (const kind of STUDY_KINDS) {
      (study as Record<StudyKind, unknown[]>)[kind] = study[kind].map((record) => ({ ...record, futureField: { kind } }));
    }
    await seedStudy(db, study);

    const first = await exportText(repository);
    expect(await repository.deleteEverything()).toEqual({
      investigations: 3,
      progress: 1,
      discoveries: 1,
      personalConnections: 1,
      explorations: 2,
    });
    expect(await repository.countEverything()).toEqual({
      investigations: 0,
      progress: 0,
      discoveries: 0,
      personalConnections: 0,
      explorations: 0,
    });

    const summary = await repository.importBackup(parsed(first), mode);
    expect(summary.total).toEqual(kindSummary(8));
    const second = await exportText(repository);
    expect(JSON.parse(second)).toEqual(JSON.parse(first));
    expect(JSON.parse(second).study.discoveries[0].futureField).toEqual({ kind: "discoveries" });
  });

  it("re-importing the same backup with merge changes nothing", async () => {
    const { db, repository } = createTestRepository();
    await repository.save(richInvestigation("a"), null);
    await seedStudy(db);
    const text = await exportText(repository);
    const before = await contents(db);

    const summary = await repository.importBackup(parsed(text), "merge");
    expect(summary.total).toEqual(kindSummary(0, 0, 6));
    expect(await contents(db)).toEqual(before);
  });
});

describe("importing older backups", () => {
  it.each([
    ["1.0", BACKUP_FROM_1_0, RECORD_FROM_1_0_AS_READ],
    ["1.1 before trails", BACKUP_V2_BEFORE_TRAILS, RECORD_BEFORE_TRAILS_AS_READ],
    ["1.1 before connections", BACKUP_V2_BEFORE_CONNECTIONS, RECORD_BEFORE_CONNECTIONS_AS_READ],
    ["1.1 before reflection", BACKUP_V2_BEFORE_REFLECTION, RECORD_BEFORE_REFLECTION_AS_READ],
    ["1.1 as released", BACKUP_FROM_1_1, RECORD_FROM_1_1_AS_READ],
  ])("merges a %s backup alongside study data, which it leaves alone", async (_name, text, asRead) => {
    const { db, repository } = createTestRepository();
    await seedStudy(db);
    const study = (await contents(db)) as Record<string, unknown[]>;

    const summary = await repository.importBackup(parsed(text), "merge");
    expect(summary.kinds.investigations).toEqual(kindSummary(1));
    expect(summary.kinds.discoveries).toEqual(kindSummary());
    expect(await repository.get(asRead.id)).toEqual({
      status: "found",
      // Written by this version, so stamped with its record format.
      investigation: { ...asRead, dataVersion: RECORD_DATA_VERSION },
    });
    for (const table of Object.values(TABLES)) expect(await db[table].toArray()).toEqual(study[table]);
  });

  it("replacing with a 1.0 backup deletes the study data too, and says so first", async () => {
    const { db, repository } = createTestRepository();
    await seedStudy(db);
    const backup = parsed(BACKUP_FROM_1_0);

    const preview = await repository.previewBackup(backup, "replace");
    expect(preview.kinds).toEqual({
      investigations: kindSummary(1),
      progress: kindSummary(0, 0, 0, 1),
      discoveries: kindSummary(0, 0, 0, 1),
      personalConnections: kindSummary(0, 0, 0, 1),
      explorations: kindSummary(0, 0, 0, 2),
    });
    expect(await repository.importBackup(backup, "replace")).toEqual(preview);
    expect(await repository.countEverything()).toEqual({
      investigations: 1,
      progress: 0,
      discoveries: 0,
      personalConnections: 0,
      explorations: 0,
    });
  });

  it("restores a 2.0 backup into an empty database exactly", async () => {
    const { db, repository } = createTestRepository();
    const summary = await repository.importBackup(parsed(BACKUP_FROM_2_0), "replace");
    expect(summary.total).toEqual(kindSummary(6));
    expect(await db.investigations.toArray()).toEqual([RECORD_FROM_1_1]);
    for (const kind of STUDY_KINDS) {
      expect(await db[TABLES[kind]].toArray()).toEqual(
        [...STUDY_FROM_2_0[kind]].sort((a, b) => a.id.localeCompare(b.id)),
      );
    }
  });
});

/** One record of each kind, and how to edit it. */
const EDITS: Record<StudyKind, (record: never) => object> = {
  progress: (record: StudyData["progress"][number]) => ({ ...record, difficulty: "hard" }),
  discoveries: (record: StudyData["discoveries"][number]) => ({ ...record, notes: "Edited" }),
  personalConnections: (record: StudyData["personalConnections"][number]) => ({ ...record, note: "Edited" }),
  explorations: (record: StudyData["explorations"][number]) => ({ ...record, note: "Edited" }),
};

describe.each(STUDY_KINDS)("merging %s", (kind) => {
  const table = TABLES[kind];
  const base = () => ({ ...studyFixture()[kind][0], updatedAt: "2026-10-20T00:00:00.000Z" }) as { id: string; updatedAt: string };
  const edited = (updatedAt: string) => ({ ...EDITS[kind](base() as never), updatedAt }) as unknown as { id: string };
  const importOne = (repository: ReturnType<typeof createTestRepository>["repository"], record: object) =>
    repository.importBackup({ investigations: [], study: { [kind]: [record] } }, "merge");

  it("adds a record that isn't stored", async () => {
    const { db, repository } = createTestRepository();
    const summary = await importOne(repository, base());
    expect(summary.kinds[kind]).toEqual(kindSummary(1));
    expect(await db[table].get(base().id)).toEqual(base());
  });

  it("takes the backup's copy when it was updated more recently", async () => {
    const { db, repository } = createTestRepository();
    await putRaw(db, table, [base()]);
    const newer = edited("2026-10-21T00:00:00.000Z");
    expect((await importOne(repository, newer)).kinds[kind]).toEqual(kindSummary(0, 1));
    expect(await db[table].get(base().id)).toEqual(newer);
  });

  it("keeps the stored copy when it is newer, or updated at the same moment", async () => {
    const { db, repository } = createTestRepository();
    await putRaw(db, table, [base()]);
    expect((await importOne(repository, edited("2026-10-19T00:00:00.000Z"))).kinds[kind]).toEqual(kindSummary(0, 0, 1));
    // The same moment written differently is still a tie.
    expect((await importOne(repository, edited("2026-10-20T00:00:00Z"))).kinds[kind]).toEqual(kindSummary(0, 0, 1));
    expect(await db[table].get(base().id)).toEqual(base());
  });

  it("never replaces a stored record saved by a newer version, even one it can't read", async () => {
    const { db, repository } = createTestRepository();
    const readable = { ...base(), dataVersion: STUDY_DATA_VERSION + 1 };
    const unreadable = { id: "unreadable-future", dataVersion: STUDY_DATA_VERSION + 1 };
    await putRaw(db, table, [readable, unreadable]);
    const summary = await repository.importBackup(
      { investigations: [], study: { [kind]: [edited("2030-01-01T00:00:00.000Z"), { ...base(), id: "unreadable-future", updatedAt: "2030-01-01T00:00:00.000Z" }] } },
      "merge",
    );
    expect(summary.kinds[kind]).toEqual(kindSummary(0, 0, 2));
    expect(await db[table].get(base().id)).toEqual(readable);
    expect(await db[table].get("unreadable-future")).toEqual(unreadable);
  });

  it("replaces a damaged stored record with the backup's valid copy, counted as updated", async () => {
    const { db, repository } = createTestRepository();
    await putRaw(db, table, [{ id: base().id }]);
    expect((await importOne(repository, base())).kinds[kind]).toEqual(kindSummary(0, 1));
    expect(await db[table].get(base().id)).toEqual(base());
  });
});

describe("replace", () => {
  it("deletes every record in all five tables, damaged ones included, then writes the backup's", async () => {
    const { db, repository } = createTestRepository();
    await repository.save(richInvestigation("old"), null);
    await seedStudy(db);
    await putRaw(db, "discoveries", [{ id: "damaged" }]);
    const incoming = { investigations: [richInvestigation("new")], study: { explorations: [studyFixture().explorations[1]] } };

    const summary = await repository.importBackup(incoming, "replace");
    expect(summary.kinds).toEqual({
      investigations: kindSummary(1, 0, 0, 1),
      progress: kindSummary(0, 0, 0, 1),
      discoveries: kindSummary(0, 0, 0, 2),
      personalConnections: kindSummary(0, 0, 0, 1),
      explorations: kindSummary(1, 0, 0, 2),
    });
    const after = await contents(db);
    expect(after.investigations.map((record) => (record as { id: string }).id)).toEqual(["new"]);
    expect(after.explorations).toEqual([studyFixture().explorations[1]]);
    expect([after.studyProgress, after.discoveries, after.personalConnections]).toEqual([[], [], []]);
  });

  it("stamps imported records with the format this version writes", async () => {
    const { db, repository } = createTestRepository();
    const unstamped = studyFixture().discoveries.map((card) => ({ ...card, dataVersion: undefined }));
    await repository.importBackup({ investigations: [], study: { discoveries: unstamped } }, "replace");
    expect((await db.discoveries.toArray())[0]).toMatchObject({ dataVersion: STUDY_DATA_VERSION });
  });
});

describe("previews", () => {
  it("report exactly what the import then does, per kind, without changing anything", async () => {
    const { db, repository } = createTestRepository();
    await repository.save(richInvestigation("a", { updatedAt: "2026-01-01T00:00:00.000Z" }), null);
    await seedStudy(db);
    const before = await contents(db);
    const backup = parsed(BACKUP_FROM_2_0);

    const merge = await repository.previewBackup(backup, "merge");
    const replace = await repository.previewBackup(backup, "replace");
    expect(merge.kinds).toEqual({
      investigations: kindSummary(1),
      progress: kindSummary(0, 0, 1),
      discoveries: kindSummary(0, 0, 1),
      personalConnections: kindSummary(0, 0, 1),
      explorations: kindSummary(0, 0, 2),
    });
    expect(replace.total).toEqual(kindSummary(6, 0, 0, 6));
    expect(await contents(db)).toEqual(before);
    expect(await repository.importBackup(backup, "merge")).toEqual(merge);
  });
});

describe("atomic imports", () => {
  describe.each(["merge", "replace"] as const)("%s", (mode) => {
    it.each(ALL_TABLES)("changes nothing when writing %s fails partway", async (failing) => {
      const { db, repository } = createTestRepository();
      await repository.save(richInvestigation("keep-me"), null);
      const kept = studyFixture();
      kept.discoveries = kept.discoveries.map((card) => ({ ...card, id: "kept-card" }));
      kept.progress = kept.progress.map((record) => ({ ...record, id: "kept-progress", discoveryId: "kept-card" }));
      kept.personalConnections = kept.personalConnections.map((record) => ({ ...record, id: "kept-connection" }));
      kept.explorations = kept.explorations.map((record) => ({ ...record, id: `kept-${record.id}` }));
      await seedStudy(db, kept);
      const before = await contents(db);

      // Tables are written in order, so a failure in a later one comes after earlier writes in the same transaction.
      vi.spyOn(db[failing], "bulkPut").mockRejectedValue(new DOMException("No space", "QuotaExceededError"));
      await expect(repository.importBackup(parsed(BACKUP_FROM_2_0), mode)).rejects.toMatchObject({ kind: "quota" });
      vi.restoreAllMocks();
      expect(await contents(db)).toEqual(before);
    });
  });

  it("rejects the whole import if any study record is invalid, without changing anything", async () => {
    const { db, repository } = createTestRepository();
    await repository.save(richInvestigation("keep-me"), null);
    await seedStudy(db);
    const before = await contents(db);
    const invalid = { ...studyFixture().discoveries[0], id: "broken", title: "" };
    await expect(
      repository.importBackup({ investigations: [richInvestigation("ok")], study: { discoveries: [invalid] } }, "replace"),
    ).rejects.toMatchObject({ kind: "invalid-data" });
    expect(await contents(db)).toEqual(before);
  });

  it("refuses records stamped by a newer version, even when passed in directly", async () => {
    const { db, repository } = createTestRepository();
    await seedStudy(db);
    const before = await contents(db);
    const fromTheFuture = { ...studyFixture().progress[0], dataVersion: STUDY_DATA_VERSION + 1 };
    await expect(
      repository.importBackup({ investigations: [], study: { progress: [fromTheFuture] } }, "replace"),
    ).rejects.toMatchObject({ kind: "invalid-data", message: expect.stringContaining("newer version") });
    expect(await contents(db)).toEqual(before);
  });

  it("delete everything is all-or-nothing too", async () => {
    const { db, repository } = createTestRepository();
    await repository.save(richInvestigation("keep-me"), null);
    await seedStudy(db);
    const before = await contents(db);
    vi.spyOn(db.explorations, "clear").mockRejectedValue(new DOMException("Broken", "UnknownError"));
    await expect(repository.deleteEverything()).rejects.toMatchObject({ kind: "unavailable" });
    vi.restoreAllMocks();
    expect(await contents(db)).toEqual(before);
  });
});

describe("counting", () => {
  it("counts every stored record of each kind, readable or not", async () => {
    const { db, repository } = createTestRepository();
    await repository.save(richInvestigation("a"), null);
    await putRaw(db, "investigations", [{ id: "damaged" }]);
    await seedStudy(db);
    expect(await repository.countEverything()).toEqual({
      investigations: 2,
      progress: 1,
      discoveries: 1,
      personalConnections: 1,
      explorations: 2,
    });
  });
});
