import { describe, expect, it } from "vitest";
import { richInvestigation } from "@/domain/test-fixtures";
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  backupFileName,
  createBackup,
  parseBackup,
  planImport,
  serializeBackup,
} from "./backup";

const EXPORTED_AT = "2026-10-20T12:00:00.000Z";
const file = (data: unknown) => JSON.stringify(data);
const envelope = (investigations: unknown[], extra: Record<string, unknown> = {}) =>
  file({ format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: EXPORTED_AT, investigations, ...extra });

describe("serialize → parse round trip", () => {
  it("restores every investigation exactly", () => {
    const investigations = [richInvestigation("a"), richInvestigation("b")];
    const result = parseBackup(serializeBackup(createBackup(investigations, EXPORTED_AT)));
    expect(result).toEqual({
      ok: true,
      backup: { version: BACKUP_VERSION, exportedAt: EXPORTED_AT, investigations, skipped: [] },
    });
  });

  it("handles an empty backup", () => {
    const result = parseBackup(serializeBackup(createBackup([], EXPORTED_AT)));
    expect(result.ok && result.backup.investigations).toEqual([]);
  });

  it("names files by export date", () => {
    expect(backupFileName(EXPORTED_AT)).toBe("gospel-labs-backup-2026-10-20.json");
  });
});

describe("rejecting unusable files", () => {
  it.each([
    ["an empty file", "  ", "empty"],
    ["truncated JSON", envelope([richInvestigation("a")]).slice(0, 200), "not-json"],
    ["some other JSON", file({ hello: "world" }), "not-a-backup"],
    ["a JSON array", file([1, 2]), "not-a-backup"],
    ["a missing version", file({ format: BACKUP_FORMAT, investigations: [] }), "malformed"],
    ["a non-integer version", file({ format: BACKUP_FORMAT, version: "1", investigations: [] }), "malformed"],
    ["a version from a newer app", envelope([], { version: BACKUP_VERSION + 1 }), "newer-version"],
    ["version 0", envelope([], { version: 0 }), "unsupported-version"],
    ["no investigations list", file({ format: BACKUP_FORMAT, version: BACKUP_VERSION }), "malformed"],
  ])("rejects %s", (_name, text, kind) => {
    const result = parseBackup(text);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe(kind);
      expect(result.error.message).not.toBe("");
    }
  });
});

describe("skipping bad entries", () => {
  it("imports valid entries and explains each skipped one", () => {
    const good = richInvestigation("good");
    const badStatus = { ...richInvestigation("bad"), status: "solved" };
    const result = parseBackup(envelope([good, badStatus, "not an object"]));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.investigations).toEqual([good]);
    expect(result.backup.skipped).toEqual([
      { index: 1, id: "bad", title: "Investigation bad", reason: expect.stringContaining("status") },
      { index: 2, id: undefined, title: undefined, reason: expect.any(String) },
    ]);
  });

  it("rejects entries whose claims cite missing evidence", () => {
    const broken = richInvestigation("broken");
    broken.evidence = broken.evidence.slice(1); // cl-1 still cites ev-1
    const result = parseBackup(envelope([broken]));
    expect(result.ok && result.backup.skipped[0].reason).toContain("missing evidence");
  });

  it("keeps the first of two entries with the same id", () => {
    const first = richInvestigation("dup", { title: "First" });
    const second = richInvestigation("dup", { title: "Second" });
    const result = parseBackup(envelope([first, second]));
    expect(result.ok && result.backup.investigations).toEqual([first]);
    expect(result.ok && result.backup.skipped).toEqual([
      { index: 1, id: "dup", title: "Second", reason: expect.stringContaining("Duplicate id") },
    ]);
  });

  it("tolerates a missing or invalid export date", () => {
    const result = parseBackup(envelope([richInvestigation("a")], { exportedAt: "last tuesday" }));
    expect(result.ok && result.backup.exportedAt).toBeUndefined();
    expect(result.ok && result.backup.investigations).toHaveLength(1);
  });
});

describe("planImport", () => {
  const local = richInvestigation("shared", { updatedAt: "2026-05-01T00:00:00.000Z" });
  const onlyLocal = richInvestigation("local-only");

  it("merge adds new investigations and keeps local-only ones", () => {
    const plan = planImport([onlyLocal], [richInvestigation("new")], "merge");
    expect(plan).toMatchObject({ added: 1, updated: 0, kept: 0, removed: 0 });
    expect(plan.toWrite.map((i) => i.id)).toEqual(["new"]);
  });

  it("merge takes the backup copy when it was edited more recently", () => {
    const newer = { ...local, title: "Edited later", updatedAt: "2026-06-01T00:00:00.000Z" };
    expect(planImport([local], [newer], "merge")).toMatchObject({ toWrite: [newer], updated: 1, kept: 0 });
  });

  it("merge keeps the stored copy when it is newer or identical", () => {
    const older = { ...local, title: "Old title", updatedAt: "2026-04-01T00:00:00.000Z" };
    expect(planImport([local], [older], "merge")).toMatchObject({ toWrite: [], kept: 1 });
    expect(planImport([local], [structuredClone(local)], "merge")).toMatchObject({ toWrite: [], kept: 1 });
  });

  it("merge compares times, not strings, across timestamp formats", () => {
    const sameMomentNoMillis = { ...local, title: "Changed", updatedAt: "2026-05-01T00:00:00Z" };
    expect(planImport([local], [sameMomentNoMillis], "merge")).toMatchObject({ kept: 1 });
  });

  it("replace writes the whole backup and counts what will be removed", () => {
    const plan = planImport([local, onlyLocal], [richInvestigation("x")], "replace");
    expect(plan).toMatchObject({ added: 1, removed: 2 });
    expect(plan.toWrite.map((i) => i.id)).toEqual(["x"]);
  });
});
