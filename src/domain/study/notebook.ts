/**
 * Discovery Notebook logic: searching, filtering, sorting, and grouping
 * Discovery Cards, plus the read-only list of discoveries saved in 1.x
 * research notebooks. Pure functions, so the Notebook UI stays thin.
 */
import type { DiscoveryHighlight, Investigation } from "../investigation";
import { DISCOVERY_ORIGINS, type DiscoveryCard, type DiscoveryOrigin } from "./user-data";
import { NODE_KIND_LABELS, parseNodeRef, SOURCE_KIND_LABELS, SOURCE_KINDS, type NodeRef, type SourceKind } from "./vocabulary";

export const ORIGIN_LABELS: Record<DiscoveryOrigin, string> = {
  investigation: "Investigation",
  passage: "Scripture Explorer",
  attribute: "Character of Christ",
  connect: "Connect with Christ",
};

export type NotebookSort = "newest" | "oldest";

export interface NotebookFilters {
  query: string;
  origin: DiscoveryOrigin | null;
  /** A node ref from the cards' concepts. */
  concept: NodeRef | null;
  sourceKind: SourceKind | null;
  sort: NotebookSort;
}

export const EMPTY_NOTEBOOK_FILTERS: NotebookFilters = { query: "", origin: null, concept: null, sourceKind: null, sort: "newest" };

/** True when anything other than the sort order narrows the list. */
export const hasActiveFilters = (filters: NotebookFilters) =>
  filters.query.trim() !== "" || filters.origin !== null || filters.concept !== null || filters.sourceKind !== null;

// --- Search ------------------------------------------------------------------------

/** Lowercases and strips accents, and treats curly quotes and dashes like plain ones. */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-");
}

