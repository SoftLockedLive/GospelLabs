/**
 * All reads and writes of investigation data. Records are validated on the
 * way in and on the way out, every failure surfaces as a StorageError, and
 * multi-record operations run inside a single transaction so they either
 * fully apply or leave the database untouched.
 *
 * Whole-backup operations (export, import, and deleting everything, across
 * the investigations and the study tables, the journal included) are also
 * offered here, so that in the browser they run after unsaved-edit recovery
 * like every other investigation operation (see client.ts): an export always
 * includes edits a closing page left in a safety copy. Their logic is in
 * full-backup.ts.
 */
import {
  investigationSchema,
  isFromNewerVersion,
  RECORD_DATA_VERSION,
  type Investigation,
} from "@/domain/investigation";
import type { StoredStamp } from "./autosave";
import { planImport, sameContent, type BackupPreferences, type ImportMode, type ImportPlan } from "./backup";
import type { GospelLabsDatabase } from "./db";
import {
  countEverything,
  deleteEverything,
  exportEverything,
  importBackup,
  previewBackupImport,
  type BackupContents,
} from "./full-backup";
import { StorageError, toStorageError } from "./storage-errors";

export interface InvestigationList {
  /** Valid investigations, most recently edited first. */
  investigations: Investigation[];
  /** Stored records that failed validation. They are left in place, not deleted. */
  unreadable: number;
}

export type LoadResult =
  | { status: "found"; investigation: Investigation }
  | { status: "missing" }
  | { status: "unreadable" }
  /** Saved by a newer version of the app; this version mustn't edit it. */
  | { status: "newer" };

/**
 * Why a save was refused:
 * - "modified": another tab saved a newer version since this one was loaded
 * - "deleted": the investigation was deleted (or replaced by an import) elsewhere
 * - "exists": a new investigation's id is already in use
 * - "newer-version": a newer version of the app saved it, and this version
 *   could damage data it doesn't know about
 */
export type SaveConflict = "modified" | "deleted" | "exists" | "newer-version";
export type SaveResult = { ok: true } | { ok: false; conflict: SaveConflict };

/** What an investigations-only import did (the 1.1 API). Whole backups report a BackupImportSummary. */
export type ImportSummary = Omit<ImportPlan, "toWrite">;

const summarize = (plan: ImportPlan): ImportSummary => ({
  mode: plan.mode,
  added: plan.added,
  updated: plan.updated,
  kept: plan.kept,
  removed: plan.removed,
});

/** Validates a record and stamps it with the format this version writes. */
function validate(investigation: unknown): Investigation {
  const result = investigationSchema.safeParse(investigation);
  if (!result.success) throw new StorageError("invalid-data", { cause: result.error });
  return { ...result.data, dataVersion: RECORD_DATA_VERSION };
}

const byMostRecent = (a: Investigation, b: Investigation) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt);

async function guard<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw toStorageError(error);
  }
}

