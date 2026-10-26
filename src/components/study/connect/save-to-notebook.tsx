"use client";

import { BookmarkPlus, Check } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ConnectSession, Source } from "@/domain/study/content-schema";
import type { DiscoveryCard } from "@/domain/study/user-data";
import { notebookHref } from "@/lib/routes";
import { toStorageError } from "@/persistence/storage-errors";
import { saveSessionCard } from "./connect-storage";

interface SaveToNotebookProps {
  session: Pick<ConnectSession, "id" | "title" | "question">;
  source: Source;
  note: string;
  /** The card already saved from this session, if any. */
  savedCard?: DiscoveryCard;
  /** False while saved cards are loading or can't be read. */
  ready: boolean;
  /** Why the Notebook can't be read, if it can't. */
  unavailable?: string;
}

type SaveState = { kind: "idle" | "saving" | "saved" } | { kind: "error"; message: string };

/**
 * Optional: keep this session's scripture (and, if the learner wants, their
 * note) as a card in the Notebook. Nothing is saved unless they ask.
 */
export function SaveToNotebook({ session, source, note, savedCard, ready, unavailable }: SaveToNotebookProps) {
  const checkboxId = useId();
  const [includeNote, setIncludeNote] = useState(true);
  const [state, setState] = useState<SaveState>({ kind: "idle" });
  const trimmed = note.trim();

  function save(noteForCard: string) {
    setState({ kind: "saving" });
    saveSessionCard({ session, source, note: noteForCard, existing: savedCard }).then(
      () => setState({ kind: "saved" }),
      (error: unknown) => setState({ kind: "error", message: toStorageError(error).message }),
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {savedCard ? (
        <>
          <p className="flex flex-wrap items-center justify-center gap-x-2 text-sm text-sacred-fg">
            <Check aria-hidden className={state.kind === "saved" ? "size-4 text-green motion-success" : "size-4 text-green"} />
            {source.label} is in your Notebook.
            <Link
              href={notebookHref(savedCard.id)}
              className="inline-flex min-h-11 items-center font-medium text-accent hover:text-accent-strong hover:underline"
            >
              Open it
            </Link>
          </p>
          {trimmed && trimmed !== savedCard.notes && (
            <Button variant="ghost" disabled={state.kind === "saving"} onClick={() => save(trimmed)}>
              Update the note on that card
            </Button>
          )}
        </>
      ) : (
        <>
          <Button
            variant="secondary"
            size="lg"
            // Wraps to two lines on the narrowest phones instead of overflowing.
            className="h-auto! min-h-12 max-w-full py-2.5"
            disabled={!ready || state.kind === "saving"}
            onClick={() => save(includeNote ? trimmed : "")}
          >
            <BookmarkPlus aria-hidden />
            <span className="whitespace-normal">Save this scripture to my Notebook</span>
          </Button>
          {trimmed && (
            <label htmlFor={checkboxId} className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-sacred-muted">
              <input
                id={checkboxId}
                type="checkbox"
                checked={includeNote}
                onChange={(event) => setIncludeNote(event.target.checked)}
                className="size-4 accent-accent"
              />
              Include my note
            </label>
          )}
          <p className="max-w-sm text-xs leading-relaxed text-pretty text-sacred-muted">
            {unavailable
              ? `Your Notebook can’t be opened right now. ${unavailable}`
              : `Optional. Keeps ${source.label} in your Notebook so you can find it again.`}
          </p>
        </>
      )}

      <p aria-live="polite" className="text-xs">
        {state.kind === "saved" && <span className="sr-only">Saved to your Notebook.</span>}
        {state.kind === "error" && <span className="text-danger">This couldn’t be saved. {state.message}</span>}
      </p>
    </div>
  );
}
