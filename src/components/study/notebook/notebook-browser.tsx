"use client";

import { BookOpenText, Compass, FileWarning, Library, NotebookPen, Search, SearchX, X } from "lucide-react";
import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { StorageErrorState } from "@/components/investigations/storage-error-state";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import {
  conceptOptions,
  EMPTY_NOTEBOOK_FILTERS,
  filterCards,
  groupCardsByMonth,
  hasActiveFilters,
  originOptions,
  researchDiscoveries,
  sourceKindOptions,
  type NotebookFilters,
  type NotebookSort,
} from "@/domain/study/notebook";
import type { DiscoveryOrigin } from "@/domain/study/user-data";
import type { NodeRef, SourceKind } from "@/domain/study/vocabulary";
import { explorerHref, investigateHref } from "@/lib/routes";
import { useInvestigationList } from "@/persistence/hooks";
import { useDiscoveryCards } from "@/persistence/study-hooks";
import { cardLinkId, DiscoveryCardItem } from "./discovery-card-item";
import { NOTEBOOK_SCROLL_KEY, ResearchDiscoveries } from "./research-discoveries";

interface NotebookBrowserProps {
  filters: NotebookFilters;
  onFiltersChange: (change: (filters: NotebookFilters) => NotebookFilters) => void;
  /** When returning from a card, the card whose link should get focus back. */
  returnFocusTo: string | null;
  /** A message about the last action (e.g. a deletion), announced with the result count. */
  announcement?: string;
}

