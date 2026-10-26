import { describe, expect, it } from "vitest";
import { richInvestigation } from "@/domain/test-fixtures";
import {
  BACKUP_FROM_1_0,
  BACKUP_FROM_1_1,
  BACKUP_FROM_2_0,
  BACKUP_V2_BEFORE_TRAILS,
  BACKUP_V2_BEFORE_CONNECTIONS,
  BACKUP_V2_BEFORE_REFLECTION,
  CARD_FROM_2_0,
  CONNECTION_FROM_2_0,
  EXPLORATIONS_FROM_2_0,
  PREFERENCES_FROM_2_0,
  PROGRESS_FROM_2_0,
  RECORD_BEFORE_REFLECTION_AS_READ,
  RECORD_BEFORE_CONNECTIONS_AS_READ,
  RECORD_BEFORE_TRAILS_AS_READ,
  RECORD_FROM_1_0,
  RECORD_FROM_1_0_AS_READ,
  RECORD_FROM_1_1_AS_READ,
  STUDY_FROM_2_0,
} from "./legacy-fixtures";
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  backupFileName,
  countOf,
  createBackup,
  describeCounts,
  describeStored,
  emptyStudyData,
  parseBackup,
  planImport,
  planRecords,
  serializeBackup,
  STUDY_KINDS,
  zeroCounts,
  type StudyData,
} from "./backup";

const EXPORTED_AT = "2026-10-20T12:00:00.000Z";
const file = (data: unknown) => JSON.stringify(data);
const envelope = (investigations: unknown[], extra: Record<string, unknown> = {}) =>
  file({ format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: EXPORTED_AT, investigations, ...extra });
/** What a backup holds besides investigations when it has no study data or preferences. */
const NO_STUDY_DATA = { study: emptyStudyData(), studySkipped: [], preferences: {}, notes: [] };

