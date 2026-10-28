"use client";

/**
 * Optional questions to ponder and a private note. Nothing here is required,
 * checked, or counted; the note is saved only on this device, as the learner
 * types. The section follows the "Show reflection prompts" study setting,
 * but a note already written is never hidden.
 */
import { Feather } from "lucide-react";
import { useId, useState } from "react";
import { useSaver } from "@/components/study/player/use-saver";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/input";
import { usePreferences } from "@/lib/preferences";
import { StudySection } from "./attribute-sections";
import { useAttributeStudy } from "./attribute-study-context";

export function ReflectionSection() {
  const { attribute, exploration } = useAttributeStudy();
  const preferences = usePreferences();
  const storedNote = exploration.status === "ready" ? (exploration.value?.note ?? "") : "";
  // Once shown, the section and its editor stay for this visit, even if the note is cleared (with prompts
  // turned off) or a later read fails: the editor holds what the learner is typing.
  const shown = preferences.activity.showReflections || !!storedNote;
  const [opened, setOpened] = useState({ section: false, editor: false });
  if ((shown && !opened.section) || (exploration.status === "ready" && !opened.editor)) {
    setOpened({ section: opened.section || shown, editor: opened.editor || exploration.status === "ready" });
  }
  if (!shown && !opened.section) return null;

  return (
    <StudySection id="ponder" title="Ponder" description="Optional. Nothing here is required or checked.">
      <div className="flex flex-col gap-5 rounded-2xl border border-sacred-line bg-sacred p-5 sm:p-6">
        {preferences.activity.showReflections && attribute.reflection.length > 0 && (
          <ul className="flex flex-col gap-3">
            {attribute.reflection.map((question) => (
              <li key={question} className="flex gap-3 font-serif text-[1.0625rem] leading-relaxed text-sacred-fg">
                <Feather aria-hidden className="mt-1.5 size-4 shrink-0 text-sacred-accent" />
                <span>{question}</span>
              </li>
            ))}
          </ul>
        )}
        {opened.editor || exploration.status === "ready" ? (
          <NoteEditor initialNote={storedNote} />
        ) : exploration.status === "loading" ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          // Without the saved note, a note typed here could replace it; the editor waits until it can be read.
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-sacred-muted">Your note can’t be loaded right now: {exploration.error.message}</p>
            <Button variant="secondary" size="sm" onClick={exploration.retry}>
              Try again
            </Button>
          </div>
        )}
      </div>
    </StudySection>
  );
}

/**
 * Mounted once the stored note is known, so typing never races with loading. Saved a moment after typing
 * stops, when the field loses focus, and before the page is hidden, closed, left, or reloaded for an update.
 */
function NoteEditor({ initialNote }: { initialNote: string }) {
  const { saveNote } = useAttributeStudy();
  const [draft, setDraft] = useState(initialNote);
  // saveNote is the same operation for the page's lifetime (one attribute).
  const { saver, status } = useSaver(saveNote);
  const id = useId();

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="flex items-baseline gap-2 text-sm font-medium text-sacred-fg">
        Your private note
        <span className="text-xs font-normal text-sacred-muted">Optional</span>
      </label>
      <Textarea
        id={id}
        rows={5}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          saver.update(event.target.value);
        }}
        onBlur={() => void saver.flush()}
        aria-describedby={`${id}-hint ${id}-status`}
        placeholder="Write anything you’d like to remember. Only you will see it."
        className="font-serif"
      />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <p id={`${id}-hint`} className="text-sacred-muted">
          Saved only on this device, and shown in your journal. It’s never shared or checked.
        </p>
        <p id={`${id}-status`} role="status" className={status.state === "error" ? "font-medium text-danger" : "text-sacred-muted"}>
          {(status.state === "pending" || status.state === "saving") && "Saving…"}
          {status.state === "saved" && "Saved"}
          {status.state === "error" && `Couldn’t save your note on this device. ${status.message} Your text is still here.`}
        </p>
      </div>
    </div>
  );
}
