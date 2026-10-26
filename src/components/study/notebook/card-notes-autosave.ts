/**
 * Autosave for a Discovery Card's notes, independent of React so it can be
 * tested directly. Notes are saved a moment after typing stops (or at once
 * on flush), and a failed save is retried quietly. The text being saved is
 * never dropped: until it is stored it stays pending, including when the card
 * was deleted elsewhere (so the learner can copy it) or can't be read.
 */
import { getStudyRepository } from "@/persistence/client";
import { toStorageError } from "@/persistence/storage-errors";
import type { StudyRepository } from "@/persistence/study-repository";

export const NOTES_SAVE_DELAY_MS = 700;
export const NOTES_RETRY_DELAY_MS = 4000;

export type NotesStatus =
  | { state: "idle" | "pending" | "saving" | "saved" }
  /** `retrying`: false when trying again can't help (data this version can't read, or a newer version's). */
  | { state: "error"; message: string; retrying: boolean }
  /** The card no longer exists, so the notes typed on it weren't saved. */
  | { state: "deleted" };

/** True while typed notes aren't stored: waiting, being saved, or refused. */
export const hasUnsavedNotes = (status: NotesStatus) => status.state !== "idle" && status.state !== "saved";

/** One per card. */
export class NotesAutosave {
  private pending: string | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running: Promise<void> | null = null;

  constructor(
    private readonly cardId: string,
    private readonly onStatus: (status: NotesStatus) => void,
    private readonly repository: () => StudyRepository = getStudyRepository,
    private readonly delays = { save: NOTES_SAVE_DELAY_MS, retry: NOTES_RETRY_DELAY_MS },
  ) {}

  change(notes: string): void {
    this.pending = notes;
    this.onStatus({ state: "pending" });
    this.schedule(this.delays.save);
  }

  /** Saves now. Resolves true once nothing typed is left unsaved, false if the notes couldn't be saved. */
  async flush(): Promise<boolean> {
    this.clearTimer();
    while (this.running) await this.running;
    const notes = this.pending;
    if (notes === null) return true;
    this.onStatus({ state: "saving" });
    this.running = this.write(notes).then(
      (outcome) => {
        // The text stays pending: it was typed on a card that is gone, and is still only on screen.
        if (outcome === "deleted") return this.onStatus({ state: "deleted" });
        // Typing that started while saving reports its own status and is saved after its own pause.
        if (this.pending !== notes) return;
        this.pending = null;
        this.onStatus({ state: "saved" });
      },
      (error: unknown) => {
        const { kind, message } = toStorageError(error);
        const retrying = kind !== "invalid-data" && kind !== "version";
        this.onStatus({ state: "error", message, retrying });
        if (retrying) this.schedule(this.delays.retry);
      },
    );
    try {
      await this.running;
    } finally {
      this.running = null;
    }
    return this.pending === null;
  }

  dispose(): void {
    this.clearTimer();
  }

  /**
   * Reads the card and saves its notes in one transaction, so a card deleted in another tab is never brought
   * back by a save that read it just before.
   */
  private async write(notes: string): Promise<"saved" | "deleted"> {
    const { discoveries } = this.repository();
    try {
      return await discoveries.table.db.transaction("rw", discoveries.table, async () => {
        // Throws for a card this version can't read, so it is never overwritten.
        const latest = await discoveries.get(this.cardId);
        if (!latest) return "deleted" as const;
        if (latest.notes !== notes) await discoveries.putInTransaction({ ...latest, notes, updatedAt: new Date().toISOString() });
        return "saved" as const;
      });
    } catch (error) {
      throw toStorageError(error);
    }
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
}