export function NotebookBrowser({ filters, onFiltersChange, returnFocusTo, announcement }: NotebookBrowserProps) {
  const cardsState = useDiscoveryCards();
  const researchState = useInvestigationList();

  const cards = useMemo(() => (cardsState.status === "ready" ? cardsState.value.records : []), [cardsState]);
  const results = useMemo(() => filterCards(cards, filters), [cards, filters]);
  const groups = useMemo(() => groupCardsByMonth(results), [results]);
  const options = useMemo(
    () => ({ origins: originOptions(cards), concepts: conceptOptions(cards), sourceKinds: sourceKindOptions(cards) }),
    [cards],
  );
  const investigations = useMemo(() => (researchState.status === "ready" ? researchState.value.investigations : []), [researchState]);
  const allResearch = useMemo(() => researchDiscoveries(investigations), [investigations]);
  const research = useMemo(() => researchDiscoveries(investigations, filters.query), [investigations, filters.query]);
  const summaryRef = useRef<HTMLParagraphElement>(null);

  // Coming back from a card: focus its link again, or the list summary if it was deleted.
  useEffect(() => {
    if (!returnFocusTo) return;
    const target = document.getElementById(cardLinkId(returnFocusTo)) ?? summaryRef.current ?? document.getElementById("main");
    target?.focus();
  }, [returnFocusTo]);

  // Back from a research notebook opened here: return to where the learner was, once the list has loaded
  // (the browser restores scroll before it has). Only shortly after leaving, so a later visit starts at the top.
  const loaded = cardsState.status !== "loading" && researchState.status !== "loading";
  useEffect(() => {
    if (!loaded) return;
    let saved: { y?: unknown; at?: unknown } | null = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(NOTEBOOK_SCROLL_KEY) ?? "null");
      sessionStorage.removeItem(NOTEBOOK_SCROLL_KEY);
    } catch {
      saved = null;
    }
    if (saved && typeof saved.y === "number" && typeof saved.at === "number" && Date.now() - saved.at < 30 * 60_000) {
      window.scrollTo({ top: saved.y });
    }
  }, [loaded]);

  const header = (
    <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-muted">
      Each investigation you finish adds a Discovery Card here. In Scripture Explorer, Character of Christ, and Connect with
      Christ, choose Save to add one.
    </p>
  );

  // Wait for research notebooks too: deciding on the empty state before they load flashed the wrong one.
  if (cardsState.status === "loading" || researchState.status === "loading") {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <NotebookSkeleton />
      </div>
    );
  }
  if (cardsState.status === "error") {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <StorageErrorState error={cardsState.error} />
      </div>
    );
  }

  const { unreadable } = cardsState.value;
  const narrowed = hasActiveFilters(filters);
  const structuredFilter = filters.origin !== null || filters.concept !== null || filters.sourceKind !== null;
  const setFilter = <K extends keyof NotebookFilters>(key: K, value: NotebookFilters[K]) =>
    onFiltersChange((current) => ({ ...current, [key]: value }));

  if (cards.length === 0 && allResearch.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <NotebookEmptyState hasResearchNotebooks={investigations.length > 0} />
      </div>
    );
  }

  const searchBox = (
    <div className="relative">
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
      <Input
        type="search"
        aria-label="Search discoveries"
        placeholder="Search your discoveries"
        className="h-11 pr-11 pl-9 [&::-webkit-search-cancel-button]:hidden"
        value={filters.query}
        onChange={(event) => setFilter("query", event.target.value)}
      />
      {filters.query && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => setFilter("query", "")}
          className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-subtle hover:text-fg"
        >
          <X aria-hidden className="size-4" />
        </button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      {header}

      {unreadable > 0 && (
        <p role="status" className="flex items-start gap-2 rounded-lg border border-amber/40 bg-amber-soft px-4 py-3 text-sm text-fg">
          <FileWarning aria-hidden className="mt-0.5 size-4 shrink-0 text-amber" />
          {unreadable === 1 ? "One saved Discovery Card" : `${unreadable} saved Discovery Cards`} couldn&rsquo;t be read and{" "}
          {unreadable === 1 ? "isn’t" : "aren’t"} shown. {unreadable === 1 ? "It hasn’t" : "They haven’t"} been deleted.
        </p>
      )}

      {cards.length === 0 ? (
        <div className="flex flex-col gap-4">
          <NoCardsYet />
          <div role="search" aria-label="Search your saved insights">
            {searchBox}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div role="search" aria-label="Search and filter discoveries" className="flex flex-col gap-3">
            {searchBox}
            <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
              <Select
                aria-label="Where it came from"
                className="h-11"
                value={filters.origin ?? ""}
                onChange={(event) => setFilter("origin", (event.target.value || null) as DiscoveryOrigin | null)}
              >
                <option value="">Everywhere</option>
                {options.origins.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.count})
                  </option>
                ))}
              </Select>
              <Select
                aria-label="Concept"
                className="h-11"
                value={filters.concept ?? ""}
                onChange={(event) => setFilter("concept", (event.target.value || null) as NodeRef | null)}
                disabled={options.concepts.length === 0}
              >
                <option value="">All concepts</option>
                {options.concepts.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.count})
                  </option>
                ))}
              </Select>
              <Select
                aria-label="Kind of source"
                className="h-11"
                value={filters.sourceKind ?? ""}
                onChange={(event) => setFilter("sourceKind", (event.target.value || null) as SourceKind | null)}
                disabled={options.sourceKinds.length === 0}
              >
                <option value="">All kinds of sources</option>
                {options.sourceKinds.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.count})
                  </option>
                ))}
              </Select>
              <Select
                aria-label="Order"
                className="h-11"
                value={filters.sort}
                onChange={(event) => setFilter("sort", event.target.value as NotebookSort)}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </Select>
            </div>
          </div>

          <div className="flex min-h-11 items-center justify-between gap-3">
            <p ref={summaryRef} tabIndex={-1} aria-live="polite" className="text-sm text-muted focus:outline-none">
              {narrowed
                ? `${results.length} of ${cards.length} ${cards.length === 1 ? "discovery" : "discoveries"} match`
                : `${cards.length} ${cards.length === 1 ? "discovery" : "discoveries"}`}
              {announcement && <span className="sr-only"> · {announcement}</span>}
            </p>
            {narrowed && (
              <Button variant="ghost" size="sm" className="h-11 sm:h-8" onClick={() => onFiltersChange((current) => ({ ...EMPTY_NOTEBOOK_FILTERS, sort: current.sort }))}>
                Clear filters
              </Button>
            )}
          </div>

          {results.length === 0 ? (
            <EmptyState icon={SearchX} title="No discoveries match" description="Try different words or fewer filters." />
          ) : (
            <div className="flex flex-col gap-8">
              {groups.map((group) => (
                <section key={group.key} aria-labelledby={`notebook-month-${group.key}`} className="flex flex-col gap-3">
                  <h2 id={`notebook-month-${group.key}`} className="kicker text-muted">
                    {group.label}
                  </h2>
                  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {group.cards.map((card, index) => (
                      <li key={card.id} className="motion-reveal min-w-0" style={{ "--motion-index": Math.min(index, 8) } as CSSProperties}>
                        <DiscoveryCardItem card={card} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      {!structuredFilter && allResearch.length > 0 && <ResearchDiscoveries entries={research} searching={filters.query.trim() !== ""} />}
    </div>
  );
}

/** A short note above the research insights when there are no Discovery Cards yet. */
function NoCardsYet() {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface-sunken px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2.5 text-[0.9375rem] leading-relaxed text-muted">
        <NotebookPen aria-hidden className="mt-0.5 size-4 shrink-0" />
        No Discovery Cards yet. Finish an investigation and one is added here.
      </p>
      <ButtonLink href={investigateHref()} variant="secondary" size="sm" className="h-11 shrink-0 sm:h-9">
        <Compass aria-hidden />
        Start an investigation
      </ButtonLink>
    </div>
  );
}

function NotebookEmptyState({ hasResearchNotebooks = false }: { hasResearchNotebooks?: boolean }) {
  return (
    <EmptyState
      icon={NotebookPen}
      headingLevel={2}
      title="Your Notebook grows as you study"
      description="Finish an investigation and a Discovery Card is added here automatically, with what you found and the sources behind it. In Scripture Explorer, Character of Christ, and Connect with Christ, you choose Save to add one. There’s nothing you have to write."
      action={
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href={investigateHref()}>
            <Compass aria-hidden />
            Start an investigation
          </ButtonLink>
          <ButtonLink href={explorerHref()} variant="secondary">
            <BookOpenText aria-hidden />
            Explore scripture
          </ButtonLink>
          {hasResearchNotebooks && (
            <ButtonLink href="/library" variant="ghost">
              <Library aria-hidden />
              Your research notebooks
            </ButtonLink>
          )}
        </div>
      }
    />
  );
}

export function NotebookSkeleton() {
  return (
    <div role="status" aria-label="Loading your discoveries" className="flex animate-pulse flex-col gap-4">
      <div className="h-28 rounded-xl bg-surface" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-44 rounded-xl border border-line bg-surface" />
        ))}
      </div>
    </div>
  );
}
