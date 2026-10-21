/**
 * A synchronous safety copy of edits that haven't reached IndexedDB yet.
 *
 * When a page is closed or reloaded, a browser may abandon IndexedDB writes
 * still in progress (Firefox does), so autosave's last-moment save can be
 * lost. localStorage writes are synchronous and survive. The copy is written
 * only while edits are unsaved, removed as soon as they're saved, and when
 * the investigation is next opened a copy that's still there is restored
 * through the normal, conflict-checked save. It never overwrites newer data.
 */
import { investigationSchema, type Investigation } from "@/domain/investigation";

const PREFIX = "gospel-labs:unsaved:";

export interface UnsavedCopy {
  investigation: Investigation;
  /** The stored version (its updatedAt) these edits continue from, or null for a never-saved draft. */
  basedOn: string | null;
  /** When the copy was made (ISO time). */
  keptAt?: string;
}

type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** localStorage, or null where it's unavailable (private modes, blocked storage). */
function defaultStore(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function keepUnsavedCopy(copy: UnsavedCopy, store: KeyValueStore | null = defaultStore()): void {
  try {
    store?.setItem(PREFIX + copy.investigation.id, JSON.stringify({ keptAt: new Date().toISOString(), ...copy }));
  } catch {
    // Full or blocked: the regular save still runs; this copy is only a backstop.
  }
}

export function dropUnsavedCopy(id: string, store: KeyValueStore | null = defaultStore()): void {
  try {
    store?.removeItem(PREFIX + id);
  } catch {
    // Nothing to do.
  }
}

/** The safety copy for an investigation, if one is waiting. Invalid copies are discarded. */
export function readUnsavedCopy(id: string, store: KeyValueStore | null = defaultStore()): UnsavedCopy | null {
  let raw: string | null = null;
  try {
    raw = store?.getItem(PREFIX + id) ?? null;
  } catch {
    return null;
  }
  if (raw === null) return null;
  try {
    const data = JSON.parse(raw) as { investigation?: unknown; basedOn?: unknown; keptAt?: unknown };
    const result = investigationSchema.safeParse(data.investigation);
    const basedOn = typeof data.basedOn === "string" ? data.basedOn : null;
    const keptAt = typeof data.keptAt === "string" ? data.keptAt : undefined;
    if (result.success && result.data.id === id) return { investigation: result.data, basedOn, ...(keptAt && { keptAt }) };
  } catch {
    // Fall through: unreadable.
  }
  dropUnsavedCopy(id, store);
  return null;
}

/** Ids of investigations with a safety copy waiting. */
export function unsavedCopyIds(store: (KeyValueStore & Pick<Storage, "length" | "key">) | null = defaultStore() as Storage | null): string[] {
  const ids: string[] = [];
  try {
    for (let index = 0; store && index < store.length; index++) {
      const key = store.key(index);
      if (key?.startsWith(PREFIX)) ids.push(key.slice(PREFIX.length));
    }
  } catch {
    // Unavailable storage: nothing to recover.
  }
  return ids;
}

/**
 * What to open, given the stored investigation and any safety copy:
 * - no copy, or one already saved: the stored version;
 * - a copy continuing from the stored version: the copy, saved as usual;
 * - a copy based on an older version (another tab saved since): the copy,
 *   saved against its own base, so the save reports a conflict and the user
 *   chooses which version to keep.
 */
export function resolveUnsavedCopy(
  stored: Investigation,
  copy: UnsavedCopy | null,
): { initial: Investigation; basedOn: string | null; restored: boolean } {
  if (!copy || copy.investigation.updatedAt === stored.updatedAt) {
    return { initial: stored, basedOn: stored.updatedAt, restored: false };
  }
  return { initial: copy.investigation, basedOn: copy.basedOn, restored: true };
}