describe("serialize → parse round trip", () => {
  it("restores every investigation exactly", () => {
    const investigations = [richInvestigation("a"), richInvestigation("b")];
    const result = parseBackup(serializeBackup(createBackup(investigations, EXPORTED_AT)));
    expect(result).toEqual({
      ok: true,
      backup: { version: BACKUP_VERSION, exportedAt: EXPORTED_AT, investigations, skipped: [], ...NO_STUDY_DATA },
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
  it("writes discoveries and reflections", () => {
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

  it("writes the current version (3), including challenge responses and trail progress", () => {
    const backup = createBackup([richInvestigation("a")], EXPORTED_AT);
    expect(backup.version).toBe(3);
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
        ...NO_STUDY_DATA,
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

// --- Version 3: study data and preferences --------------------------------------

const study = (overrides: Partial<StudyData> = {}): StudyData => ({
  ...(structuredClone(STUDY_FROM_2_0) as unknown as StudyData),
  ...overrides,
});
const v3 = (extra: Record<string, unknown> = {}) =>
  envelope([], { study: structuredClone(STUDY_FROM_2_0), preferences: PREFERENCES_FROM_2_0, ...extra });
const parsedOrThrow = (text: string) => {
  const result = parseBackup(text);
  if (!result.ok) throw new Error(result.error.message);
  return result.backup;
};

describe("version 3 files", () => {
  it("write every study record and the preferences exactly as given", () => {
    const written = JSON.parse(
      serializeBackup(createBackup([richInvestigation("a")], EXPORTED_AT, { study: study(), preferences: PREFERENCES_FROM_2_0 })),
    );
    expect(written).toEqual({
      format: BACKUP_FORMAT,
      version: 3,
      exportedAt: EXPORTED_AT,
      investigations: [richInvestigation("a")],
      study: STUDY_FROM_2_0,
      preferences: PREFERENCES_FROM_2_0,
    });
  });

  it("always contain a study section, empty when there's no study data", () => {
    expect(JSON.parse(serializeBackup(createBackup([], EXPORTED_AT)))).toMatchObject({
      version: 3,
      study: { progress: [], discoveries: [], personalConnections: [], explorations: [] },
      preferences: {},
    });
  });

  it("round-trip study records and preferences exactly, keeping fields this version doesn't know", () => {
    const withFutureFields = study({
      discoveries: [{ ...study().discoveries[0], futureField: { kept: true } } as StudyData["discoveries"][number]],
      explorations: study().explorations.map((record) => ({ ...record, laterAddition: 7 })),
    });
    const parsed = parsedOrThrow(
      serializeBackup(createBackup([], EXPORTED_AT, { study: withFutureFields, preferences: PREFERENCES_FROM_2_0 })),
    );
    expect(parsed.study).toEqual(withFutureFields);
    expect(parsed.preferences).toEqual(PREFERENCES_FROM_2_0);
    expect(parsed.studySkipped).toEqual([]);
    expect(parsed.notes).toEqual([]);
  });

  it("imports a backup exported by 2.0 with every record and preference intact", () => {
    expect(parseBackup(BACKUP_FROM_2_0)).toEqual({
      ok: true,
      backup: {
        version: 3,
        exportedAt: "2026-10-26T08:00:00.000Z",
        investigations: [RECORD_FROM_1_1_AS_READ],
        skipped: [],
        study: STUDY_FROM_2_0,
        studySkipped: [],
        preferences: PREFERENCES_FROM_2_0,
        notes: [],
      },
    });
  });

  it("are refused by Gospel Labs 1.1 and 1.0 as made by a newer version", () => {
    // 1.1's parseBackup (commit 99d15a2) accepts versions 1–2 and answers any
    // higher version of a "gospel-labs-backup" file with its "newer-version"
    // error; 1.0 accepts only version 1. Keeping the format name and raising
    // the version is what makes them refuse instead of misreading the file.
    const LAST_VERSION_READ_BY_1_1 = 2;
    const written = JSON.parse(serializeBackup(createBackup([richInvestigation("a")], EXPORTED_AT)));
    expect(written.format).toBe("gospel-labs-backup");
    expect(written.version).toBeGreaterThan(LAST_VERSION_READ_BY_1_1);
  });

  it("from a newer version are still refused, with the same message", () => {
    const result = parseBackup(envelope([], { version: 4, study: {} }));
    expect(result).toEqual({
      ok: false,
      error: {
        kind: "newer-version",
        message: "This backup was made by a newer version of Gospel Labs (format 4). Update the app, then import it again.",
      },
    });
  });
});

describe("version 1 and 2 files", () => {
  it.each([
    ["1.0 (version 1)", BACKUP_FROM_1_0],
    ["1.1 before trails (version 2)", BACKUP_V2_BEFORE_TRAILS],
    ["1.1 before connections (version 2)", BACKUP_V2_BEFORE_CONNECTIONS],
    ["1.1 before reflection (version 2)", BACKUP_V2_BEFORE_REFLECTION],
    ["1.1 as released (version 2)", BACKUP_FROM_1_1],
  ])("from %s upgrade with no study data, no preferences, and nothing to report", (_name, text) => {
    const parsed = parsedOrThrow(text);
    expect(parsed).toMatchObject(NO_STUDY_DATA);
    expect(parsed.skipped).toEqual([]);
    expect(parsed.investigations).toHaveLength(1);
  });

  it("from the released 1.1 import with every field intact", () => {
    expect(parsedOrThrow(BACKUP_FROM_1_1).investigations).toEqual([RECORD_FROM_1_1_AS_READ]);
  });

  it("never bring study data or preferences, even under those keys", () => {
    const parsed = parsedOrThrow(
      file({ format: BACKUP_FORMAT, version: 2, investigations: [], study: STUDY_FROM_2_0, preferences: PREFERENCES_FROM_2_0 }),
    );
    expect(parsed).toMatchObject(NO_STUDY_DATA);
  });
});

describe("study records in a backup", () => {
  it("are skipped when invalid, saying which list, where, which record, and why", () => {
    const parsed = parsedOrThrow(
      v3({
        study: {
          progress: [PROGRESS_FROM_2_0, { ...PROGRESS_FROM_2_0, id: "bad-progress", difficulty: "impossible" }],
          discoveries: ["not a card", { ...CARD_FROM_2_0, id: "untitled", title: "" }, CARD_FROM_2_0],
          personalConnections: [{ ...CONNECTION_FROM_2_0, to: CONNECTION_FROM_2_0.from }],
          explorations: [
            { ...EXPLORATIONS_FROM_2_0[0], highlights: [{ ...EXPLORATIONS_FROM_2_0[0].highlights[0], start: 6, end: 6 }] },
            EXPLORATIONS_FROM_2_0[1],
          ],
        },
      }),
    );
    expect(parsed.study).toEqual(
      study({ personalConnections: [], explorations: [EXPLORATIONS_FROM_2_0[1]] as unknown as StudyData["explorations"] }),
    );
    expect(parsed.studySkipped).toEqual([
      { kind: "progress", index: 1, id: "bad-progress", title: undefined, reason: expect.stringContaining("difficulty") },
      { kind: "discoveries", index: 0, id: undefined, title: undefined, reason: expect.any(String) },
      { kind: "discoveries", index: 1, id: "untitled", title: undefined, reason: expect.stringContaining("title") },
      {
        kind: "personalConnections",
        index: 0,
        id: CONNECTION_FROM_2_0.id,
        title: "Atonement → Atonement",
        reason: "A connection must join two different nodes",
      },
      {
        kind: "explorations",
        index: 0,
        id: "passage:alma-7-11-13",
        title: undefined,
        reason: "highlights.0: A highlight must cover at least one word",
      },
    ]);
    expect(parsed.skipped).toEqual([]);
  });

  it("names Discovery Cards by title", () => {
    const parsed = parsedOrThrow(v3({ study: { discoveries: [{ ...CARD_FROM_2_0, sources: "none" }] } }));
    expect(parsed.studySkipped).toEqual([
      expect.objectContaining({ kind: "discoveries", title: "He knows how to help", reason: expect.stringContaining("sources") }),
    ]);
  });

  it.each(STUDY_KINDS)("keep the first of two %s records with the same id", (kind) => {
    const [first] = study()[kind];
    const second = { ...first, updatedAt: "2026-10-26T00:00:00.000Z" };
    const parsed = parsedOrThrow(v3({ study: { ...study(), [kind]: [first, second] } }));
    expect(parsed.study[kind]).toEqual([first]);
    expect(parsed.studySkipped).toEqual([
      expect.objectContaining({ kind, index: 1, id: first.id, reason: expect.stringContaining("Duplicate id") }),
    ]);
  });

  it.each(STUDY_KINDS)("skip %s records saved by a newer version, even ones this version can't validate", (kind) => {
    const [record] = study()[kind];
    const newerButValid = { ...record, dataVersion: 99 };
    const newerAndUnknownShape = { id: "from-the-future", dataVersion: 99, somethingNew: true };
    const parsed = parsedOrThrow(v3({ study: { ...study(), [kind]: [newerButValid, newerAndUnknownShape] } }));
    expect(parsed.study[kind]).toEqual([]);
    expect(parsed.studySkipped.map((entry) => [entry.kind, entry.id, entry.reason])).toEqual([
      [kind, record.id, expect.stringContaining("newer version")],
      [kind, "from-the-future", expect.stringContaining("newer version")],
    ]);
  });

  it("are treated as empty when a version 3 file has no study section, and the preview says so", () => {
    const parsed = parsedOrThrow(envelope([richInvestigation("a")]));
    expect(parsed.study).toEqual(emptyStudyData());
    expect(parsed.notes).toEqual([expect.stringContaining("no study data")]);
    expect(parsed.investigations).toHaveLength(1);
  });

  it("are not imported from a damaged study section, which is reported", () => {
    const parsed = parsedOrThrow(v3({ study: "junk" }));
    expect(parsed.study).toEqual(emptyStudyData());
    expect(parsed.notes).toEqual([expect.stringContaining("study data is damaged")]);
  });

  it("are read from the undamaged lists when one list is damaged", () => {
    const parsed = parsedOrThrow(v3({ study: { ...study(), discoveries: { not: "a list" } } }));
    expect(parsed.study).toEqual(study({ discoveries: [] }));
    expect(parsed.notes).toEqual([
      expect.stringContaining("list of Discovery Cards is damaged"),
      // The progress links to the card that couldn't be read.
      expect.stringContaining(`links to Discovery Card “${CARD_FROM_2_0.id}”`),
    ]);
  });

  it("may link progress to a card the file doesn't contain: imported unchanged, with a note", () => {
    const parsed = parsedOrThrow(v3({ study: { ...study(), discoveries: [] } }));
    expect(parsed.study.progress).toEqual([PROGRESS_FROM_2_0]);
    expect(parsed.study.progress[0].discoveryId).toBe(CARD_FROM_2_0.id);
    expect(parsed.notes).toEqual([
      `Progress in “${PROGRESS_FROM_2_0.id}” links to Discovery Card “${CARD_FROM_2_0.id}”, which isn't in this file. ` +
        "The progress is imported unchanged; the link works only if that card is already on this device.",
    ]);
  });
});

describe("preferences in a backup", () => {
  it("keep valid fields and leave out invalid ones with a note", () => {
    const parsed = parsedOrThrow(
      v3({ preferences: { theme: "neon", motion: "off", studyLength: 5, difficulty: "complex", activity: "all" } }),
    );
    expect(parsed.preferences).toEqual({ motion: "off", difficulty: "complex" });
    expect(parsed.notes).toEqual([
      "Some preferences in the file aren't valid and won't be restored: theme, study length, activity options.",
    ]);
  });

  it("keep valid activity options when some are invalid", () => {
    const parsed = parsedOrThrow(v3({ preferences: { activity: { offerBranches: false, showReflections: "yes" } } }));
    expect(parsed.preferences).toEqual({ activity: { offerBranches: false } });
    expect(parsed.notes).toEqual([expect.stringContaining("activity options")]);
  });

  it("ignore fields this version doesn't know, and the Map's last visit", () => {
    const parsed = parsedOrThrow(
      v3({ preferences: { theme: "evening", fontSize: "large", lastMapVisit: "2026-10-25T00:00:00.000Z" } }),
    );
    expect(parsed.preferences).toEqual({ theme: "evening" });
    expect(parsed.notes).toEqual([]);
  });

  it("are ignored with a note when the section is damaged", () => {
    const parsed = parsedOrThrow(v3({ preferences: ["dark"] }));
    expect(parsed.preferences).toEqual({});
    expect(parsed.notes).toEqual([expect.stringContaining("preferences are damaged")]);
    expect(parsed.study).toEqual(study());
  });

  it("may be missing", () => {
    const parsed = parsedOrThrow(v3({ preferences: undefined }));
    expect(parsed.preferences).toEqual({});
    expect(parsed.notes).toEqual([]);
  });
});

describe("planRecords", () => {
  const T = (day: number) => `2026-10-${String(day).padStart(2, "0")}T00:00:00.000Z`;
  const record = (id: string, day: number, note = "") => ({ id, updatedAt: T(day), note, dataVersion: 1 });
  const stored = (value: object, { readable = true } = {}) => describeStored(value, readable, 1);

  it("merge adds records that aren't stored", () => {
    expect(planRecords([stored(record("a", 1))], [record("b", 1)], "merge")).toEqual({
      toWrite: [record("b", 1)],
      added: 1,
      updated: 0,
      kept: 0,
      removed: 0,
    });
  });

  it("merge keeps the most recently updated copy; ties and identical copies keep the stored one", () => {
    const plan = planRecords(
      [stored(record("older", 1)), stored(record("newer", 9)), stored(record("tie", 5)), stored(record("same", 5, "x"))],
      [record("older", 2, "edited"), record("newer", 8, "stale"), record("tie", 5, "different"), record("same", 6, "x")],
      "merge",
    );
    // "same" is newer by time but identical apart from that: it still counts as an update.
    expect(plan.toWrite.map((entry) => entry.id)).toEqual(["older", "same"]);
    expect(plan).toMatchObject({ added: 0, updated: 2, kept: 2 });
  });

  it("merge never replaces a stored record saved by a newer version, readable or not", () => {
    const plan = planRecords(
      [stored({ ...record("readable", 1), dataVersion: 2 }), stored({ id: "unreadable", dataVersion: 2 }, { readable: false })],
      [record("readable", 9, "edited"), record("unreadable", 9)],
      "merge",
    );
    expect(plan).toEqual({ toWrite: [], added: 0, updated: 0, kept: 2, removed: 0 });
  });

  it("merge replaces a damaged stored record with the backup's valid copy, as an update", () => {
    const plan = planRecords([stored({ id: "damaged" }, { readable: false })], [record("damaged", 1)], "merge");
    expect(plan).toEqual({ toWrite: [record("damaged", 1)], added: 0, updated: 1, kept: 0, removed: 0 });
  });

  it("replace counts every stored record as removed, readable or not", () => {
    const plan = planRecords(
      [stored(record("a", 1)), stored({ id: "damaged" }, { readable: false })],
      [record("b", 1), record("b", 2)],
      "replace",
    );
    expect(plan).toEqual({ toWrite: [record("b", 1)], added: 1, updated: 0, kept: 0, removed: 2 });
  });

  it("is what planImport uses for investigations", () => {
    const local = richInvestigation("x", { updatedAt: "2026-05-01T00:00:00.000Z" });
    expect(planImport([{ ...local, dataVersion: 3 }], [{ ...local, updatedAt: "2026-06-01T00:00:00.000Z" }], "merge")).toMatchObject({
      mode: "merge",
      kept: 1,
    });
  });
});

describe("describing counts", () => {
  it("uses singular and plural forms", () => {
    expect(countOf("discoveries", 1)).toBe("1 Discovery Card");
    expect(countOf("investigations", 2)).toBe("2 research investigations");
  });

  it("lists only the kinds that have records", () => {
    expect(describeCounts(zeroCounts())).toBe("nothing");
    expect(describeCounts({ ...zeroCounts(), explorations: 3 })).toBe("3 explorations");
    expect(describeCounts({ ...zeroCounts(), investigations: 2, discoveries: 1 })).toBe(
      "2 research investigations and 1 Discovery Card",
    );
    expect(describeCounts({ ...zeroCounts(), investigations: 1, progress: 2, personalConnections: 1 })).toBe(
      "1 research investigation, 2 guided investigations, and 1 Map connection",
    );
  });
});
