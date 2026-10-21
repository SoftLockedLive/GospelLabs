import { describe, expect, it } from "vitest";
import { richInvestigation } from "@/domain/test-fixtures";
import {
  BACKUP_FROM_1_0,
  BACKUP_V2_BEFORE_TRAILS,
  BACKUP_V2_BEFORE_CONNECTIONS,
  BACKUP_V2_BEFORE_REFLECTION,
  RECORD_BEFORE_REFLECTION_AS_READ,
  RECORD_BEFORE_CONNECTIONS_AS_READ,
  RECORD_BEFORE_TRAILS_AS_READ,
  RECORD_FROM_1_0,
  RECORD_FROM_1_0_AS_READ,
} from "./legacy-fixtures";
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

describe("older backup versions", () => {
  it("writes version 2 with discoveries and reflections", () => {
    const [written] = JSON.parse(serializeBackup(createBackup([richInvestigation("a")], EXPORTED_AT))).investigations;
    expect(written.discoveryHighlights).toEqual(richInvestigation("a").discoveryHighlights);
    expect(written.christReflection).toEqual({ "learned-about-christ": "He invites rather than compels." });
  });

  it("skips entries whose discoveries link to missing evidence and says why", () => {
    const orphaned = richInvestigation("orphaned");
    orphaned.discoveryHighlights = [{ ...orphaned.discoveryHighlights[0], evidenceIds: ["deleted-card"] }];
    const result = parseBackup(envelope([orphaned]));
    expect(result.ok && result.backup.skipped).toEqual([
      expect.objectContaining({ id: "orphaned", reason: expect.stringContaining('links to missing evidence "deleted-card"') }),
    ]);
  });

  it("writes version 2, including challenge responses and trail progress", () => {
    const backup = createBackup([richInvestigation("a")], EXPORTED_AT);
    expect(backup.version).toBe(2);
    const [written] = JSON.parse(serializeBackup(backup)).investigations;
    expect(written.challengeResponses).toHaveLength(1);
    expect(written.trailProgress).toEqual(richInvestigation("a").trailProgress);
    expect(written.trailProgress[0].steps).toHaveLength(1);
  });

  it("imports a version 1 backup from Gospel Labs 1.0 with every field intact", () => {
    const result = parseBackup(BACKUP_FROM_1_0);
    expect(result).toEqual({
      ok: true,
      backup: {
        version: 1,
        exportedAt: "2026-10-03T08:00:00.000Z",
        investigations: [RECORD_FROM_1_0_AS_READ],
        skipped: [],
      },
    });
  });

  it("imports a version 2 backup written before discovery trails existed", () => {
    const result = parseBackup(BACKUP_V2_BEFORE_TRAILS);
    expect(result.ok && result.backup.skipped).toEqual([]);
    expect(result.ok && result.backup.investigations).toEqual([RECORD_BEFORE_TRAILS_AS_READ]);
  });

  it("imports a version 2 backup written before reflections and discoveries, keeping everything else", () => {
    const result = parseBackup(BACKUP_V2_BEFORE_REFLECTION);
    expect(result.ok && result.backup.skipped).toEqual([]);
    expect(result.ok && result.backup.investigations).toEqual([RECORD_BEFORE_REFLECTION_AS_READ]);
  });

  it("imports a version 2 backup written before evidence connections, keeping responses and trail notes", () => {
    const result = parseBackup(BACKUP_V2_BEFORE_CONNECTIONS);
    expect(result.ok && result.backup.skipped).toEqual([]);
    expect(result.ok && result.backup.investigations).toEqual([RECORD_BEFORE_CONNECTIONS_AS_READ]);
  });

  it("upgrades valid version 1 entries and still reports broken ones", () => {
    const text = file({
      format: BACKUP_FORMAT,
      version: 1,
      investigations: [RECORD_FROM_1_0, "junk", null, { ...RECORD_FROM_1_0, id: "bad", status: "solved" }],
    });
    const result = parseBackup(text);
    expect(result.ok && result.backup.investigations.map((i) => i.id)).toEqual([RECORD_FROM_1_0.id]);
    expect(result.ok && result.backup.skipped.map((entry) => entry.index)).toEqual([1, 2, 3]);
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

  it("skips entries with orphaned, self-referencing, or malformed connections and says why", () => {
    const orphaned = richInvestigation("orphaned");
    orphaned.evidenceConnections = [{ ...orphaned.evidenceConnections[0], toEvidenceId: "deleted-card" }];
    const selfLinked = richInvestigation("self");
    selfLinked.evidenceConnections = [{ ...selfLinked.evidenceConnections[0], toEvidenceId: "ev-1" }];
    const malformed = { ...richInvestigation("malformed"), evidenceConnections: [{ id: "x", relationship: "proves" }] };
    const result = parseBackup(envelope([richInvestigation("good"), orphaned, selfLinked, malformed]));

    expect(result.ok && result.backup.investigations.map((i) => i.id)).toEqual(["good"]);
    expect(result.ok && result.backup.skipped.map((entry) => [entry.id, entry.reason])).toEqual([
      ["orphaned", expect.stringContaining('refers to missing evidence "deleted-card"')],
      ["self", expect.stringContaining("connects evidence to itself")],
      ["malformed", expect.stringContaining("evidenceConnections")],
    ]);
  });

  it("skips entries saved by a newer version of the app", () => {
    const result = parseBackup(envelope([{ ...richInvestigation("next"), dataVersion: 99 }, richInvestigation("ok")]));
    expect(result.ok && result.backup.investigations.map((i) => i.id)).toEqual(["ok"]);
    expect(result.ok && result.backup.skipped[0]).toMatchObject({ id: "next", reason: expect.stringContaining("newer version") });
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

  it("merge never replaces a stored record saved by a newer version", () => {
    const newerLocal = { ...local, dataVersion: 99 };
    const edited = { ...local, title: "Edited later", updatedAt: "2026-06-01T00:00:00.000Z" };
    expect(planImport([newerLocal], [edited], "merge")).toMatchObject({ toWrite: [], kept: 1 });
  });

  it("replace writes the whole backup and counts what will be removed", () => {
    const plan = planImport([local, onlyLocal], [richInvestigation("x")], "replace");
    expect(plan).toMatchObject({ added: 1, removed: 2 });
    expect(plan.toWrite.map((i) => i.id)).toEqual(["x"]);
  });
});
