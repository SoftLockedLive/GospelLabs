/**
 * Autosave for one open investigation, independent of React so it can be
 * tested directly. The workspace reports every state change via update();
 * the controller debounces, writes one save at a time, and never overwrites
 * changes made elsewhere (another tab, an import) without the user's say-so.
 */
import { isFromNewerVersion, type Investigation } from "@/domain/investigation";
import type { SaveConflict, SaveResult } from "./investigation-repository";
import { toStorageError } from "./storage-errors";

export type SaveStatus =
  | { state: "draft" } // a new investigation nobody has edited yet: nothing to save
  | { state: "saved" }
  | { state: "pending" } // waiting for typing to pause
  | { state: "saving" }
  | { state: "error"; message: string }
  | { state: "conflict"; conflict: SaveConflict }
  /** Another tab or window saved a newer copy, and nothing here is unsaved: offer to load it. */
  | { state: "outdated" };

/** What identifies a stored copy's version: when it was last edited, and the format that wrote it. */
export interface StoredStamp {
  updatedAt: string;
  dataVersion?: number;
}

export interface AutosaveOptions {
  /** What the editor starts with. */
  initial: Investigation;
  /** The stored copy the editor was loaded from, or null for a new investigation. */
  stored: Investigation | null;
  /**
   * The stored version the editor's content continues from, when that isn't
   * `stored` (edits restored from a safety copy made before another tab saved).
   * Saves are checked against it, so they can't overwrite the newer copy.
   */
  basedOn?: string | null;
  save: (investigation: Investigation, expectedUpdatedAt: string | null) => Promise<SaveResult>;
  overwrite: (investigation: Investigation) => Promise<void>;
  /** Called once, after a new investigation is first written. */
  onFirstSave?: (investigation: Investigation) => void;
  delayMs?: number;
}

export const AUTOSAVE_DELAY_MS = 600;

export class AutosaveController {
  private latest: Investigation;
  private saved: Investigation | null;
  private expectedUpdatedAt: string | null;
  private status: SaveStatus;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running: Promise<void> | null = null;
  private listeners = new Set<() => void>();
  /** The stored copy as last observed; undefined until first observed. */
  private lastStored: StoredStamp | null | undefined = undefined;
  /**
   * Edit times of every version this editor loaded or wrote. A stored copy
   * with one of these is this editor's own (possibly reported late); any
   * other was written somewhere else.
   */
  private readonly ownVersions = new Set<string>();

  constructor(private readonly options: AutosaveOptions) {
    this.latest = options.initial;
    this.saved = options.stored;
    this.expectedUpdatedAt = options.basedOn !== undefined ? options.basedOn : (options.stored?.updatedAt ?? null);
    this.status = options.stored ? { state: "saved" } : { state: "draft" };
    if (this.expectedUpdatedAt) this.ownVersions.add(this.expectedUpdatedAt);
  }

  // --- useSyncExternalStore interface (arrow functions keep `this` bound) ---

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getStatus = () => this.status;

  // --- editor interface ---

  /** Reports the editor's current state. Schedules a save if anything changed. */
  update(investigation: Investigation): void {
    this.latest = investigation;
    if (this.status.state === "conflict" || !this.needsSave()) return;
    this.setStatus({ state: "pending" });
    this.schedule();
  }

  /** The edits that haven't reached storage yet and the stored version they continue from, if any. */
  unsavedCopy(): { investigation: Investigation; basedOn: string | null } | null {
    return this.hasUnsavedChanges() ? { investigation: this.latest, basedOn: this.expectedUpdatedAt } : null;
  }

  /** True when there are edits that haven't reached storage. */
  hasUnsavedChanges(): boolean {
    return this.needsSave() || this.status.state === "saving";
  }

  /** Saves immediately (e.g. when the page is hidden or the editor closes). */
  async flush(): Promise<void> {
    this.clearTimer();
    while (this.running) await this.running;
    if (this.status.state === "conflict" || !this.needsSave()) return;
    this.running = this.persist(this.latest);
    try {
      await this.running;
    } finally {
      this.running = null;
    }
    // Changes reported while saving are checked now that this save's outcome is known.
    this.reconcile();
  }

