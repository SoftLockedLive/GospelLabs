/**
 * Backup file format and import planning. Everything here is pure; the
 * database side (reading, and applying plans inside one transaction) is in
 * full-backup.ts.
 *
 * Format (version 4):
 *   {
 *     "format": "gospel-labs-backup",
 *     "version": 4,
 *     "exportedAt": "2026-10-26T12:00:00.000Z",
 *     "investigations": [ …Investigation records (1.x research notebooks)… ],
 *     "study": {
 *       "progress": [ …StudyProgress… ],
 *       "discoveries": [ …DiscoveryCard… ],
 *       "personalConnections": [ …PersonalConnection… ],
 *       "explorations": [ …Exploration… ],
 *       "journal": [ …JournalEntry… ]
 *     },
 *     "preferences": { "theme": "dawn", "motion": "subtle", "studyLength": "quick",
 *                      "difficulty": "medium", "activity": { "offerBranches": true, … } }
 *   }
 *
 * Version history:
 *   1  Gospel Labs 1.0.
 *   2  Gospel Labs 1.1: investigations gain `evidenceConnections`,
 *      `discoveryHighlights`, `challengeResponses`, `trailProgress`, and
 *      `christReflection`. Bumped so that 1.0, which
 *      would silently drop the new fields, refuses these files and asks the
 *      user to update instead. (Pre-release 1.1 builds wrote version 2 without
 *      some of these fields; they default to empty, so those files import
 *      unchanged.)
 *   3  Gospel Labs 2.0: adds `study` (the four 2.0 study tables: guided
 *      investigation progress, Discovery Cards, personal Map connections, and
 *      explorations) and `preferences` (theme, motion, study length, default
 *      difficulty, activity options). Investigations are unchanged. Bumped so
 *      that 1.1 (which accepts up to version 2) refuses these files as "made
 *      by a newer version" instead of importing the investigations and
 *      silently leaving the study data out, which in Replace mode would look
 *      like a complete restore. Older files are upgraded with an empty `study`
 *      and no preferences.
 *   4  Gospel Labs 3.0: adds `study.journal` (journal entries in the
 *      Notebook). Nothing else changes. Bumped because 2.0–2.2 (which accept
 *      up to version 3) read only the four study lists they know: they would
 *      import the rest of the file and silently leave the journal out, which
 *      in Replace mode would look like a complete restore. They refuse these
 *      files as "made by a newer version" instead. Version 3 files are
 *      upgraded with an empty journal.
 *
 * Every record in a backup is written exactly as stored, so fields added by
 * a newer version survive a round trip through an older one.
 */
import { z } from "zod";
import { investigationSchema, RECORD_DATA_VERSION, type Investigation } from "@/domain/investigation";
import { journalEntrySchema, type JournalEntry } from "@/domain/study/journal";
import {
  discoveryCardSchema,
  explorationSchema,
  personalConnectionSchema,
  STUDY_DATA_VERSION,
  studyProgressSchema,
  type DiscoveryCard,
  type Exploration,
  type PersonalConnection,
  type StudyProgress,
} from "@/domain/study/user-data";
import { DIFFICULTIES, STUDY_LENGTHS, type Difficulty, type StudyLength } from "@/domain/study/vocabulary";
import { DEFAULT_PREFERENCES, MOTION_PREFERENCES, type MotionPreference, type Preferences } from "@/lib/preferences";
import { isThemePreference, type ThemePreference } from "@/lib/theme";

export const BACKUP_FORMAT = "gospel-labs-backup";
export const BACKUP_VERSION = 4;
/** Larger files are refused before parsing so the page doesn't freeze. */
export const MAX_BACKUP_BYTES = 50 * 1024 * 1024;

// --- Kinds of data -------------------------------------------------------------

/** The study tables, by their key in a backup's `study` section. */
export const STUDY_KINDS = ["progress", "discoveries", "personalConnections", "explorations", "journal"] as const;
export type StudyKind = (typeof STUDY_KINDS)[number];

/** Everything a backup holds records of, one entry per IndexedDB table. */
export const DATA_KINDS = ["investigations", ...STUDY_KINDS] as const;
export type DataKind = (typeof DATA_KINDS)[number];

export interface StudyData {
  progress: StudyProgress[];
  discoveries: DiscoveryCard[];
  personalConnections: PersonalConnection[];
  explorations: Exploration[];
  journal: JournalEntry[];
}

