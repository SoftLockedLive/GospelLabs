"use client";

import { useId } from "react";
import { useSaver } from "@/components/study/player/use-saver";
import { saveSessionNote } from "./connect-storage";

interface PrivateNoteProps {
  sessionId: string;
  value: string;
  onChange: (note: string) => void;
}

/**
 * An optional private note, saved with the session on this device as the
 * learner types. It is never required, never evaluated, and shown nowhere
 * else unless the learner saves it to their Notebook.
 *
 * Saved a moment after typing stops, when the field loses focus, and before
 * the page is hidden, closed, or left (including for another session) or
 * reloaded for an app update.
 */
export function PrivateNote({ sessionId, value, onChange }: PrivateNoteProps) {
  const id = useId();
  // One note per session: the component is mounted per session, so the operation is fixed for its lifetime.
  const { saver, status } = useSaver((note: string) => saveSessionNote(sessionId, note));

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="flex items-baseline gap-2 text-sm font-medium text-sacred-fg">
        A private note
        <span className="text-xs font-normal text-sacred-muted">Optional</span>
      </label>
      <textarea
        id={id}
        rows={4}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          saver.update(event.target.value);
        }}
        onBlur={() => void saver.flush()}
        aria-describedby={`${id}-hint`}
        placeholder="A thought, a question, or a verse you want to remember…"
        className="w-full resize-y rounded-xl border border-sacred-line bg-surface px-3.5 py-3 font-serif text-base leading-relaxed text-fg transition-colors placeholder:text-subtle hover:border-accent/40 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
      />
      <p id={`${id}-hint`} className="text-xs leading-relaxed text-sacred-muted">
        Kept only on this device, with this session. You never need to write anything.
      </p>
      <p aria-live="polite" className="min-h-4 text-xs text-sacred-muted">
        {status.state === "saved" && "Saved on this device."}
        {status.state === "error" && (
          <span className="text-danger">Your note couldn’t be saved. {status.message} Your text is still here; saving is tried again when you type or leave the field.</span>
        )}
      </p>
    </div>
  );
}
