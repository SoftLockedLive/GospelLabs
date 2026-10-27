"use client";

import { Check, LoaderCircle, TriangleAlert } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Textarea } from "@/components/ui/input";
import type { DiscoveryCard } from "@/domain/study/user-data";
import { registerAutosave } from "@/lib/unsaved-work";
import { hasUnsavedNotes, NotesAutosave, type NotesStatus } from "./card-notes-autosave";

interface CardNotesProps {
  card: DiscoveryCard;
  /** Told whether notes typed here are still waiting to be stored, so the card can stay on screen until they are. */
  onUnsavedChange?: (unsaved: boolean) => void;
}

/**
 * Optional personal notes on a Discovery Card — the only text on a card the
 * learner writes. Saved automatically a moment after typing stops, when the
 * field loses focus, when the page is hidden or closed, and before the app
 * reloads itself for an update. Never required. Text that can't be saved
 * stays in the field, with the reason, so it can be copied.
 */
export function CardNotes({ card, onUnsavedChange }: CardNotesProps) {
  const fieldId = useId();
  const hintId = `${fieldId}-hint`;
  // null until the learner types: until then the stored notes (which may change in another tab) are shown.
  const [draft, setDraft] = useState<string | null>(null);
  const [status, setStatus] = useState<NotesStatus>({ state: "idle" });
  const [autosave] = useState(() => new NotesAutosave(card.id, setStatus));
  const unsaved = hasUnsavedNotes(status);

  useEffect(() => onUnsavedChange?.(unsaved), [unsaved, onUnsavedChange]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void autosave.flush();
    };
    const onPageHide = () => void autosave.flush();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    // Lets a reload for an app update save the notes first (and wait if they can't be).
    const unregister = registerAutosave(() => autosave.flush());
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      unregister();
      void autosave.flush();
    };
  }, [autosave]);

  const value = draft ?? card.notes;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor={fieldId} className="flex items-baseline gap-2 text-sm font-medium text-fg">
          Your notes
          <span className="text-xs font-normal text-subtle">Optional</span>
        </label>
        <SaveState status={status} />
      </div>
      <Textarea
        id={fieldId}
        aria-describedby={hintId}
        rows={4}
        value={value}
        placeholder="Anything you’d like to remember about this discovery…"
        onChange={(event) => {
          setDraft(event.target.value);
          autosave.change(event.target.value);
        }}
        onBlur={() => void autosave.flush()}
      />
      <p id={hintId} className="text-xs leading-relaxed text-subtle">
        Only you see these, on this device. They&rsquo;re saved automatically.
      </p>
      {status.state === "deleted" && (
        <p role="alert" className="flex items-start gap-1.5 text-sm text-danger">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          This card was deleted, so your note wasn&rsquo;t saved. It&rsquo;s still in the box above if you&rsquo;d like to copy it.
        </p>
      )}
      {status.state === "error" && !status.retrying && (
        <p role="alert" className="flex items-start gap-1.5 text-sm text-danger">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          Your note couldn&rsquo;t be saved. {status.message} It&rsquo;s still in the box above if you&rsquo;d like to copy it.
        </p>
      )}
    </div>
  );
}

function SaveState({ status }: { status: NotesStatus }) {
  return (
    <p aria-live="polite" className="min-h-5 text-xs">
      {status.state === "saving" && (
        <span className="inline-flex items-center gap-1.5 text-subtle">
          <LoaderCircle aria-hidden className="size-3.5 motion-safe:animate-spin" />
          Saving…
        </span>
      )}
      {status.state === "saved" && (
        <span className="motion-success inline-flex items-center gap-1.5 text-green">
          <Check aria-hidden className="size-3.5" />
          Saved
        </span>
      )}
      {status.state === "error" && status.retrying && (
        <span className="inline-flex items-center gap-1.5 text-danger">
          <TriangleAlert aria-hidden className="size-3.5" />
          Couldn&rsquo;t save yet. Your text is still here; it will try again.
        </span>
      )}
      {(status.state === "deleted" || (status.state === "error" && !status.retrying)) && (
        <span className="inline-flex items-center gap-1.5 text-danger">
          <TriangleAlert aria-hidden className="size-3.5" />
          Not saved
        </span>
      )}
    </p>
  );
}
