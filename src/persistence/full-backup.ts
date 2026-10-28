/**
 * Whole-backup operations across every IndexedDB table: the 1.x
 * investigations, the four 2.0 study tables, and the journal. The file
 * format and the import rules are in backup.ts; this module reads the
 * database and applies plans.
 *
 * Guarantees:
 * - **Exports** contain every record exactly as stored, so fields this
 *   version doesn't know are kept. Damaged records (ones this version can't
 *   read and that weren't saved by a newer version) are left out and counted.
 *   Records saved by a newer version are exported as stored even if this
 *   version can't read them, so exporting from an older tab never loses them.
 * - **Imports** are atomic: one read-write transaction across all six
 *   tables. Every incoming record is validated before anything is written,
 *   the plan is recomputed inside the transaction (so it reflects the data at
 *   that moment), and if anything fails (an invalid record, a full disk) the
 *   transaction rolls back and nothing changes.
 * - **Previews** run the same planning as the import, so they report exactly
 *   what the import would do against the data stored right now.
 * - **Delete everything** clears all six tables in one transaction.
 *
 * Callers wrap these in the repository's error guard (see
 * investigation-repository.ts), which also makes them wait for unsaved-edit
 * recovery in the browser (see client.ts).
 */
import type { Table } from "dexie";
import {
  createBackup,
  DATA_KINDS,
  describeStored,
  isNewerStamp,
  planRecords,
  RECORD_RULES,
  zeroCounts,
  type Backup,
  type BackupPreferences,
  type DataCounts,
  type DataKind,
  type ImportMode,
  type RecordPlan,
  type StoredRecord,
  type StudyData,
} from "./backup";
import type { GospelLabsDatabase } from "./db";
import { StorageError } from "./storage-errors";

type AnyTable = Table<unknown, string>;
type Stamped = { id: string; updatedAt: string; dataVersion?: number };

const TABLE_NAMES = {
  investigations: "investigations",
  progress: "studyProgress",
  discoveries: "discoveries",
  personalConnections: "personalConnections",
  explorations: "explorations",
  journal: "journal",
} as const satisfies Record<DataKind, string>;

const tableFor = (db: GospelLabsDatabase, kind: DataKind) => db[TABLE_NAMES[kind]] as unknown as AnyTable;
const allTables = (db: GospelLabsDatabase) => DATA_KINDS.map((kind) => tableFor(db, kind));

async function readStored(db: GospelLabsDatabase, kind: DataKind): Promise<StoredRecord[]> {
  const { schema, dataVersion } = RECORD_RULES[kind];
  const records: unknown[] = await tableFor(db, kind).toArray();
  return records.map((record) => describeStored(record, schema.safeParse(record).success, dataVersion));
}

const time = (entry: StoredRecord) => {
  const parsed = Date.parse(entry.updatedAt ?? "");
  return Number.isNaN(parsed) ? -Infinity : parsed;
};

/** Most recently updated first; records without a readable time last, in stored order. */
function byMostRecent(a: StoredRecord, b: StoredRecord): number {
  const difference = time(b) - time(a);
  return Number.isNaN(difference) ? 0 : difference;
}

export interface ExportResult {
  backup: Backup;
  /** Records written to the backup, by kind. */
  counts: DataCounts;
  /** Damaged stored records that couldn't be included. */
  unreadable: number;
  unreadableByKind: DataCounts;
}

/** A backup of everything stored, read in one transaction so it is a consistent snapshot. */
export function exportEverything(
  db: GospelLabsDatabase,
  exportedAt: string,
  preferences: BackupPreferences = {},
): Promise<ExportResult> {
  return db.transaction("r", allTables(db), async () => {
    const exported = {} as Record<DataKind, unknown[]>;
    const counts = zeroCounts();
    const unreadableByKind = zeroCounts();
    for (const kind of DATA_KINDS) {
      const stored = await readStored(db, kind);
      const kept = stored.filter((entry) => entry.readable || entry.newer).sort(byMostRecent);
      exported[kind] = kept.map((entry) => entry.record);
      counts[kind] = kept.length;
      unreadableByKind[kind] = stored.length - kept.length;
    }
    const { investigations, ...study } = exported;
    const backup = createBackup(investigations as Backup["investigations"], exportedAt, {
      study: study as unknown as StudyData,
      preferences,
    });
    const unreadable = DATA_KINDS.reduce((sum, kind) => sum + unreadableByKind[kind], 0);
    return { backup, counts, unreadable, unreadableByKind };
  });
}

/** The records an import writes: a parsed backup, or any subset of it. */
export interface BackupContents {
  investigations: readonly unknown[];
  study?: Partial<{ [K in keyof StudyData]: readonly unknown[] }>;
}

export interface KindSummary {
  added: number;
  updated: number;
  kept: number;
  removed: number;
}

