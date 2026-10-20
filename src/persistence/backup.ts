/**
 * Backup file format and import planning. Everything here is pure; the
 * repository applies plans to the database inside a transaction.
 *
 * Format (version 1):
 *   {
 *     "format": "gospel-labs-backup",
 *     "version": 1,
 *     "exportedAt": "2026-10-20T12:00:00.000Z",
 *     "investigations": [ …Investigation records… ]
 *   }
 */
import { z } from "zod";
import { investigationSchema, type Investigation } from "@/domain/investigation";

export const BACKUP_FORMAT = "gospel-labs-backup";
export const BACKUP_VERSION = 1;
/** Larger files are refused before parsing so the page doesn't freeze. */
export const MAX_BACKUP_BYTES = 50 * 1024 * 1024;

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  investigations: Investigation[];
}

export function createBackup(investigations: readonly Investigation[], exportedAt: string): Backup {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt, investigations: [...investigations] };
}

export function serializeBackup(backup: Backup): string {
  return `${JSON.stringify(backup, null, 2)}\n`;
}

export function backupFileName(exportedAt: string): string {
  return `gospel-labs-backup-${exportedAt.slice(0, 10)}.json`;
}

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
  /** Position in the backup's investigations array. */
  index: number;
  id?: string;
  title?: string;
  reason: string;
}

export interface ParsedBackup {
  version: number;
  exportedAt?: string;
  investigations: Investigation[];
  /** Entries that were invalid or duplicated and will not be imported. */
  skipped: SkippedEntry[];
}

export type BackupParseResult = { ok: true; backup: ParsedBackup } | { ok: false; error: BackupError };

/**
 * Upgrades older backup versions to the current shape, one step at a time.
 * Key = the version being upgraded from. Empty while only version 1 exists.
 */
const MIGRATIONS: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = {};

const envelopeSchema = z.object({
  exportedAt: z.iso.datetime().optional().catch(undefined),
  investigations: z.array(z.unknown()),
});

const fail = (kind: BackupErrorKind, message: string): BackupParseResult => ({ ok: false, error: { kind, message } });

function describeIssue(issue: z.core.$ZodIssue): string {
  const path = issue.path.map(String).join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
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
  if (!envelope.success) return fail("malformed", "The backup doesn't contain a list of investigations.");

  const investigations: Investigation[] = [];
  const skipped: SkippedEntry[] = [];
  const seen = new Map<string, number>();

  envelope.data.investigations.forEach((entry, index) => {
    const raw = (entry ?? {}) as { id?: unknown; title?: unknown };
    const id = typeof raw.id === "string" ? raw.id : undefined;
    const title = typeof raw.title === "string" && raw.title ? raw.title : undefined;
    const result = investigationSchema.safeParse(entry);
    if (!result.success) {
      skipped.push({ index, id, title, reason: describeIssue(result.error.issues[0]) });
      return;
    }
    const firstIndex = seen.get(result.data.id);
    if (firstIndex !== undefined) {
      skipped.push({ index, id, title, reason: `Duplicate id; the copy at position ${firstIndex + 1} is used` });
      return;
    }
    seen.set(result.data.id, index);
    investigations.push(result.data);
  });

  return { ok: true, backup: { version, exportedAt: envelope.data.exportedAt, investigations, skipped } };
}

export type ImportMode = "merge" | "replace";

export interface ImportPlan {
  mode: ImportMode;
  /** Records to write. */
  toWrite: Investigation[];
  /** New investigations not currently stored. */
  added: number;
  /** Stored investigations replaced by a more recently edited copy from the backup. */
  updated: number;
  /** Merge: backup copies ignored because the stored copy is the same or newer. */
  kept: number;
  /** Replace: stored investigations that will be deleted first. */
  removed: number;
}

/** JSON with sorted keys, so equal records compare equal regardless of key order. */
function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, inner: unknown) =>
    inner && typeof inner === "object" && !Array.isArray(inner)
      ? Object.fromEntries(Object.entries(inner).sort(([a], [b]) => a.localeCompare(b)))
      : inner,
  );
}

/**
 * Merge: add new investigations; when an id exists on both sides, keep the
 * copy edited most recently (ties keep the stored copy).
 * Replace: delete everything stored, then write the backup's investigations.
 */
export function planImport(
  existing: readonly Investigation[],
  incoming: readonly Investigation[],
  mode: ImportMode,
): ImportPlan {
  const stored = new Map(existing.map((investigation) => [investigation.id, investigation]));

  if (mode === "replace") {
    return { mode, toWrite: [...incoming], added: incoming.length, updated: 0, kept: 0, removed: existing.length };
  }

  const plan: ImportPlan = { mode, toWrite: [], added: 0, updated: 0, kept: 0, removed: 0 };
  for (const candidate of incoming) {
    const current = stored.get(candidate.id);
    if (!current) {
      plan.toWrite.push(candidate);
      plan.added++;
    } else if (
      Date.parse(candidate.updatedAt) > Date.parse(current.updatedAt) &&
      stableStringify(candidate) !== stableStringify(current)
    ) {
      plan.toWrite.push(candidate);
      plan.updated++;
    } else {
      plan.kept++;
    }
  }
  return plan;
}
