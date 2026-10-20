import { afterEach, describe, expect, it, vi } from "vitest";
import type { Investigation } from "@/domain/investigation";
import { investigationReducer } from "@/domain/investigation-reducer";
import { blankInvestigation, richInvestigation, T1, T2 } from "@/domain/test-fixtures";
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

  it("refuses to create a new investigation over an existing id", async () => {
    const { repository } = createTestRepository();
    await repository.save(richInvestigation("inv-1"), null);
    expect(await repository.save(richInvestigation("inv-1"), null)).toEqual({ ok: false, conflict: "exists" });
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