export const emptyStudyData = (): StudyData => ({
  progress: [],
  discoveries: [],
  personalConnections: [],
  explorations: [],
  journal: [],
});

/** Words for each kind in messages: "1 Discovery Card", "Discovery Cards: 2 new". */
export const DATA_KIND_LABELS: Record<DataKind, { one: string; many: string; heading: string }> = {
  investigations: { one: "research notebook", many: "research notebooks", heading: "Research notebooks" },
  progress: { one: "investigation", many: "investigations", heading: "Investigation progress" },
  discoveries: { one: "Discovery Card", many: "Discovery Cards", heading: "Discovery Cards" },
  personalConnections: { one: "Map connection", many: "Map connections", heading: "Your Map connections" },
  explorations: { one: "explored passage or attribute", many: "explored passages and attributes", heading: "Explored passages and attributes" },
  journal: { one: "journal entry", many: "journal entries", heading: "Journal" },
};

/** "1 Discovery Card", "3 explored passages and attributes". */
export function countOf(kind: DataKind, count: number): string {
  const label = DATA_KIND_LABELS[kind];
  return `${count} ${count === 1 ? label.one : label.many}`;
}

export type DataCounts = Record<DataKind, number>;

export const zeroCounts = (): DataCounts => ({
  investigations: 0,
  progress: 0,
  discoveries: 0,
  personalConnections: 0,
  explorations: 0,
  journal: 0,
});

export const totalCount = (counts: DataCounts): number => DATA_KINDS.reduce((sum, kind) => sum + counts[kind], 0);

/**
 * The kinds with any records, as a phrase: "2 research notebooks and 1
 * Discovery Card". Returns `none` when every count is zero.
 */
export function describeCounts(counts: DataCounts, none = "nothing"): string {
  const parts = DATA_KINDS.filter((kind) => counts[kind] > 0).map((kind) => countOf(kind, counts[kind]));
  if (parts.length === 0) return none;
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")}${parts.length > 2 ? "," : ""} and ${parts[parts.length - 1]}`;
}

/** How many records of each kind a backup (or parsed backup) holds. */
export function countContents(contents: { investigations: readonly unknown[]; study: StudyData }): DataCounts {
  return {
    investigations: contents.investigations.length,
    progress: contents.study.progress.length,
    discoveries: contents.study.discoveries.length,
    personalConnections: contents.study.personalConnections.length,
    explorations: contents.study.explorations.length,
    journal: contents.study.journal.length,
  };
}

