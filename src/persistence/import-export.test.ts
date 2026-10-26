/** End-to-end: export from one database, import into another, through the real backup file text. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { RECORD_DATA_VERSION } from "@/domain/investigation";
import { richInvestigation } from "@/domain/test-fixtures";
import { parseBackup, serializeBackup, type StudyData } from "./backup";
import { readStoredPreferences } from "./backup-preferences";
import {
  BACKUP_FROM_1_0,
  PREFERENCES_FROM_2_0,
  STUDY_FROM_2_0,
  BACKUP_V2_BEFORE_TRAILS,
  RECORD_BEFORE_TRAILS,
  RECORD_BEFORE_TRAILS_AS_READ,
  RECORD_FROM_1_0,
  RECORD_FROM_1_0_AS_READ,
} from "./legacy-fixtures";
import { createStudyRepository } from "./study-repository";
import { createTestRepository } from "./test-utils";

afterEach(() => vi.restoreAllMocks());

async function exportText(repository: ReturnType<typeof createTestRepository>["repository"]) {
  const { backup } = await repository.exportBackup("2026-10-20T12:00:00.000Z");
  return serializeBackup(backup);
}

function parsed(text: string) {
  const result = parseBackup(text);
  if (!result.ok) throw new Error(result.error.message);
  return result.backup.investigations;
}

describe("export → import round trip", () => {
  it("reproduces every investigation in a fresh database", async () => {
    const source = createTestRepository().repository;
    for (const id of ["a", "b", "c"]) await source.save(richInvestigation(id), null);

    const target = createTestRepository().repository;
    const summary = await target.importInvestigations(parsed(await exportText(source)), "replace");

    expect(summary).toMatchObject({ added: 3, removed: 0 });
    expect(await target.list()).toEqual(await source.list());
  });

  it("re-importing the same backup with merge changes nothing", async () => {
    const { repository } = createTestRepository();
    await repository.save(richInvestigation("a"), null);
    const text = await exportText(repository);
    const before = await repository.list();

    expect(await repository.importInvestigations(parsed(text), "merge")).toMatchObject({ added: 0, updated: 0, kept: 1 });
    expect(await repository.list()).toEqual(before);
  });

  it("excludes unreadable stored records from the export and reports them", async () => {
    const { db, repository } = createTestRepository();
    await repository.save(richInvestigation("good"), null);
    await db.investigations.put({ id: "corrupt" } as never);
    const { backup, unreadable } = await repository.exportBackup("2026-10-20T12:00:00.000Z");
    expect(backup.investigations.map((i) => i.id)).toEqual(["good"]);
    expect(unreadable).toBe(1);
  });
});

describe("connections", () => {
  it("survive export and import exactly", async () => {
    const source = createTestRepository().repository;
    await source.save(richInvestigation("a"), null);
    const target = createTestRepository().repository;
    await target.importInvestigations(parsed(await exportText(source)), "replace");
    const loaded = await target.get("a");
    expect(loaded.status === "found" && loaded.investigation.evidenceConnections).toEqual(
      richInvestigation("a").evidenceConnections,
    );
  });

  it("an import containing an orphaned connection changes nothing", async () => {
    const { repository } = createTestRepository();
    await repository.save(richInvestigation("kept"), null);
    const orphaned = richInvestigation("orphaned");
    orphaned.evidenceConnections = [{ ...orphaned.evidenceConnections[0], fromEvidenceId: "gone" }];

    await expect(repository.importInvestigations([orphaned], "replace")).rejects.toMatchObject({ kind: "invalid-data" });
    expect((await repository.list()).investigations.map((i) => i.id)).toEqual(["kept"]);
  });
});

describe("discoveries and reflections", () => {
  it("survive export and import exactly", async () => {
    const source = createTestRepository().repository;
    await source.save(richInvestigation("a"), null);
    const target = createTestRepository().repository;
    await target.importInvestigations(parsed(await exportText(source)), "replace");
    expect(await target.get("a")).toEqual({ status: "found", investigation: richInvestigation("a") });
  });
});

describe("older backups", () => {
  it("merges a Gospel Labs 1.0 backup alongside newer data", async () => {
    const { repository } = createTestRepository();
    await repository.save(richInvestigation("current"), null);

    const summary = await repository.importInvestigations(parsed(BACKUP_FROM_1_0), "merge");
    expect(summary).toMatchObject({ added: 1, updated: 0, kept: 0 });
    expect(await repository.get(RECORD_FROM_1_0.id)).toEqual({
      status: "found",
      // Written by this version, so stamped with its record format.
      investigation: { ...RECORD_FROM_1_0_AS_READ, dataVersion: RECORD_DATA_VERSION },
    });
    expect(await repository.get("current")).toEqual({ status: "found", investigation: richInvestigation("current") });
  });

  it("restores a version 2 backup from before trails, keeping its challenge responses", async () => {
    const { repository } = createTestRepository();
    expect(await repository.importInvestigations(parsed(BACKUP_V2_BEFORE_TRAILS), "replace")).toMatchObject({ added: 1 });
    expect(await repository.get(RECORD_BEFORE_TRAILS.id)).toEqual({
      status: "found",
      investigation: { ...RECORD_BEFORE_TRAILS_AS_READ, dataVersion: RECORD_DATA_VERSION },
    });
  });
});

describe("merge", () => {
  it("adds new, updates older local copies, and keeps newer local copies", async () => {
    const { repository } = createTestRepository();
    await repository.save(richInvestigation("stale", { updatedAt: "2026-01-01T00:00:00.000Z" }), null);
    await repository.save(richInvestigation("fresh", { updatedAt: "2026-09-01T00:00:00.000Z", title: "Mine" }), null);

    const incoming = [
      richInvestigation("stale", { updatedAt: "2026-02-01T00:00:00.000Z", title: "From backup" }),
      richInvestigation("fresh", { updatedAt: "2026-08-01T00:00:00.000Z", title: "Older backup copy" }),
      richInvestigation("brand-new"),
    ];
    expect(await repository.importInvestigations(incoming, "merge")).toEqual({
      mode: "merge",
      added: 1,
      updated: 1,
      kept: 1,
      removed: 0,
    });

    const titles = Object.fromEntries((await repository.list()).investigations.map((i) => [i.id, i.title]));
    expect(titles).toEqual({ stale: "From backup", fresh: "Mine", "brand-new": "Investigation brand-new" });
  });

  it("previews exactly what the import then does", async () => {
    const { repository } = createTestRepository();
    await repository.save(richInvestigation("a", { updatedAt: "2026-01-01T00:00:00.000Z" }), null);
    const incoming = [richInvestigation("a", { updatedAt: "2026-02-01T00:00:00.000Z" }), richInvestigation("b")];
    const preview = await repository.previewImport(incoming, "merge");
    expect(await repository.count()).toBe(1);
    expect(await repository.importInvestigations(incoming, "merge")).toEqual(preview);
  });
});

describe("replace", () => {
  it("removes investigations that aren't in the backup", async () => {
    const { repository } = createTestRepository();
    await repository.save(richInvestigation("old-1"), null);
    await repository.save(richInvestigation("old-2"), null);
    const summary = await repository.importInvestigations([richInvestigation("new")], "replace");
    expect(summary).toMatchObject({ added: 1, removed: 2 });
    expect((await repository.list()).investigations.map((i) => i.id)).toEqual(["new"]);
  });

  it("is all-or-nothing: a failure while writing leaves existing data intact", async () => {
    const { db, repository } = createTestRepository();
    await repository.save(richInvestigation("keep-me"), null);
    vi.spyOn(db.investigations, "bulkPut").mockRejectedValue(new DOMException("No space", "QuotaExceededError"));

    await expect(repository.importInvestigations([richInvestigation("new")], "replace")).rejects.toMatchObject({
      kind: "quota",
    });
    vi.restoreAllMocks();
    expect((await repository.list()).investigations.map((i) => i.id)).toEqual(["keep-me"]);
  });

  it("rejects the whole import if any record is invalid, without deleting anything", async () => {
    const { repository } = createTestRepository();
    await repository.save(richInvestigation("keep-me"), null);
    const invalid = { ...richInvestigation("bad"), status: "nope" } as never;
    await expect(repository.importInvestigations([richInvestigation("ok"), invalid], "replace")).rejects.toMatchObject({
      kind: "invalid-data",
    });
    expect((await repository.list()).investigations.map((i) => i.id)).toEqual(["keep-me"]);
  });
});

describe("whole backups between devices (format 3)", () => {
  it("move investigations, study data, and preferences to a fresh database exactly", async () => {
    const source = createTestRepository();
    await source.repository.save(richInvestigation("a"), null);
    const study = createStudyRepository(source.db);
    const fixture = structuredClone(STUDY_FROM_2_0) as unknown as StudyData;
    await study.completeInvestigation(fixture.progress[0], fixture.discoveries[0]);
    await study.personalConnections.put(fixture.personalConnections[0]);
    for (const exploration of fixture.explorations) await study.explorations.put(exploration);

    // Preferences come from localStorage on the exporting device.
    const preferences = readStoredPreferences({
      getItem: (key) =>
        ({ "gospel-labs:theme": "dawn", "gospel-labs:preferences": JSON.stringify(PREFERENCES_FROM_2_0) })[key] ?? null,
    });
    const { backup } = await source.repository.exportBackup("2026-10-26T12:00:00.000Z", { preferences });
    const text = serializeBackup(backup);
    expect(JSON.parse(text)).toMatchObject({ version: 3, preferences: PREFERENCES_FROM_2_0 });

    const target = createTestRepository();
    const result = parseBackup(text);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.backup.preferences).toEqual(PREFERENCES_FROM_2_0);
    await target.repository.importBackup(result.backup, "merge");

    expect(await target.repository.list()).toEqual(await source.repository.list());
    const [sourceStudy, targetStudy] = await Promise.all(
      [source.db, target.db].map((db) => createStudyRepository(db).snapshot()),
    );
    expect(targetStudy).toEqual(sourceStudy);
    expect(targetStudy.snapshot.discoveries).toEqual(fixture.discoveries);
  });

  it("an older (investigations-only) import leaves study data alone", async () => {
    const { db, repository } = createTestRepository();
    const study = createStudyRepository(db);
    const fixture = structuredClone(STUDY_FROM_2_0) as unknown as StudyData;
    await study.discoveries.put(fixture.discoveries[0]);
    await repository.importInvestigations([richInvestigation("new")], "replace");
    expect((await study.discoveries.list()).records).toHaveLength(1);
  });
});
