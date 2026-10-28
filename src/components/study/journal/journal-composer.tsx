"use client";

/**
 * Writing in the Journal: what kind of entry it is (a thought, a tender mercy, or a question), the words, and,
 * when it's written from somewhere in the app, the place it came up. Saved only on this device.
 */
import { X } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { JOURNAL_ENTRY_KINDS, JOURNAL_ENTRY_KIND_LABELS, MAX_JOURNAL_TEXT, newJournalEntry, type JournalEntryKind, type JournalLink } from "@/domain/study/journal";
import { cn } from "@/lib/cn";
import { createId } from "@/lib/ids";
import { getStudyRepository } from "@/persistence/client";
import { toStorageError } from "@/persistence/storage-errors";

/** What the empty box invites, for each kind. */
export const JOURNAL_PROMPTS: Record<JournalEntryKind, string> = {
  thought: "What’s on your mind? Write anything.",
  "tender-mercy": "Where did you notice the Lord’s hand today? Big or small.",
  question: "What are you wondering about?",
};

interface JournalComposerProps {
  /** Where the thought came up, saved with the entry. The learner can remove it before saving. */
  link?: JournalLink;
  initialKind?: JournalEntryKind;
  /** Called with the saved entry's id. */
  onSaved?: (id: string) => void;
  autoFocus?: boolean;
  className?: string;
}

export function JournalComposer({ link: initialLink, initialKind = "thought", onSaved, autoFocus, className }: JournalComposerProps) {
  const [kind, setKind] = useState<JournalEntryKind>(initialKind);
  const [text, setText] = useState("");
  const [link, setLink] = useState<JournalLink | undefined>(initialLink);
  const [status, setStatus] = useState<{ tone: "saved" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const textId = useId();
  const kindName = useId();
  const helpId = useId();

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      const entry = await getStudyRepository().journal.put(newJournalEntry({ id: createId(), now: new Date(), text, kind, link }));
      setText("");
      setStatus({ tone: "saved", text: "Saved to your journal." });
      onSaved?.(entry.id);
    } catch (cause) {
      setStatus({ tone: "error", text: `${toStorageError(cause).message} Your words are still here.` });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} aria-label="Write in your journal" className={cn("flex flex-col gap-3", className)}>
      <fieldset>
        <legend className="sr-only">Kind of entry</legend>
        <div className="flex flex-wrap gap-2">
          {JOURNAL_ENTRY_KINDS.map((value) => (
            <label
              key={value}
              className={cn(
                "motion-press inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-[0.9375rem] font-semibold transition-colors select-none sm:min-h-9",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                kind === value ? "border-accent bg-accent-soft text-accent" : "border-line-strong text-fg hover:bg-surface-raised",
              )}
            >
              <input type="radio" name={kindName} value={value} checked={kind === value} onChange={() => setKind(value)} className="sr-only" />
              {JOURNAL_ENTRY_KIND_LABELS[value]}
            </label>
          ))}
        </div>
      </fieldset>
      {kind === "tender-mercy" && (
        <p id={helpId} className="text-sm leading-relaxed text-muted">
          Elder David A. Bednar described tender mercies as &ldquo;the very personal and individualized blessings &hellip; which we
          receive from and because of and through the Lord Jesus Christ&rdquo; (&ldquo;The Tender Mercies of the Lord,&rdquo; April 2005).
        </p>
      )}
      <label htmlFor={textId} className="sr-only">
        Your entry
      </label>
      <textarea
        id={textId}
        rows={4}
        value={text}
        maxLength={MAX_JOURNAL_TEXT}
        autoFocus={autoFocus}
        aria-describedby={kind === "tender-mercy" ? helpId : undefined}
        placeholder={JOURNAL_PROMPTS[kind]}
        onChange={(event) => {
          setText(event.target.value);
          if (status?.tone === "saved") setStatus(null);
        }}
        className="w-full resize-y rounded-lg border border-line-strong bg-surface px-3.5 py-3 font-serif text-[1.0625rem] leading-relaxed text-fg placeholder:text-subtle hover:border-fg/50 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
      />
      {link && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <span className="min-w-0">
            Written at <span className="font-semibold text-fg">{link.label}</span>
          </span>
          <button
            type="button"
            onClick={() => setLink(undefined)}
            className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-raised hover:text-fg sm:size-8"
            aria-label={`Don’t link this entry to ${link.label}`}
          >
            <X aria-hidden className="size-4" />
          </button>
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">Private: saved only on this device.</p>
        <Button type="submit" disabled={!text.trim() || saving} className="w-full sm:w-auto">
          {saving ? "Saving…" : "Save to journal"}
        </Button>
      </div>
      <div role="status" className="empty:hidden">
        {status?.tone === "saved" && <p className="text-sm font-semibold text-green">{status.text}</p>}
      </div>
      {status?.tone === "error" && (
        <p role="alert" className="text-sm text-danger">
          {status.text}
        </p>
      )}
    </form>
  );
}