/** How each kind is validated, and the record format this version writes for it. */
export const RECORD_RULES: Record<DataKind, { schema: z.ZodType; dataVersion: number }> = {
  investigations: { schema: investigationSchema, dataVersion: RECORD_DATA_VERSION },
  progress: { schema: studyProgressSchema, dataVersion: STUDY_DATA_VERSION },
  discoveries: { schema: discoveryCardSchema, dataVersion: STUDY_DATA_VERSION },
  personalConnections: { schema: personalConnectionSchema, dataVersion: STUDY_DATA_VERSION },
  explorations: { schema: explorationSchema, dataVersion: STUDY_DATA_VERSION },
  journal: { schema: journalEntrySchema, dataVersion: STUDY_DATA_VERSION },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * True when a record, read without validation, is stamped with a newer
 * record format than `current`. Checked before validation, because a newer
 * version's records may not pass this version's schema.
 */
export function isNewerStamp(record: unknown, current: number): boolean {
  if (!isRecord(record)) return false;
  return typeof record.dataVersion === "number" && record.dataVersion > current;
}

// --- Preferences -----------------------------------------------------------------

export type ActivityPreferences = Preferences["activity"];

/**
 * Appearance and study preferences in a backup. Every field is optional: a
 * backup carries only what was stored on the exporting device, and restoring
 * changes only the fields it carries. `lastMapVisit` is deliberately left
 * out: it records when the Map was last opened on that device, which isn't a
 * preference and would hide "new" markers on another device.
 */
export interface BackupPreferences {
  theme?: ThemePreference;
  motion?: MotionPreference;
  studyLength?: StudyLength;
  difficulty?: Difficulty;
  activity?: Partial<ActivityPreferences>;
}

const ACTIVITY_OPTIONS = Object.keys(DEFAULT_PREFERENCES.activity) as (keyof ActivityPreferences)[];

const PREFERENCE_CHECKS = {
  theme: isThemePreference,
  motion: (value: unknown) => MOTION_PREFERENCES.includes(value as MotionPreference),
  studyLength: (value: unknown) => STUDY_LENGTHS.includes(value as StudyLength),
  difficulty: (value: unknown) => DIFFICULTIES.includes(value as Difficulty),
} satisfies Record<Exclude<keyof BackupPreferences, "activity">, (value: unknown) => boolean>;

const PREFERENCE_NAMES: Record<keyof BackupPreferences, string> = {
  theme: "theme",
  motion: "motion",
  studyLength: "study length",
  difficulty: "difficulty",
  activity: "activity options",
};

/**
 * Keeps the preference fields that are present and valid. `invalid` names
 * the fields that were present but unusable. Unknown fields (from a newer
 * version, or `lastMapVisit`) are dropped without comment.
 */
export function sanitizePreferences(value: Record<string, unknown>): { preferences: BackupPreferences; invalid: string[] } {
  const preferences: Record<string, unknown> = {};
  const invalid: string[] = [];
  for (const [field, isValid] of Object.entries(PREFERENCE_CHECKS) as [keyof typeof PREFERENCE_CHECKS, (v: unknown) => boolean][]) {
    if (value[field] === undefined) continue;
    if (isValid(value[field])) preferences[field] = value[field];
    else invalid.push(PREFERENCE_NAMES[field]);
  }
  if (value.activity !== undefined) {
    const activity: Partial<ActivityPreferences> = {};
    let damaged = !isRecord(value.activity);
    if (isRecord(value.activity)) {
      for (const option of ACTIVITY_OPTIONS) {
        const setting = value.activity[option];
        if (typeof setting === "boolean") activity[option] = setting;
        else if (setting !== undefined) damaged = true;
      }
    }
    if (Object.keys(activity).length > 0) preferences.activity = activity;
    if (damaged) invalid.push(PREFERENCE_NAMES.activity);
  }
  return { preferences: preferences as BackupPreferences, invalid };
}

export const hasPreferences = (preferences: BackupPreferences): boolean => Object.keys(preferences).length > 0;

// --- Creating backups ------------------------------------------------------------

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  investigations: Investigation[];
  study: StudyData;
  preferences: BackupPreferences;
}

export function createBackup(
  investigations: readonly Investigation[],
  exportedAt: string,
  { study = emptyStudyData(), preferences = {} }: { study?: StudyData; preferences?: BackupPreferences } = {},
): Backup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt,
    investigations: [...investigations],
    study: {
      progress: [...study.progress],
      discoveries: [...study.discoveries],
      personalConnections: [...study.personalConnections],
      explorations: [...study.explorations],
      journal: [...study.journal],
    },
    preferences: { ...preferences },
  };
}

export function serializeBackup(backup: Backup): string {
  return `${JSON.stringify(backup, null, 2)}\n`;
}

/** Named for the day it was exported on the learner's own calendar (not UTC, which is often tomorrow by evening). */
export function backupFileName(exportedAt: string): string {
  const date = new Date(exportedAt);
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return `gospel-labs-backup-${day}.json`;
}

// --- Parsing ---------------------------------------------------------------------

export type BackupErrorKind =
  | "empty"
  | "too-large"
  | "not-json"
  | "not-a-backup"
  | "newer-version"
  | "unsupported-version"
  | "malformed";

export interface BackupError {
  kind: BackupErrorKind;
  message: string;
}

export interface SkippedEntry {
  /** Position in the backup's list (of investigations, or of the study kind). */
  index: number;
  id?: string;
  /** A title or label, where the record has one. */
  title?: string;
  reason: string;
}

/** A skipped study record. `kind` says which list it came from. */
export interface SkippedStudyEntry extends SkippedEntry {
  kind: StudyKind;
}

export interface ParsedBackup {
  version: number;
  exportedAt?: string;
  investigations: Investigation[];
  /** Investigations that were invalid, duplicated, or from a newer version, and will not be imported. */
  skipped: SkippedEntry[];
  /** Valid study records. Empty for version 1 and 2 files; no journal entries in version 3 files. */
  study: StudyData;
  /** Study records that will not be imported, and why. */
  studySkipped: SkippedStudyEntry[];
  /** Valid preferences in the file. Empty for version 1 and 2 files. */
  preferences: BackupPreferences;
  /**
   * Things the user should know that didn't stop the import: a damaged study
   * or preferences section, invalid preferences, or a progress record that
   * links to a Discovery Card the file doesn't contain.
   */
  notes: string[];
}

