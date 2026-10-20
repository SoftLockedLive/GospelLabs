/**
 * All reads and writes of investigation data. Records are validated on the
 * way in and on the way out, every failure surfaces as a StorageError, and
 * multi-record operations run inside a single transaction so they either
 * fully apply or leave the database untouched.
 */
import { investigationSchema, type Investigation } from "@/domain/investigation";
import { createBackup, planImport, type Backup, type ImportMode, type ImportPlan } from "./backup";
import type { GospelLabsDatabase } from "./db";
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
  | { status: "unreadable" };

/**
 * Why a save was refused:
 * - "modified": another tab saved a newer version since this one was loaded
 * - "deleted": the investigation was deleted (or replaced by an import) elsewhere
 * - "exists": a new investigation's id is already in use
 */
export type SaveConflict = "modified" | "deleted" | "exists";
export type SaveResult = { ok: true } | { ok: false; conflict: SaveConflict };

export type ImportSummary = Omit<ImportPlan, "toWrite">;

const summarize = (plan: ImportPlan): ImportSummary => ({
  mode: plan.mode,
  added: plan.added,
  updated: plan.updated,
  kept: plan.kept,
  removed: plan.removed,
});

function validate(investigation: unknown): Investigation {
  const result = investigationSchema.safeParse(investigation);
  if (!result.success) throw new StorageError("invalid-data", { cause: result.error });
  return result.data;
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

  async function readAll(): Promise<InvestigationList> {
    const records: unknown[] = await table.toArray();
    const investigations: Investigation[] = [];
    let unreadable = 0;
    for (const record of records) {
      const result = investigationSchema.safeParse(record);
      if (result.success) investigations.push(result.data);
      else unreadable++;
    }
    return { investigations: investigations.sort(byMostRecent), unreadable };
  }

  return {
    list: () => guard(readAll),

    get: (id: string) =>
      guard(async (): Promise<LoadResult> => {
        const record: unknown = await table.get(id);
        if (record === undefined) return { status: "missing" };
        const result = investigationSchema.safeParse(record);
        return result.success ? { status: "found", investigation: result.data } : { status: "unreadable" };
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
        await table.put(validate(investigation));
      }),

    delete: (id: string) => guard(() => table.delete(id)),

    /** Deletes every investigation, returning how many were removed. */
    deleteAll: () =>
      guard(() =>
        db.transaction("rw", table, async () => {
          const count = await table.count();
          await table.clear();
          return count;
        }),
      ),

    exportBackup: (exportedAt: string) =>
      guard(async (): Promise<{ backup: Backup; unreadable: number }> => {
        const { investigations, unreadable } = await db.transaction("r", table, readAll);
        return { backup: createBackup(investigations, exportedAt), unreadable };
      }),

    /** What an import would do right now, without changing anything. */
    previewImport: (incoming: readonly Investigation[], mode: ImportMode) =>
      guard(async (): Promise<ImportSummary> => {
        return summarize(planImport((await readAll()).investigations, incoming, mode));
      }),

    /**
     * Applies an import atomically. The plan is recomputed inside the
     * transaction, so it reflects the data at the moment of import.
     */
    importInvestigations: (incoming: readonly Investigation[], mode: ImportMode) =>
      guard(() =>
        db.transaction("rw", table, async (): Promise<ImportSummary> => {
          const records = incoming.map(validate);
          const { investigations } = await readAll();
          const plan = planImport(investigations, records, mode);
          if (mode === "replace") await table.clear();
          await table.bulkPut(plan.toWrite);
          return summarize(plan);
        }),
      ),
  };
}

export type InvestigationRepository = ReturnType<typeof createInvestigationRepository>;
