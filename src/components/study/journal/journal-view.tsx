"use client";

/**
 * The Journal tab of the Notebook: a place to write (thoughts, tender mercies, questions), and below it every
 * note the learner has written anywhere in Gospel Labs, newest first, each linked back to where it was written.
 * Journal entries are edited here; everything else is edited where it was written.
 */
import { ChevronRight, FileWarning, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import { StorageErrorState } from "@/components/investigations/storage-error-state";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import {
  compileJournal,
  editJournalEntry,
  EMPTY_JOURNAL_FILTERS,
  filterJournal,
  hasActiveJournalFilters,
  JOURNAL_ENTRY_KIND_LABELS,
  JOURNAL_SOURCE_LABELS,
  MAX_JOURNAL_TEXT,
  type JournalFilters,
  type JournalItem,
} from "@/domain/study/journal";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { getStudyRepository } from "@/persistence/client";
import { toStorageError } from "@/persistence/storage-errors";
import { useJournalSources } from "@/persistence/study-hooks";
import { JournalComposer } from "./journal-composer";
import { toJournalPlaces, type JournalPlacesData } from "./journal-places";

type GroupChoice = "all" | "entries" | "study";

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

/** Items in order, under a heading for each month ("October 2026"), by the learner's own time zone. */
function groupByMonth(items: readonly JournalItem[]) {
  const groups: { key: string; label: string; items: JournalItem[] }[] = [];
  for (const item of items) {
    const date = new Date(item.date);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, label: monthFormatter.format(date), items: [item] });
  }
  return groups;
}

