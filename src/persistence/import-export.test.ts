/** End-to-end: export from one database, import into another, through the real backup file text. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { richInvestigation } from "@/domain/test-fixtures";
import { parseBackup, serializeBackup } from "./backup";
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