export type BackupParseResult = { ok: true; backup: ParsedBackup } | { ok: false; error: BackupError };

type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

/** Fields version 2 added to each investigation, as they start out. */
const addedInVersion2 = () => ({
  evidenceConnections: [],
  discoveryHighlights: [],
  challengeResponses: [],
  trailProgress: [],
  christReflection: {},
});

/**
 * Upgrades older backup versions to the current shape, one step at a time.
 * Key = the version being upgraded from. Migrations run before validation,
 * so they must tolerate malformed entries and leave them for validation to report.
 */
const MIGRATIONS: Record<number, Migration> = {
  // 1 → 2: investigations start with none of the 1.1 additions. Nothing else changes.
  1: (data) => ({
    ...data,
    version: 2,
    investigations: Array.isArray(data.investigations)
      ? data.investigations.map((entry: unknown) => (isRecord(entry) ? { ...addedInVersion2(), ...entry } : entry))
      : data.investigations,
  }),
  // 2 → 3: no study data and no preferences. Versions 1 and 2 never had
  // these sections, so anything under those keys isn't Gospel Labs data.
  2: (data) => {
    const { study: _study, preferences: _preferences, ...rest } = data;
    void _study;
    void _preferences;
    return { ...rest, version: 3, study: emptyStudyData() };
  },
  // 3 → 4: no journal entries. Version 3 never had a journal list, so anything under that key isn't
  // Gospel Labs data. A missing or damaged study section is left as it is, for parsing to report.
  3: (data) => {
    if (!isRecord(data.study)) return { ...data, version: 4 };
    const { journal: _journal, ...study } = data.study;
    void _journal;
    return { ...data, version: 4, study: { ...study, journal: [] } };
  },
};

const envelopeSchema = z.object({
  exportedAt: z.iso.datetime().optional().catch(undefined),
  investigations: z.array(z.unknown()),
});

const fail = (kind: BackupErrorKind, message: string): BackupParseResult => ({ ok: false, error: { kind, message } });

function describeIssue(issue: z.core.$ZodIssue): string {
  const path = issue.path.map(String).join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}

const NEWER_RECORD_REASON = "Saved by a newer version of Gospel Labs. Update the app, then import it.";

const text = (value: unknown) => (typeof value === "string" && value ? value : undefined);

/** The first words of a journal entry, so the learner can tell which one it is. */
function opening(value: unknown): string | undefined {
  const line = text(value)?.trim().split("\n")[0].trim();
  if (!line) return undefined;
  return line.length > 40 ? `${line.slice(0, 40).trimEnd()}…` : line;
}

/** How a record is named in the list of skipped entries. */
const TITLES: Record<DataKind, (raw: Record<string, unknown>) => string | undefined> = {
  investigations: (raw) => text(raw.title),
  progress: () => undefined, // the id is the investigation's content id, which names it
  discoveries: (raw) => text(raw.title),
  personalConnections: (raw) => {
    const from = isRecord(raw.from) ? text(raw.from.label) : undefined;
    const to = isRecord(raw.to) ? text(raw.to.label) : undefined;
    return from && to ? `${from} → ${to}` : undefined;
  },
  explorations: () => undefined, // the id ("passage:alma-7") names it
  journal: (raw) => opening(raw.text),
};

/**
 * Validates each entry of one list. Entries from a newer version, invalid
 * entries, and later copies of an id already used (first wins) are skipped
 * with a reason; nothing is repaired.
 */
function validateEntries<T extends { id: string }>(kind: DataKind, entries: readonly unknown[]): { records: T[]; skipped: SkippedEntry[] } {
  const { schema, dataVersion } = RECORD_RULES[kind];
  const records: T[] = [];
  const skipped: SkippedEntry[] = [];
  const seen = new Map<string, number>();

  entries.forEach((entry, index) => {
    const raw = isRecord(entry) ? entry : {};
    const id = typeof raw.id === "string" ? raw.id : undefined;
    const title = TITLES[kind](raw);
    if (isNewerStamp(entry, dataVersion)) {
      skipped.push({ index, id, title, reason: NEWER_RECORD_REASON });
      return;
    }
    const result = schema.safeParse(entry);
    if (!result.success) {
      skipped.push({ index, id, title, reason: describeIssue(result.error.issues[0]) });
      return;
    }
    const record = result.data as T;
    const firstIndex = seen.get(record.id);
    if (firstIndex !== undefined) {
      skipped.push({ index, id, title, reason: `Duplicate id; the copy at position ${firstIndex + 1} is used` });
      return;
    }
    seen.set(record.id, index);
    records.push(record);
  });
  return { records, skipped };
}

