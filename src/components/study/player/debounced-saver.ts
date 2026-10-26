/**
 * Autosave for study records (progress, a Discovery Card's note), independent
 * of React so it can be tested directly. Hosts report every new value; the
 * saver waits for typing to pause (or saves on the next tick for discrete
 * actions), writes one save at a time, always writes the latest value, and
 * reports failures without losing the value in memory. Study records are
 * last-write-wins (see study-repository.ts), so there is no conflict handling.
 */
import { toStorageError } from "@/persistence/storage-errors";

export type SaveStatus = { state: "idle" } | { state: "pending" } | { state: "saving" } | { state: "saved" } | { state: "error"; message: string };

export const TYPING_DELAY_MS = 400;

export class DebouncedSaver<T> {
  private latest: T | null = null;
  private saved: T | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running: Promise<void> | null = null;
  private status: SaveStatus = { state: "idle" };
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly write: (value: T) => Promise<unknown>,
    private readonly delayMs = TYPING_DELAY_MS,
  ) {}

  // --- useSyncExternalStore interface (arrow functions keep `this` bound) ---

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  };

  getStatus = () => this.status;

  /** Reports the latest value. `immediate` saves on the next tick rather than after the typing pause. */
  update(value: T, options: { immediate?: boolean } = {}): void {
    this.latest = value;
    if (value === this.saved) return;
    if (this.status.state !== "saving") this.setStatus({ state: "pending" });
    this.schedule(options.immediate ? 0 : this.delayMs);
  }

  /** Records a value as stored by someone else (e.g. saved together with a Discovery Card). */
  markSaved(value: T): void {
    this.clearTimer();
    this.latest = value;
    this.saved = value;
    this.setStatus({ state: "saved" });
  }

  hasUnsavedChanges(): boolean {
    return this.latest !== null && this.latest !== this.saved;
  }

  /** Saves now (page hidden, leaving, before a related write). Resolves once nothing is pending or a save failed. */
  async flush(): Promise<void> {
    this.clearTimer();
    while (this.running) await this.running;
    const target = this.latest;
    if (target === null || target === this.saved) return;
    this.setStatus({ state: "saving" });
    this.running = this.write(target).then(
      () => {
        this.saved = target;
        this.setStatus({ state: this.latest === target ? "saved" : "pending" });
      },
      (error: unknown) => this.setStatus({ state: "error", message: toStorageError(error).message }),
    );
    try {
      await this.running;
    } finally {
      this.running = null;
    }
    // Values reported while saving go out after the usual pause.
    if (this.status.state === "pending") this.schedule(this.delayMs);
  }

  retry(): Promise<void> {
    return this.flush();
  }

  dispose(): void {
    this.clearTimer();
    this.listeners.clear();
  }

  private schedule(delay: number): void {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, delay);
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
