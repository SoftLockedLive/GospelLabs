/**
 * Autosave for one open investigation, independent of React so it can be
 * tested directly. The workspace reports every state change via update();
 * the controller debounces, writes one save at a time, and never overwrites
 * changes made elsewhere (another tab, an import) without the user's say-so.
 */
import type { Investigation } from "@/domain/investigation";
import type { SaveConflict, SaveResult } from "./investigation-repository";
import { toStorageError } from "./storage-errors";

export type SaveStatus =
  | { state: "draft" } // a new investigation nobody has edited yet: nothing to save
  | { state: "saved" }
  | { state: "pending" } // waiting for typing to pause
  | { state: "saving" }
  | { state: "error"; message: string }
  | { state: "conflict"; conflict: SaveConflict };

export interface AutosaveOptions {
  /** What the editor starts with. */
  initial: Investigation;
  /** The stored copy the editor was loaded from, or null for a new investigation. */
  stored: Investigation | null;
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

  constructor(private readonly options: AutosaveOptions) {
    this.latest = options.initial;
    this.saved = options.stored;
    this.expectedUpdatedAt = options.stored?.updatedAt ?? null;
    this.status = options.stored ? { state: "saved" } : { state: "draft" };
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
  }

  retry(): Promise<void> {
    return this.flush();
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