function parseStudySection(section: unknown, notes: string[]): { study: StudyData; skipped: SkippedStudyEntry[] } {
  const study = emptyStudyData();
  const skipped: SkippedStudyEntry[] = [];
  if (section === undefined) {
    notes.push("This file has no investigation progress, Discovery Cards, or Map connections to import.");
    return { study, skipped };
  }
  if (!isRecord(section)) {
    notes.push("The part of the file with investigation progress, Discovery Cards, and Map connections is damaged and can't be read, so none of it will be imported.");
    return { study, skipped };
  }
  for (const kind of STUDY_KINDS) {
    const list = section[kind];
    if (list === undefined) continue;
    if (!Array.isArray(list)) {
      notes.push(`The file's list of ${DATA_KIND_LABELS[kind].many} is damaged and can't be read, so none will be imported.`);
      continue;
    }
    const result = validateEntries<StudyData[typeof kind][number]>(kind, list);
    (study as Record<StudyKind, unknown[]>)[kind] = result.records;
    skipped.push(...result.skipped.map((entry) => ({ kind, ...entry })));
  }

  // A progress record may link to a card the file doesn't hold (the card was
  // damaged and skipped, or the file was edited). The link is kept as it is,
  // never repaired, and the user is told.
  const cardIds = new Set(study.discoveries.map((card) => card.id));
  for (const record of study.progress) {
    if (record.discoveryId && !cardIds.has(record.discoveryId)) {
      notes.push(
        `Progress in “${record.id}” links to Discovery Card “${record.discoveryId}”, which isn't in this file. ` +
          "The progress is imported unchanged; the link works only if that card is already on this device.",
      );
    }
  }
  return { study, skipped };
}

function parsePreferencesSection(section: unknown, notes: string[]): BackupPreferences {
  if (section === undefined) return {};
  if (!isRecord(section)) {
    notes.push("The file's appearance and study preferences are damaged, so they can't be restored.");
    return {};
  }
  const { preferences, invalid } = sanitizePreferences(section);
  if (invalid.length > 0) {
    notes.push(`Some preferences in the file aren't valid and won't be restored: ${invalid.join(", ")}.`);
  }
  return preferences;
}

export function parseBackup(text: string): BackupParseResult {
  if (text.trim() === "") return fail("empty", "The file is empty.");
  if (new Blob([text]).size > MAX_BACKUP_BYTES) {
    return fail("too-large", "The file is too large to be a Gospel Labs backup.");
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return fail("not-json", "The file isn't valid JSON. It may be damaged or incomplete.");
  }

  if (!data || typeof data !== "object" || (data as { format?: unknown }).format !== BACKUP_FORMAT) {
    return fail("not-a-backup", "This file isn't a Gospel Labs backup.");
  }

  let record = data as Record<string, unknown>;
  const version = record.version;
  if (typeof version !== "number" || !Number.isInteger(version)) {
    return fail("malformed", "The backup is missing its version number.");
  }
  if (version > BACKUP_VERSION) {
    return fail(
      "newer-version",
      `This backup was made by a newer version of Gospel Labs (format ${version}). Update the app, then import it again.`,
    );
  }
  if (version < 1) return fail("unsupported-version", `Backup format ${version} isn't supported.`);
  for (let from = version; from < BACKUP_VERSION; from++) {
    const migrate = MIGRATIONS[from];
    if (!migrate) return fail("unsupported-version", `Backup format ${version} can't be upgraded.`);
    record = migrate(record);
  }

  const envelope = envelopeSchema.safeParse(record);
  if (!envelope.success) return fail("malformed", "The backup doesn't contain a list of research notebooks.");

  const notes: string[] = [];
  const { records: investigations, skipped } = validateEntries<Investigation>("investigations", envelope.data.investigations);
  const { study, skipped: studySkipped } = parseStudySection(record.study, notes);
  const preferences = parsePreferencesSection(record.preferences, notes);

  return {
    ok: true,
    backup: { version, exportedAt: envelope.data.exportedAt, investigations, skipped, study, studySkipped, preferences, notes },
  };
}

// --- Planning imports ------------------------------------------------------------

