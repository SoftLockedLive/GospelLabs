"use client";

import { BookOpen, FileWarning, NotebookTabs, Search, SearchX, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { StorageErrorState } from "@/components/investigations/storage-error-state";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import { INVESTIGATION_STATUSES, STATUS_LABELS, type Investigation, type InvestigationStatus } from "@/domain/investigation";
import { EMPTY_LIBRARY_FILTERS, filterInvestigations, type LibraryFilters } from "@/domain/library-filters";
import { newInvestigationHref } from "@/lib/routes";
import { useInvestigationList } from "@/persistence/hooks";
import { DeleteInvestigationDialog } from "./delete-investigation-dialog";
import { LibraryItem } from "./library-item";

export function LibraryView() {
  const state = useInvestigationList();
  const [filters, setFilters] = useState<LibraryFilters>(EMPTY_LIBRARY_FILTERS);
  const [pendingDelete, setPendingDelete] = useState<Investigation | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const summaryRef = useRef<HTMLParagraphElement>(null);

  const investigations = useMemo(() => (state.status === "ready" ? state.value.investigations : []), [state]);
  const results = useMemo(() => filterInvestigations(investigations, filters), [investigations, filters]);

  if (state.status === "loading") return <LibrarySkeleton />;
  if (state.status === "error") return <StorageErrorState error={state.error} />;

  const { unreadable } = state.value;
  const filtered = filters.query.trim() !== "" || filters.status !== null;

  return (
    <div className="flex flex-col gap-6">
      {unreadable > 0 && (
        <p role="status" className="flex items-start gap-2 rounded-lg border border-amber/40 bg-amber-soft px-4 py-3 text-sm text-fg">
          <FileWarning aria-hidden className="mt-0.5 size-4 shrink-0 text-amber" />
          {unreadable === 1 ? "One saved research notebook" : `${unreadable} saved research notebooks`} couldn&rsquo;t be read
          and {unreadable === 1 ? "isn’t" : "aren’t"} shown. {unreadable === 1 ? "It hasn’t" : "They haven’t"} been
          deleted.
        </p>
      )}

      {investigations.length === 0 ? (
        <EmptyState
          icon={NotebookTabs}
          title="No research notebooks yet"
          description="Start with a question of your own, or pick one from the Question Bank. Everything you write is saved on this device."
          action={
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={newInvestigationHref()}>
                <NotebookTabs aria-hidden />
                New research notebook
              </ButtonLink>
              <ButtonLink href="/questions" variant="secondary">
                <BookOpen aria-hidden />
                Browse the Question Bank
              </ButtonLink>
            </div>
          }
          className="bg-surface"
        />
      ) : (
        <>
          <div
            role="search"
            aria-label="Filter research notebooks"
            className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3 sm:flex-row sm:items-center"
          >
            <div className="relative flex-1">
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
              <Input
                type="search"
                aria-label="Search research notebooks"
                placeholder="Search titles, questions, or evidence"
                className="pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
                value={filters.query}
                onChange={(event) => setFilters((f) => ({ ...f, query: event.target.value }))}
              />
              {filters.query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setFilters((f) => ({ ...f, query: "" }))}
                  className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-subtle hover:text-fg"
                >
                  <X aria-hidden className="size-4" />
                </button>
              )}
            </div>
            <Select
              aria-label="Status"
              className="sm:w-52"
              value={filters.status ?? ""}
              onChange={(event) =>
                setFilters((f) => ({ ...f, status: (event.target.value || null) as InvestigationStatus | null }))
              }
            >
              <option value="">All statuses</option>
              {INVESTIGATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex min-h-8 items-center justify-between gap-3">
            <p ref={summaryRef} tabIndex={-1} aria-live="polite" className="text-sm text-muted focus:outline-none">
              {filtered
                ? `${results.length} of ${investigations.length} notebooks match`
                : `${investigations.length} ${investigations.length === 1 ? "research notebook" : "research notebooks"}`}
              <span className="sr-only">{announcement}</span>
            </p>
            {filtered && (
              <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_LIBRARY_FILTERS)}>
                Clear filters
              </Button>
            )}
          </div>

          {results.length === 0 ? (
            <EmptyState icon={SearchX} title="No notebooks match" description="Try different words or another status." />
          ) : (
            <ul className="flex flex-col gap-3">
              {results.map((investigation) => (
                <li key={investigation.id}>
                  <LibraryItem investigation={investigation} onDelete={() => setPendingDelete(investigation)} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <DeleteInvestigationDialog
        investigation={pendingDelete}
        onClose={() => setPendingDelete(null)}
        onDeleted={(deleted) => {
          setPendingDelete(null);
          setAnnouncement(` · Deleted “${deleted.title.trim() || "Untitled notebook"}”`);
          // The button that opened the dialog is gone; keep focus on the list summary.
          requestAnimationFrame(() => summaryRef.current?.focus());
        }}
      />
    </div>
  );
}

function LibrarySkeleton() {
  return (
    <div role="status" aria-label="Loading research notebooks" className="flex animate-pulse flex-col gap-3">
      <div className="h-16 rounded-xl bg-surface" />
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="h-40 rounded-xl border border-line bg-surface" />
      ))}
    </div>
  );
}
