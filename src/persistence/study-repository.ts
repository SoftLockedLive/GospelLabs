/**
 * Reads and writes of Gospel Labs 2.0 study data: progress, Discovery Cards,
 * personal connections, and explorations. Like the investigation repository,
 * records are validated on the way in and out, failures surface as
 * StorageErrors, records written by a newer version are never overwritten,
 * and multi-record operations run in one transaction.
 *
 * Study records use last-write-wins: unlike research notebooks there is no
 * long free-text editing, and each write is a small, complete state.
 */
import type { Table } from "dexie";
import type { z } from "zod";
import {
  discoveryCardSchema,
  explorationSchema,
  isFromNewerStudyVersion,
  personalConnectionSchema,
  STUDY_DATA_VERSION,
  studyProgressSchema,
  type DiscoveryCard,
  type Exploration,
  type PersonalConnection,
  type StudyProgress,
} from "@/domain/study/user-data";
import type { GospelLabsDatabase } from "./db";
import { StorageError, toStorageError } from "./storage-errors";

async function guard<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw toStorageError(error);
  }
}

export interface RecordList<T> {
  /** Valid records, most recently updated first. */
  records: T[];
  /** Stored records that failed validation. They are left in place, not deleted. */
  unreadable: number;
}

type Stamped = { id: string; updatedAt: string; dataVersion?: number };

const unreadableError = () =>
  new StorageError("invalid-data", {
    message:
      "Some saved study data couldn’t be read, so Gospel Labs left it untouched rather than replace it. Export a backup to keep a copy, and reload to try again.",
  });

const byMostRecent = (a: Stamped, b: Stamped) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt);

/** Typed, validated access to one study table. */
function createStore<T extends Stamped>(table: Table<T, string>, schema: z.ZodType<T>) {
  function validate(record: unknown): T {
    const result = schema.safeParse(record);
    if (!result.success) throw new StorageError("invalid-data", { cause: result.error });
    return { ...result.data, dataVersion: STUDY_DATA_VERSION };
  }

  async function readAll({ asStored = false } = {}): Promise<RecordList<T>> {
    const stored: unknown[] = await table.toArray();
    const records: T[] = [];
    let unreadable = 0;
    for (const record of stored) {
      const result = schema.safeParse(record);
      if (result.success) records.push(asStored ? (record as T) : result.data);
      else unreadable++;
    }
    return { records: records.sort(byMostRecent), unreadable };
  }

  async function putInTransaction(record: unknown) {
    const valid = validate(record);
    const existing: unknown = await table.get(valid.id);
    if (existing !== undefined) {
      if (isFromNewerStudyVersion(existing as Stamped)) throw new StorageError("version");
      // Never replace a stored record this version can't read: it may hold the learner's work (a damaged
      // field, or data from a version that didn't bump STUDY_DATA_VERSION). Backup import replaces such
      // records only through its own, previewed path.
      if (!schema.safeParse(existing).success) throw unreadableError();
    }
    await table.put(valid);
    return valid;
  }

  return {
    table,
    validate,
    readAll,
    list: () => guard(() => readAll()),
    /**
     * The record, or undefined if there is none. A stored record that fails validation is an error, not
     * "missing": treating it as missing would let the next save replace the learner's data with a fresh record.
     */
    get: (id: string) =>
      guard(async (): Promise<T | undefined> => {
        const record: unknown = await table.get(id);
        if (record === undefined) return undefined;
        const result = schema.safeParse(record);
        if (!result.success) throw unreadableError();
        return result.data;
      }),
    /**
     * Validates, stamps, and saves a record. Refuses to overwrite one saved by a newer version, or a stored
     * record that this version can't read.
     */
    put: (record: T) => guard(() => table.db.transaction("rw", table, () => putInTransaction(record))),
    putInTransaction,
    delete: (id: string) => guard(() => table.delete(id)),
  };
}

export interface StudySnapshot {
  progress: StudyProgress[];
  discoveries: DiscoveryCard[];
  personalConnections: PersonalConnection[];
  explorations: Exploration[];
}

