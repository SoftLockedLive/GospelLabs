"use client";

/**
 * Saving and managing highlights: the panel for the current selection (with
 * an optional theme and note) and the list of saved highlights, where each
 * can be edited or removed.
 */
import { Check, Highlighter, Pencil, Trash2, X } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { chapterLabel, type ExplorerTheme } from "@/domain/study/explorer";
import type { PassageHighlight } from "@/domain/study/user-data";
import { cn } from "@/lib/cn";
import { useUnsavedDraft } from "@/lib/unsaved-work";
import { ThemeChip, themeTone } from "./theme-chip";

export interface HighlightDraft {
  conceptId?: string;
  note: string;
}

/** Theme choice (optional) and note (optional) for a highlight. */
function HighlightFields({ themes, value, onChange }: { themes: readonly ExplorerTheme[]; value: HighlightDraft; onChange: (draft: HighlightDraft) => void }) {
  const name = useId();
  const noteId = useId();
  const options = [{ conceptId: undefined, label: "No theme" }, ...themes.map((theme) => ({ conceptId: theme.conceptId, label: theme.label, ref: theme.ref }))];
  return (
    <div className="flex flex-col gap-4">
      <fieldset>
        <legend className="mb-2 flex items-baseline gap-2 text-sm font-medium text-fg">
          Theme <span className="text-xs font-normal text-subtle">Optional</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const checked = value.conceptId === option.conceptId;
            return (
              <label
                key={option.conceptId ?? "none"}
                className={cn(
                  "relative inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent sm:min-h-9",
                  checked
                    ? "ref" in option && option.ref
                      ? cn(themeTone(option.ref), "font-medium")
                      : "border-line-strong bg-surface-raised font-medium text-fg"
                    : "border-line text-muted hover:border-line-strong hover:text-fg",
                )}
              >
                <input
                  type="radio"
                  name={name}
                  checked={checked}
                  onChange={() => onChange({ ...value, conceptId: option.conceptId })}
                  className="sr-only"
                />
                {checked && <Check aria-hidden className="size-3.5" />}
                {option.label}
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="flex flex-col gap-2">
        <label htmlFor={noteId} className="flex items-baseline gap-2 text-sm font-medium text-fg">
          Note <span className="text-xs font-normal text-subtle">Optional</span>
        </label>
        <Textarea
          id={noteId}
          rows={2}
          value={value.note}
          maxLength={2000}
          placeholder="What do you notice in these words?"
          onChange={(event) => onChange({ ...value, note: event.target.value })}
        />
      </div>
    </div>
  );
}

interface NewHighlightProps {
  /** The selected words, exactly as in the verse. */
  text: string;
  verse: number;
  reference: string;
  themes: readonly ExplorerTheme[];
  /** Whether the selection is already the whole verse. */
  isWholeVerse: boolean;
  /** The theme and note so far. Held by the page, so its other Save button (on phones) saves them too. */
  draft: HighlightDraft;
  onDraftChange: (draft: HighlightDraft) => void;
  onSave: (draft: HighlightDraft) => void;
  onWholeVerse: () => void;
  onClear: () => void;
}

/** Shown while words are selected: the selection, an optional theme and note, and Save. */
export function NewHighlight({ text, verse, reference, themes, isWholeVerse, draft, onDraftChange, onSave, onWholeVerse, onClear }: NewHighlightProps) {
  const headingId = useId();
  // A note exists only on screen until Save: the update notice and the browser ask before it would be lost.
  useUnsavedDraft(draft.note.trim() !== "", "New highlight");
  return (
    <section aria-labelledby={headingId} className="motion-reveal rounded-xl border border-accent/40 bg-surface-raised p-4 shadow-lifted sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 id={headingId} className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Highlighter aria-hidden className="size-4 text-accent" />
          New highlight · {chapterLabel(reference)}:{verse}
        </h3>
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear selection"
          className="-mt-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-subtle hover:bg-surface hover:text-fg"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>
      <blockquote className="mt-2 border-l-2 border-accent pl-3 prose-scripture text-fg">{text}</blockquote>
      <div className="mt-4">
        <HighlightFields themes={themes} value={draft} onChange={onDraftChange} />
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button onClick={() => onSave(draft)} className="h-11 sm:h-10">
          <Highlighter aria-hidden />
          Save highlight
        </Button>
        {!isWholeVerse && (
          <Button variant="secondary" onClick={onWholeVerse} className="h-11 sm:h-10">
            Select the whole verse
          </Button>
        )}
      </div>
    </section>
  );
}

interface HighlightListProps {
  items: readonly { highlight: PassageHighlight; text: string }[];
  reference: string;
  themes: Readonly<Record<string, ExplorerTheme>>;
  recentId: string | null;
  onUpdate: (id: string, draft: HighlightDraft) => void;
  onRemove: (id: string) => void;
  onShow: (highlight: PassageHighlight) => void;
}

export function HighlightList({ items, reference, themes, recentId, onUpdate, onRemove, onShow }: HighlightListProps) {
  if (!items.length) {
    return (
      <p className="rounded-xl border border-dashed border-line-strong px-4 py-5 text-sm leading-relaxed text-muted">
        No highlights yet. Tap the words that stand out to you, then save them. Tag a highlight with a theme to mark something you
        found.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {items.map(({ highlight, text }) => (
        <HighlightItem
          key={highlight.id}
          highlight={highlight}
          text={text}
          reference={reference}
          themes={themes}
          recent={highlight.id === recentId}
          onUpdate={onUpdate}
          onRemove={onRemove}
          onShow={onShow}
        />
      ))}
    </ul>
  );
}

function HighlightItem({
  highlight,
  text,
  reference,
  themes,
  recent,
  onUpdate,
  onRemove,
  onShow,
}: Omit<HighlightListProps, "items" | "recentId"> & { highlight: PassageHighlight; text: string; recent: boolean }) {
  const [mode, setMode] = useState<"view" | "edit" | "confirm-remove">("view");
  const [draft, setDraft] = useState<HighlightDraft>({ conceptId: highlight.conceptId, note: highlight.note });
  const theme = highlight.conceptId ? themes[highlight.conceptId] : undefined;
  const verseRef = `${chapterLabel(reference)}:${highlight.verse}`;
  useUnsavedDraft(mode === "edit" && (draft.note !== highlight.note || draft.conceptId !== highlight.conceptId), `Highlight ${verseRef}`);

  return (
    <li className={cn("rounded-xl border border-line bg-surface p-4", recent && "motion-reveal")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onShow(highlight)}
          className="inline-flex min-h-11 items-center font-mono text-xs tracking-wide text-accent hover:text-accent-strong hover:underline sm:min-h-0 sm:py-1"
        >
          {verseRef}
          <span className="sr-only">: show in the passage</span>
        </button>
        {theme && mode !== "edit" && <ThemeChip label={theme.label} themeRef={theme.ref} />}
      </div>
      <p className="mt-1.5 prose-scripture text-fg">
        <mark className="rounded-sm bg-highlight px-0.5 text-highlight-fg [box-decoration-break:clone]">{text}</mark>
      </p>

      {mode === "view" && (
        <>
          {highlight.note && <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-muted">{highlight.note}</p>}
          <div className="mt-2 flex flex-wrap gap-1">
            <Button variant="ghost" size="sm" className="h-11 sm:h-8" onClick={() => setMode("edit")}>
              <Pencil aria-hidden />
              Edit<span className="sr-only"> highlight {verseRef}</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-11 sm:h-8" onClick={() => setMode("confirm-remove")}>
              <Trash2 aria-hidden />
              Remove<span className="sr-only"> highlight {verseRef}</span>
            </Button>
          </div>
        </>
      )}

      {mode === "edit" && (
        <div className="mt-3">
          <HighlightFields themes={Object.values(themes)} value={draft} onChange={setDraft} />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              className="h-11 sm:h-9"
              onClick={() => {
                onUpdate(highlight.id, draft);
                setMode("view");
              }}
            >
              Save changes
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="h-11 sm:h-9"
              onClick={() => {
                setDraft({ conceptId: highlight.conceptId, note: highlight.note });
                setMode("view");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {mode === "confirm-remove" && (
        <div role="group" aria-label="Remove this highlight?" className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">Remove this highlight{highlight.note ? " and its note" : ""}?</span>
          <Button variant="danger" size="sm" className="h-11 sm:h-8" onClick={() => onRemove(highlight.id)}>
            Remove
          </Button>
          <Button variant="secondary" size="sm" className="h-11 sm:h-8" onClick={() => setMode("view")} autoFocus>
            Keep it
          </Button>
        </div>
      )}
    </li>
  );
}