export interface BackupImportSummary {
  mode: ImportMode;
  /** What happens to each kind of record. */
  kinds: Record<DataKind, KindSummary>;
  /** All kinds together. */
  total: KindSummary;
}

/** One figure from a summary, per kind: e.g. how many of each kind a replace would remove. */
export function summaryCounts(summary: BackupImportSummary, field: keyof KindSummary): DataCounts {
  const counts = zeroCounts();
  for (const kind of DATA_KINDS) counts[kind] = summary.kinds[kind][field];
  return counts;
}

const NEWER_IN_BACKUP =
  "This backup contains data saved by a newer version of Gospel Labs. Update the app, then import it again.";

/**
 * Validates an incoming record and stamps it with the record format this
 * version writes, as saving would. A record stamped by a newer version is
 * refused: re-stamping it would let this version overwrite data it doesn't
 * understand. (parseBackup already skips such records; this guards callers
 * that don't use it.)
 */
function prepare(kind: DataKind, record: unknown): Stamped {
  const { schema, dataVersion } = RECORD_RULES[kind];
  if (isNewerStamp(record, dataVersion)) throw new StorageError("invalid-data", { message: NEWER_IN_BACKUP });
  const result = schema.safeParse(record);
  if (!result.success) throw new StorageError("invalid-data", { cause: result.error });
  return { ...(result.data as Stamped), dataVersion };
}

function prepareAll(contents: BackupContents): Record<DataKind, Stamped[]> {
  const prepared = {} as Record<DataKind, Stamped[]>;
  for (const kind of DATA_KINDS) {
    const records = kind === "investigations" ? contents.investigations : (contents.study?.[kind] ?? []);
    prepared[kind] = records.map((record) => prepare(kind, record));
  }
  return prepared;
}

async function planAll(db: GospelLabsDatabase, incoming: Record<DataKind, Stamped[]>, mode: ImportMode) {
  const plans = {} as Record<DataKind, RecordPlan<Stamped>>;
  for (const kind of DATA_KINDS) plans[kind] = planRecords(await readStored(db, kind), incoming[kind], mode);
  return plans;
}

function summarize(mode: ImportMode, plans: Record<DataKind, RecordPlan<Stamped>>): BackupImportSummary {
  const total: KindSummary = { added: 0, updated: 0, kept: 0, removed: 0 };
  const kinds = {} as Record<DataKind, KindSummary>;
  for (const kind of DATA_KINDS) {
    const { added, updated, kept, removed } = plans[kind];
    kinds[kind] = { added, updated, kept, removed };
    total.added += added;
    total.updated += updated;
    total.kept += kept;
    total.removed += removed;
  }
  return { mode, kinds, total };
}

/** What importing would do right now, without changing anything. */
export function previewBackupImport(
  db: GospelLabsDatabase,
  contents: BackupContents,
  mode: ImportMode,
): Promise<BackupImportSummary> {
  return (async () => {
    const incoming = prepareAll(contents);
    return db.transaction("r", allTables(db), async () => summarize(mode, await planAll(db, incoming, mode)));
  })();
}

/**
 * Imports a backup atomically. Merge adds and updates records (see
 * planRecords for the rules); replace deletes every record in all six
 * tables, then writes the backup's records. Preferences are not stored in
 * IndexedDB and are not touched here.
 */
export function importBackup(db: GospelLabsDatabase, contents: BackupContents, mode: ImportMode): Promise<BackupImportSummary> {
  return (async () => {
    const incoming = prepareAll(contents);
    return db.transaction("rw", allTables(db), async () => {
      const plans = await planAll(db, incoming, mode);
      if (mode === "replace") {
        for (const kind of DATA_KINDS) await tableFor(db, kind).clear();
      }
      for (const kind of DATA_KINDS) {
        if (plans[kind].toWrite.length > 0) await tableFor(db, kind).bulkPut(plans[kind].toWrite);
      }
      return summarize(mode, plans);
    });
  })();
}

/** Deletes every record in all six tables, returning how many of each kind were removed. */
export function deleteEverything(db: GospelLabsDatabase): Promise<DataCounts> {
  return db.transaction("rw", allTables(db), async () => {
    const removed = zeroCounts();
    for (const kind of DATA_KINDS) {
      const table = tableFor(db, kind);
      removed[kind] = await table.count();
      await table.clear();
    }
    return removed;
  });
}

/** Every stored record of each kind, readable or not: what deleting everything would remove. */
export function countEverything(db: GospelLabsDatabase): Promise<DataCounts> {
  return db.transaction("r", allTables(db), async () => {
    const counts = zeroCounts();
    for (const kind of DATA_KINDS) counts[kind] = await tableFor(db, kind).count();
    return counts;
  });
}