export function createInvestigationRepository(db: GospelLabsDatabase) {
  const table = db.investigations;

  /**
   * Every valid stored record. `asStored` returns them exactly as stored
   * rather than as this version reads them, so an export can't drop fields
   * added by a newer version.
   */
  async function readAll({ asStored = false } = {}): Promise<InvestigationList> {
    const records: unknown[] = await table.toArray();
    const investigations: Investigation[] = [];
    let unreadable = 0;
    for (const record of records) {
      const result = investigationSchema.safeParse(record);
      if (result.success) investigations.push(asStored ? (record as Investigation) : result.data);
      else unreadable++;
    }
    return { investigations: investigations.sort(byMostRecent), unreadable };
  }

  return {
    list: () => guard(() => readAll()),

    get: (id: string) =>
      guard(async (): Promise<LoadResult> => {
        const record: unknown = await table.get(id);
        if (record === undefined) return { status: "missing" };
        const result = investigationSchema.safeParse(record);
        if (!result.success) return { status: "unreadable" };
        return isFromNewerVersion(result.data) ? { status: "newer" } : { status: "found", investigation: result.data };
      }),

    /**
     * The stored copy's edit time and format, read without validation. Cheap
     * enough to watch: an open editor uses it to notice changes from elsewhere.
     */
    stamp: (id: string) =>
      guard(async (): Promise<StoredStamp | null> => {
        const record = (await table.get(id)) as { updatedAt?: unknown; dataVersion?: unknown } | undefined;
        if (!record) return null;
        return {
          updatedAt: String(record.updatedAt),
          dataVersion: typeof record.dataVersion === "number" ? record.dataVersion : undefined,
        };
      }),

    count: () => guard(() => table.count()),

    /**
     * Saves only if the stored copy is still the one this editor last saw.
     * `expectedUpdatedAt` is that copy's updatedAt, or null for a new investigation.
     */
    save: (investigation: Investigation, expectedUpdatedAt: string | null) =>
      guard(async (): Promise<SaveResult> => {
        const record = validate(investigation);
        return db.transaction("rw", table, async (): Promise<SaveResult> => {
          const stored = await table.get(record.id);
          if (stored && isFromNewerVersion(stored)) return { ok: false, conflict: "newer-version" };
          // Saving exactly what's already stored (e.g. edits a recovered safety copy wrote first) is never a conflict.
          if (stored && sameContent(stored, record)) return { ok: true };
          if (expectedUpdatedAt === null && stored) return { ok: false, conflict: "exists" };
          if (expectedUpdatedAt !== null && !stored) return { ok: false, conflict: "deleted" };
          if (stored && stored.updatedAt !== expectedUpdatedAt) return { ok: false, conflict: "modified" };
          await table.put(record);
          return { ok: true };
        });
      }),

    /** Saves unconditionally. Used when the user chooses to keep their version after a conflict. */
    overwrite: (investigation: Investigation) =>
      guard(async () => {
        const record = validate(investigation);
        await db.transaction("rw", table, async () => {
          const stored = await table.get(record.id);
          // Even an explicit "keep my version" mustn't damage data from a newer version.
          if (stored && isFromNewerVersion(stored)) throw new StorageError("version");
          await table.put(record);
        });
      }),

    delete: (id: string) => guard(() => table.delete(id)),

    /**
     * Deletes every investigation, returning how many were removed. Study
     * data is untouched; Settings › Delete all data uses deleteEverything.
     */
    deleteAll: () =>
      guard(() =>
        db.transaction("rw", table, async () => {
          const count = await table.count();
          await table.clear();
          return count;
        }),
      ),

    /**
     * A backup (format version 4) of everything stored: investigations and
     * study data, each record exactly as stored, plus the given preferences
     * (read from localStorage by the caller). `unreadable` counts damaged
     * records that couldn't be included.
     */
    exportBackup: (exportedAt: string, { preferences }: { preferences?: BackupPreferences } = {}) =>
      guard(() => exportEverything(db, exportedAt, preferences)),

    /** What importing a whole backup would do right now, per kind, without changing anything. */
    previewBackup: (contents: BackupContents, mode: ImportMode) => guard(() => previewBackupImport(db, contents, mode)),

    /**
     * Imports a whole backup (investigations and study data) atomically in
     * one transaction across all six tables. See full-backup.ts.
     */
    importBackup: (contents: BackupContents, mode: ImportMode) => guard(() => importBackup(db, contents, mode)),

    /** Deletes all investigations and all study data in one transaction, returning what was removed per kind. */
    deleteEverything: () => guard(() => deleteEverything(db)),

    /** How many records of each kind are stored, readable or not. */
    countEverything: () => guard(() => countEverything(db)),

    /**
     * What an investigations-only import would do right now (the 1.1 API).
     * Settings imports whole backups with previewBackup and importBackup.
     */
    previewImport: (incoming: readonly Investigation[], mode: ImportMode) =>
      guard(async (): Promise<ImportSummary> => {
        return summarize(planImport((await readAll({ asStored: true })).investigations, incoming, mode));
      }),

    /**
     * Applies an investigations-only import atomically (the 1.1 API; study
     * data is untouched). The plan is recomputed inside the transaction, so
     * it reflects the data at the moment of import.
     */
    importInvestigations: (incoming: readonly Investigation[], mode: ImportMode) =>
      guard(() =>
        db.transaction("rw", table, async (): Promise<ImportSummary> => {
          const records = incoming.map(validate);
          const { investigations } = await readAll({ asStored: true });
          const plan = planImport(investigations, records, mode);
          if (mode === "replace") await table.clear();
          await table.bulkPut(plan.toWrite);
          return summarize(plan);
        }),
      ),
  };
}

export type InvestigationRepository = ReturnType<typeof createInvestigationRepository>;