export function JournalView({ places }: { places: JournalPlacesData }) {
  const sources = useJournalSources();
  const [filters, setFilters] = useState<JournalFilters>(EMPTY_JOURNAL_FILTERS);
  const lookups = useMemo(() => toJournalPlaces(places), [places]);
  const items = useMemo(
    () => (sources.status === "ready" ? compileJournal({ ...sources.value, places: lookups }) : []),
    [sources, lookups],
  );
  const results = useMemo(() => filterJournal(items, filters), [items, filters]);
  const groups = useMemo(() => groupByMonth(results), [results]);
  const narrowed = hasActiveJournalFilters(filters);

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="journal-write" className="flex flex-col gap-3">
        <div>
          <h2 id="journal-write" className="text-heading text-fg">
            Write
          </h2>
          <p className="mt-1 text-[0.9375rem] leading-relaxed text-muted">
            A thought, a question, or a tender mercy: a way you noticed the Lord in your day.
          </p>
        </div>
        <JournalComposer />
      </section>

      <section aria-labelledby="journal-all" className="flex flex-col gap-4 border-t border-line pt-6">
        <div>
          <h2 id="journal-all" className="text-heading text-fg">
            Everything you&rsquo;ve written
          </h2>
          <p className="mt-1 text-[0.9375rem] leading-relaxed text-muted">
            Your journal, and your notes and reflections from studying, each linked to where you wrote it.
          </p>
        </div>

        {sources.status === "loading" && (
          <div role="status" aria-label="Loading your journal" className="flex flex-col gap-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        )}
        {sources.status === "error" && <StorageErrorState error={sources.error} />}
        {sources.status === "ready" && (
          <>
            {sources.value.unreadable > 0 && (
              <p role="status" className="flex items-start gap-2 rounded-lg border border-amber/40 bg-amber-soft px-4 py-3 text-sm text-fg">
                <FileWarning aria-hidden className="mt-0.5 size-4 shrink-0 text-amber" />
                Some saved records couldn&rsquo;t be read, so anything written in them isn&rsquo;t shown here. They haven&rsquo;t been deleted.
              </p>
            )}
            {items.length === 0 ? (
              <p className="rounded-xl bg-surface-sunken px-5 py-6 text-[0.9375rem] leading-relaxed text-muted">
                Nothing yet. What you write above, and the notes and reflections you write while you study, will gather here.
              </p>
            ) : (
              <>
                <JournalFiltersBar filters={filters} onChange={setFilters} />
                <div className="flex min-h-11 items-center justify-between gap-3">
                  <p aria-live="polite" className="text-sm text-muted">
                    {narrowed ? `${results.length} of ${items.length} match` : `${items.length} ${items.length === 1 ? "piece" : "pieces"} of writing`}
                  </p>
                  {narrowed && (
                    <Button variant="link" size="sm" className="h-11 sm:h-8" onClick={() => setFilters(EMPTY_JOURNAL_FILTERS)}>
                      Clear
                    </Button>
                  )}
                </div>
                {results.length === 0 ? (
                  <p className="rounded-xl bg-surface-sunken px-5 py-6 text-[0.9375rem] text-muted">Nothing matches. Try different words.</p>
                ) : (
                  <div className="flex flex-col gap-8">
                    {groups.map((group) => (
                      <section key={group.key} aria-labelledby={`journal-month-${group.key}`} className="flex flex-col">
                        <h3 id={`journal-month-${group.key}`} className="scripture-caps pb-2 text-muted">
                          {group.label}
                        </h3>
                        <ul className="flex flex-col divide-y divide-line border-y border-line">
                          {group.items.map((item, index) => (
                            <li key={item.id} className="motion-reveal" style={{ "--motion-index": Math.min(index, 8) } as CSSProperties}>
                              <JournalItemView item={item} />
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function JournalFiltersBar({ filters, onChange }: { filters: JournalFilters; onChange: (filters: JournalFilters) => void }) {
  const group: GroupChoice = filters.group ?? "all";
  return (
    <div role="search" aria-label="Search your journal" className="flex flex-col gap-3">
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <Input
          type="search"
          aria-label="Search your journal"
          placeholder="Search your journal"
          className="h-11 pr-11 pl-9 [&::-webkit-search-cancel-button]:hidden"
          value={filters.query}
          onChange={(event) => onChange({ ...filters, query: event.target.value })}
        />
        {filters.query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onChange({ ...filters, query: "" })}
            className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:text-fg"
          >
            <X aria-hidden className="size-4" />
          </button>
        )}
      </div>
      <SegmentedControl<GroupChoice>
        label="Show"
        options={[
          { value: "all", label: "Everything" },
          { value: "entries", label: "Journal" },
          { value: "study", label: "From studying" },
        ]}
        value={group}
        onChange={(value) => onChange({ ...filters, group: value === "all" ? null : value, entryKind: value === "study" ? null : filters.entryKind })}
      />
    </div>
  );
}

/** One piece of writing: what it is and when, the words, and where it was written. Journal entries can be edited. */
function JournalItemView({ item }: { item: JournalItem }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const label = item.source === "entry" ? JOURNAL_ENTRY_KIND_LABELS[item.entry.kind] : JOURNAL_SOURCE_LABELS[item.source];
  const tenderMercy = item.source === "entry" && item.entry.kind === "tender-mercy";

  return (
    <article className="flex flex-col gap-2 py-4">
      <p className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
        <span className={cn("font-semibold", tenderMercy ? "text-sacred-accent" : "text-muted")}>{label}</span>
        <span aria-hidden className="text-muted">
          ·
        </span>
        <time dateTime={item.date} className="text-muted">
          {formatDate(item.date)}
        </time>
      </p>
      {item.title && <p className="font-serif text-[0.9375rem] leading-relaxed text-muted italic">{item.title}</p>}
      {item.source === "entry" && editing ? (
        <EntryEditor item={item} onDone={() => setEditing(false)} />
      ) : (
        <p className="font-serif text-[1.0625rem] leading-relaxed break-words whitespace-pre-line text-fg">{item.text}</p>
      )}
      {!editing && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          {item.href ? (
            <Link href={item.href} className="group inline-flex min-h-11 max-w-full items-center gap-1 text-sm text-accent hover:underline sm:min-h-0 sm:py-1">
              <span className="min-w-0 break-words">
                <span className="text-muted">{item.source === "entry" ? "Written at " : "In "}</span>
                <span className="font-semibold">{item.where}</span>
              </span>
              <ChevronRight aria-hidden className="size-4 shrink-0" />
            </Link>
          ) : (
            <span className="text-sm text-muted">{item.source === "entry" ? "" : item.where}</span>
          )}
          {item.source === "entry" && (
            <span className="flex gap-1">
              <Button variant="link" size="sm" className="h-11 sm:h-8" onClick={() => setEditing(true)}>
                Edit
              </Button>
              <Button variant="ghost" size="sm" className="h-11 sm:h-8" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            </span>
          )}
        </div>
      )}
      {item.source === "entry" && (
        <DeleteEntryDialog open={confirmDelete} id={item.entry.id} onClose={() => setConfirmDelete(false)} />
      )}
    </article>
  );
}

function EntryEditor({ item, onDone }: { item: Extract<JournalItem, { source: "entry" }>; onDone: () => void }) {
  const [text, setText] = useState(item.entry.text);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await getStudyRepository().journal.put(editJournalEntry(item.entry, { text }, new Date()));
      onDone();
    } catch (cause) {
      setError(toStorageError(cause).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        aria-label="Edit your entry"
        rows={Math.min(10, Math.max(3, text.split("\n").length + 1))}
        value={text}
        maxLength={MAX_JOURNAL_TEXT}
        autoFocus
        onChange={(event) => setText(event.target.value)}
        className="w-full resize-y rounded-lg border border-line-strong bg-surface px-3.5 py-3 font-serif text-[1.0625rem] leading-relaxed text-fg focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
      />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button size="sm" className="h-11 sm:h-9" onClick={() => void save()} disabled={!text.trim() || saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button variant="ghost" size="sm" className="h-11 sm:h-9" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function DeleteEntryDialog({ open, id, onClose }: { open: boolean; id: string; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  async function remove() {
    try {
      await getStudyRepository().journal.delete(id);
      onClose();
    } catch (cause) {
      setError(toStorageError(cause).message);
    }
  }
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Delete this entry?"
      description="It’s removed from this device. This can’t be undone."
      footer={
        <>
          <Button variant="secondary" data-autofocus onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => void remove()}>
            Delete
          </Button>
        </>
      }
    >
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </Dialog>
  );
}