/** The words of a search, normalized. Every word must match somewhere. */
export function searchTerms(query: string): string[] {
  return normalizeText(query)
    .split(/\s+/)
    .map((term) => term.replace(/^["']+|["']+$/g, ""))
    .filter(Boolean);
}

/** Everything about a card a learner might search for. */
export function cardSearchText(card: DiscoveryCard): string {
  return normalizeText(
    [
      card.title,
      card.question ?? "",
      card.summary,
      ORIGIN_LABELS[card.origin.kind],
      ...card.concepts.map((concept) => concept.label),
      ...card.sources.map((source) => source.label),
      ...card.connections.flatMap((connection) => [connection.from.label, connection.to.label, connection.note]),
      ...card.highlights.flatMap((highlight) => [highlight.text, highlight.note]),
      card.notes,
    ].join("\n"),
  );
}

export function matchesTerms(text: string, terms: readonly string[]): boolean {
  return terms.every((term) => text.includes(term));
}

// --- Filter and sort ------------------------------------------------------------------

const createdTime = (card: Pick<DiscoveryCard, "createdAt">) => {
  const value = Date.parse(card.createdAt);
  return Number.isFinite(value) ? value : 0;
};

export function sortCards(cards: readonly DiscoveryCard[], sort: NotebookSort = "newest"): DiscoveryCard[] {
  const direction = sort === "newest" ? -1 : 1;
  return [...cards].sort((a, b) => direction * (createdTime(a) - createdTime(b)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function filterCards(cards: readonly DiscoveryCard[], filters: NotebookFilters): DiscoveryCard[] {
  const terms = searchTerms(filters.query);
  return sortCards(
    cards.filter(
      (card) =>
        (!filters.origin || card.origin.kind === filters.origin) &&
        (!filters.concept || card.concepts.some((concept) => concept.ref === filters.concept)) &&
        (!filters.sourceKind || card.sources.some((source) => source.kind === filters.sourceKind)) &&
        (terms.length === 0 || matchesTerms(cardSearchText(card), terms)),
    ),
    filters.sort,
  );
}

// --- Filter options ---------------------------------------------------------------------

export interface FilterOption<T extends string> {
  value: T;
  label: string;
  count: number;
}

/** Origins present in the cards, in the standard order. */
export function originOptions(cards: readonly DiscoveryCard[]): FilterOption<DiscoveryOrigin>[] {
  return DISCOVERY_ORIGINS.map((origin) => ({
    value: origin,
    label: ORIGIN_LABELS[origin],
    count: cards.filter((card) => card.origin.kind === origin).length,
  })).filter((option) => option.count > 0);
}

/** Concepts (and other learned nodes) across the cards, alphabetically, labeled from the newest card. */
export function conceptOptions(cards: readonly DiscoveryCard[]): FilterOption<NodeRef>[] {
  const options = new Map<NodeRef, { label: string; count: number }>();
  for (const card of sortCards(cards, "oldest")) {
    const seen = new Set<NodeRef>();
    for (const concept of card.concepts) {
      if (seen.has(concept.ref)) continue;
      seen.add(concept.ref);
      const existing = options.get(concept.ref);
      options.set(concept.ref, { label: concept.label, count: (existing?.count ?? 0) + 1 });
    }
  }
  return [...options]
    .map(([value, { label, count }]) => {
      const kind = parseNodeRef(value)?.kind;
      // Name the kind when it isn't a gospel concept, so "Mercy (Christlike attribute)" reads clearly.
      const suffix = kind && kind !== "concept" ? ` (${NODE_KIND_LABELS[kind]})` : "";
      return { value, label: `${label}${suffix}`, count };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "en", { sensitivity: "base" }) || (a.value < b.value ? -1 : 1));
}

/** Source kinds cited by the cards, in the standard order. */
export function sourceKindOptions(cards: readonly DiscoveryCard[]): FilterOption<SourceKind>[] {
  return SOURCE_KINDS.map((kind) => ({
    value: kind,
    label: SOURCE_KIND_LABELS[kind],
    count: cards.filter((card) => card.sources.some((source) => source.kind === kind)).length,
  })).filter((option) => option.count > 0);
}

// --- Grouping -----------------------------------------------------------------------------

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

export interface CardGroup {
  /** "YYYY-MM" (UTC), or "undated". */
  key: string;
  label: string;
  cards: DiscoveryCard[];
}

/** Groups already-sorted cards by the month they were made, keeping their order. */
export function groupCardsByMonth(cards: readonly DiscoveryCard[]): CardGroup[] {
  const groups: CardGroup[] = [];
  for (const card of cards) {
    const time = Date.parse(card.createdAt);
    const date = Number.isFinite(time) ? new Date(time) : null;
    const key = date ? `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}` : "undated";
    const last = groups.at(-1);
    if (last?.key === key) last.cards.push(card);
    else groups.push({ key, label: date ? monthFormatter.format(date) : "Undated", cards: [card] });
  }
  return groups;
}

// --- Card contents ---------------------------------------------------------------------------

/** A card's concepts, split into what the learner discovered and what Gospel Labs suggested. */
export function splitConcepts(card: Pick<DiscoveryCard, "concepts">) {
  return {
    discovered: card.concepts.filter((concept) => concept.demonstrated),
    suggested: card.concepts.filter((concept) => !concept.demonstrated),
  };
}

// --- 1.x research discoveries -------------------------------------------------------------------

export interface ResearchDiscovery {
  investigationId: string;
  investigationTitle: string;
  highlight: DiscoveryHighlight;
}

/** Discoveries saved inside 1.x research notebooks, newest first, optionally matching a search. */
export function researchDiscoveries(investigations: readonly Investigation[], query = ""): ResearchDiscovery[] {
  const terms = searchTerms(query);
  const entries: ResearchDiscovery[] = [];
  for (const investigation of investigations) {
    const investigationTitle = investigation.title.trim() || investigation.question.trim() || "Untitled investigation";
    for (const highlight of investigation.discoveryHighlights) {
      if (!highlight.title.trim() && !highlight.insight.trim()) continue;
      if (terms.length && !matchesTerms(normalizeText([highlight.title, highlight.insight, investigationTitle].join("\n")), terms)) continue;
      entries.push({ investigationId: investigation.id, investigationTitle, highlight });
    }
  }
  return entries.sort(
    (a, b) =>
      Date.parse(b.highlight.createdAt) - Date.parse(a.highlight.createdAt) ||
      (a.highlight.id < b.highlight.id ? -1 : a.highlight.id > b.highlight.id ? 1 : 0),
  );
}