  retry(): Promise<void> {
    return this.flush();
  }

  /**
   * Reports the stored copy as it is now, from a database watcher that also
   * sees changes made in other tabs. Changes from this editor's own saves are
   * recognised and ignored. Anything else stops autosave from overwriting it:
   * with no unsaved edits here the editor is merely "outdated"; with unsaved
   * edits it's a conflict for the user to resolve.
   */
  noteStored(stored: StoredStamp | null): void {
    this.lastStored = stored;
    if (!this.running) this.reconcile();
  }

  /** Abandons unsaved edits (e.g. before reloading the stored version after a conflict). */
  discard(): void {
    this.clearTimer();
    this.saved = this.latest;
    this.setStatus({ state: "saved" });
  }

  /** Resolves a conflict by writing this editor's version over the stored one. */
  async keepMine(): Promise<void> {
    this.clearTimer();
    while (this.running) await this.running;
    const target = this.latest;
    this.setStatus({ state: "saving" });
    try {
      await this.options.overwrite(target);
      this.markSaved(target);
    } catch (error) {
      this.setStatus({ state: "error", message: toStorageError(error).message });
    }
  }

  // --- internals ---

  private needsSave(): boolean {
    if (this.latest === this.saved) return false;
    // Outdated with only navigation changed here: nothing is worth saving over the newer copy.
    if (this.status.state === "outdated" && this.latest.updatedAt === this.saved?.updatedAt) return false;
    // Don't create a record for a draft until the user actually edits it.
    return this.saved !== null || this.latest.updatedAt !== this.options.initial.updatedAt;
  }

  private async persist(target: Investigation): Promise<void> {
    this.setStatus({ state: "saving" });
    try {
      const result = await this.options.save(target, this.expectedUpdatedAt);
      if (!result.ok) {
        this.setStatus({ state: "conflict", conflict: result.conflict });
        return;
      }
      const isFirstSave = this.saved === null;
      this.markSaved(target);
      if (isFirstSave) this.options.onFirstSave?.(target);
    } catch (error) {
      this.setStatus({ state: "error", message: toStorageError(error).message });
    }
  }

  private markSaved(target: Investigation): void {
    this.ownVersions.add(target.updatedAt);
    // After a successful write, an earlier "no stored copy" report is stale: had the copy been
    // deleted first, this save would have been refused. (Another version's stamp, in contrast,
    // can only have been written after this save, so it still counts.)
    if (this.lastStored === null) this.lastStored = undefined;
    this.saved = target;
    this.expectedUpdatedAt = target.updatedAt;
    if (this.latest !== target) {
      // Edits arrived while saving; save again after the usual pause.
      this.setStatus({ state: "pending" });
      this.schedule();
    } else {
      this.setStatus({ state: "saved" });
    }
  }

  private reconcile(): void {
    const stored = this.lastStored;
    // Before the first save there's no stored copy of this editor's own to protect.
    if (stored === undefined || this.saved === null || this.status.state === "conflict") return;
    if (stored === null) return this.stop("deleted");
    if (isFromNewerVersion(stored)) return this.stop("newer-version");
    if (this.ownVersions.has(stored.updatedAt)) {
      // This editor's own version, or a late report of an earlier one.
      if (this.status.state === "outdated" && stored.updatedAt === this.expectedUpdatedAt) {
        this.setStatus({ state: "saved" });
      }
      return;
    }
    if (this.needsSave()) return this.stop("modified");
    this.clearTimer();
    this.setStatus({ state: "outdated" });
  }

  private stop(conflict: SaveConflict): void {
    this.clearTimer();
    this.setStatus({ state: "conflict", conflict });
  }

  private schedule(): void {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, this.options.delayMs ?? AUTOSAVE_DELAY_MS);
  }

  private clearTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  private setStatus(status: SaveStatus): void {
    this.status = status;
    for (const listener of this.listeners) listener();
  }
}