export const emptyStudySnapshot = (): StudySnapshot => ({
  progress: [],
  discoveries: [],
  personalConnections: [],
  explorations: [],
});

export function createStudyRepository(db: GospelLabsDatabase) {
  const progress = createStore(db.studyProgress, studyProgressSchema as z.ZodType<StudyProgress>);
  const discoveries = createStore(db.discoveries, discoveryCardSchema as z.ZodType<DiscoveryCard>);
  const personalConnections = createStore(db.personalConnections, personalConnectionSchema as z.ZodType<PersonalConnection>);
  const explorations = createStore(db.explorations, explorationSchema as z.ZodType<Exploration>);
  const tables = [db.studyProgress, db.discoveries, db.personalConnections, db.explorations];

  return {
    progress,
    discoveries,
    personalConnections,
    explorations,

    /**
     * Saves a completed investigation's progress and its new Discovery Card
     * together, so a card never exists without its progress or vice versa.
     */
    completeInvestigation: (record: StudyProgress, card: DiscoveryCard) =>
      guard(() =>
        db.transaction("rw", db.studyProgress, db.discoveries, async () => {
          const savedCard = await discoveries.putInTransaction(card);
          const savedProgress = await progress.putInTransaction({ ...record, discoveryId: savedCard.id });
          return { progress: savedProgress, card: savedCard };
        }),
      ),

    /**
     * Deletes a Discovery Card. Progress that pointed at it forgets the link
     * (the investigation stays completed), so the card isn't recreated.
     */
    deleteDiscovery: (id: string) =>
      guard(() =>
        db.transaction("rw", db.studyProgress, db.discoveries, async () => {
          await db.discoveries.delete(id);
          const linked = (await db.studyProgress.toArray()).filter((record) => record.discoveryId === id);
          const now = new Date().toISOString();
          for (const record of linked) {
            // A record from a newer version is left as it is; its link is resolved by origin instead.
            if (isFromNewerStudyVersion(record)) continue;
            const { discoveryId: _removed, ...rest } = record;
            void _removed;
            await db.studyProgress.put({ ...rest, updatedAt: now } as StudyProgress);
          }
        }),
      ),

    /**
     * The valid Discovery Card saved from a piece of content (oldest first if, through an older version or
     * an import, there is more than one). Lets builders update a card instead of creating a duplicate when
     * a progress record has lost its link.
     */
    findDiscoveryByOrigin: (kind: DiscoveryCard["origin"]["kind"], contentId: string) =>
      guard(async (): Promise<DiscoveryCard | undefined> => {
        const { records } = await discoveries.readAll();
        return records
          .filter((card) => card.origin.kind === kind && card.origin.contentId === contentId)
          .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))[0];
      }),

    /** Every valid study record exactly as stored, for backups. */
    snapshot: () =>
      guard(() =>
        db.transaction("r", tables, async () => {
          const [p, d, c, e] = await Promise.all([
            progress.readAll({ asStored: true }),
            discoveries.readAll({ asStored: true }),
            personalConnections.readAll({ asStored: true }),
            explorations.readAll({ asStored: true }),
          ]);
          return {
            snapshot: {
              progress: p.records,
              discoveries: d.records,
              personalConnections: c.records,
              explorations: e.records,
            } satisfies StudySnapshot,
            unreadable: p.unreadable + d.unreadable + c.unreadable + e.unreadable,
          };
        }),
      ),

    /** Number of study records of each kind. */
    counts: () =>
      guard(async () => ({
        progress: await db.studyProgress.count(),
        discoveries: await db.discoveries.count(),
        personalConnections: await db.personalConnections.count(),
        explorations: await db.explorations.count(),
      })),

    /** Deletes all study data, returning how many records were removed. */
    deleteAll: () =>
      guard(() =>
        db.transaction("rw", tables, async () => {
          let removed = 0;
          for (const table of tables) {
            removed += await table.count();
            await table.clear();
          }
          return removed;
        }),
      ),
  };
}

export type StudyRepository = ReturnType<typeof createStudyRepository>;