export type ImportMode = "merge" | "replace";

/**
 * A stored record as an import sees it, read without trusting it.
 * `readable`: passes this version's schema. `newer`: stamped with a newer
 * record format than this version writes (whether or not it's readable).
 */
export interface StoredRecord {
  id: string;
  updatedAt?: string;
  readable: boolean;
  newer: boolean;
  /** The record exactly as stored. */
  record: unknown;
}

/** Describes a raw stored record for planning. */
export function describeStored(record: unknown, readable: boolean, currentDataVersion: number): StoredRecord {
  const raw = isRecord(record) ? record : {};
  return {
    id: String(raw.id),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
    readable,
    newer: isNewerStamp(record, currentDataVersion),
    record,
  };
}

export interface RecordPlan<T> {
  /** Records to write. */
  toWrite: T[];
  /** New records not currently stored. */
  added: number;
  /** Stored records replaced by a more recently edited copy (or replacing a damaged copy). */
  updated: number;
  /** Merge: backup copies ignored because the stored copy is the same, newer, or from a newer version. */
  kept: number;
  /** Replace: stored records that will be deleted first (every stored record, readable or not). */
  removed: number;
}

/** JSON with sorted keys, so equal records compare equal regardless of key order. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, inner: unknown) =>
    inner && typeof inner === "object" && !Array.isArray(inner)
      ? Object.fromEntries(Object.entries(inner).sort(([a], [b]) => a.localeCompare(b)))
      : inner,
  );
}

/** Same investigation content, ignoring key order and the format stamp that saving adds. */
export function sameContent(a: unknown, b: unknown): boolean {
  const unstamped = (value: unknown) => ({ ...(value as object), dataVersion: undefined });
  return stableStringify(unstamped(a)) === stableStringify(unstamped(b));
}

/**
 * The import rules, the same for every kind of record:
 *
 * Merge: add records that aren't stored. When an id exists on both sides,
 * keep the copy updated most recently; ties keep the stored copy. A stored
 * record saved by a newer version is never replaced. A stored record this
 * version can't read (damaged) is replaced by the backup's valid copy and
 * counted as updated. Nothing is deleted.
 *
 * Replace: delete every stored record, then write the backup's records.
 *
 * Within `incoming`, the first record with an id wins (parseBackup has
 * already reported any duplicates).
 */
export function planRecords<T extends { id: string; updatedAt: string }>(
  stored: readonly StoredRecord[],
  incoming: readonly T[],
  mode: ImportMode,
): RecordPlan<T> {
  const candidates: T[] = [];
  const seen = new Set<string>();
  for (const record of incoming) {
    if (seen.has(record.id)) continue;
    seen.add(record.id);
    candidates.push(record);
  }

  if (mode === "replace") {
    return { toWrite: candidates, added: candidates.length, updated: 0, kept: 0, removed: stored.length };
  }

  const byId = new Map(stored.map((entry) => [entry.id, entry]));
  const plan: RecordPlan<T> = { toWrite: [], added: 0, updated: 0, kept: 0, removed: 0 };
  for (const candidate of candidates) {
    const current = byId.get(candidate.id);
    if (!current) {
      plan.toWrite.push(candidate);
      plan.added++;
    } else if (current.newer) {
      // Never replace data saved by a newer version of the app.
      plan.kept++;
    } else if (!current.readable) {
      plan.toWrite.push(candidate);
      plan.updated++;
    } else if (
      Date.parse(candidate.updatedAt) > Date.parse(current.updatedAt ?? "") &&
      stableStringify(candidate) !== stableStringify(current.record)
    ) {
      plan.toWrite.push(candidate);
      plan.updated++;
    } else {
      plan.kept++;
    }
  }
  return plan;
}

/** An import plan for investigations alone (the 1.1 API; see planRecords). */
export interface ImportPlan extends RecordPlan<Investigation> {
  mode: ImportMode;
}

/**
 * Plans an investigations-only import against valid stored investigations.
 * Merge keeps the copy edited most recently (ties keep the stored copy) and
 * never replaces a record saved by a newer version; replace deletes
 * everything stored, then writes the backup's investigations.
 */
export function planImport(
  existing: readonly Investigation[],
  incoming: readonly Investigation[],
  mode: ImportMode,
): ImportPlan {
  const stored = existing.map((record) => describeStored(record, true, RECORD_DATA_VERSION));
  return { mode, ...planRecords(stored, incoming, mode) };
}
