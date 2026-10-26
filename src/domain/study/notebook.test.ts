import { describe, expect, it } from "vitest";
import { createInvestigation } from "../investigation-factory";
import type { Investigation } from "../investigation";
import {
  cardSearchText,
  conceptOptions,
  EMPTY_NOTEBOOK_FILTERS,
  filterCards,
  groupCardsByMonth,
  hasActiveFilters,
  normalizeText,
  originOptions,
  researchDiscoveries,
  searchTerms,
  sortCards,
  sourceKindOptions,
  splitConcepts,
} from "./notebook";
import { discoveryCardSchema, type DiscoveryCard } from "./user-data";

function card(overrides: Partial<DiscoveryCard> & { id: string; createdAt: string }): DiscoveryCard {
  return discoveryCardSchema.parse({
    updatedAt: overrides.createdAt,
    origin: { kind: "investigation", contentId: "sample" },
    title: "A discovery",
    ...overrides,
  });
}

const succor = card({
  id: "succor",
  createdAt: "2026-09-28T09:00:00.000Z",
  title: "He knows how to help",
  question: "Why did Jesus Christ take upon Him our pains?",
  summary: "Alma teaches that the Savior suffered so He would know how to succor His people.",
  sources: [{ id: "alma-7-11-12", label: "Alma 7:11–12", kind: "scripture", url: "https://www.churchofjesuschrist.org/x" }],
  concepts: [
    { ref: "concept:atonement", label: "Atonement", demonstrated: true },
    { ref: "vocabulary:succor", label: "Succor", demonstrated: false },
  ],
  notes: "Remember this when I feel alone.",
});

const prodigal = card({
  id: "prodigal",
  createdAt: "2026-10-12T15:30:00.000Z",
  origin: { kind: "passage", contentId: "the-prodigal-son" },
  title: "The Prodigal Son",
  sources: [
    { id: "luke-15-11-32", label: "Luke 15:11–32", kind: "scripture" },
    { id: "talk-mercy", label: "“The Father’s Welcome”", kind: "speaker" },
  ],
  concepts: [{ ref: "concept:atonement", label: "Atonement", demonstrated: false }],
  highlights: [{ sourceId: "luke-15-11-32", verse: 20, text: "had compassion, and ran", note: "He ran!" }],
});

const charity = card({
  id: "charity",
  createdAt: "2026-10-20T08:00:00.000Z",
  origin: { kind: "attribute", contentId: "charity" },
  title: "Charity",
  concepts: [{ ref: "attribute:charity", label: "Charity", demonstrated: true }],
  connections: [
    {
      id: "c1",
      from: { ref: "scripture:moroni-7-47", label: "Moroni 7:47" },
      to: { ref: "attribute:charity", label: "Charity" },
      relation: "teaches",
      sourceIds: ["moroni-7-47"],
      note: "Charity is the pure love of Christ.",
      provenance: "demonstrated",
    },
  ],
});

const cards = [succor, prodigal, charity];

describe("search", () => {
  it("normalizes case, accents, quotes, and dashes", () => {
    expect(normalizeText("Éxpérience “Faith” – Alma’s")).toBe("experience \"faith\" - alma's");
    expect(searchTerms('  "Succor"   His  people ')).toEqual(["succor", "his", "people"]);
  });

  it("indexes title, question, summary, concepts, sources, connections, highlights, and notes", () => {
    const text = cardSearchText(prodigal);
    expect(text).toContain("prodigal");
    expect(text).toContain("luke 15:11-32");
    expect(text).toContain("had compassion");
    expect(text).toContain("he ran!");
    expect(cardSearchText(succor)).toContain("feel alone");
    expect(cardSearchText(charity)).toContain("pure love");
  });

  it("requires every word to match", () => {
    expect(filterCards(cards, { ...EMPTY_NOTEBOOK_FILTERS, query: "alma succor" }).map((c) => c.id)).toEqual(["succor"]);
    expect(filterCards(cards, { ...EMPTY_NOTEBOOK_FILTERS, query: "alma prodigal" })).toEqual([]);
    expect(filterCards(cards, { ...EMPTY_NOTEBOOK_FILTERS, query: "ATONEMENT" }).map((c) => c.id)).toEqual(["prodigal", "succor"]);
  });
});

describe("filters", () => {
  it("lists newest first by default, or oldest first", () => {
    expect(filterCards(cards, EMPTY_NOTEBOOK_FILTERS).map((c) => c.id)).toEqual(["charity", "prodigal", "succor"]);
    expect(sortCards(cards, "oldest").map((c) => c.id)).toEqual(["succor", "prodigal", "charity"]);
  });

  it("filters by origin, concept, and source kind together", () => {
    expect(filterCards(cards, { ...EMPTY_NOTEBOOK_FILTERS, origin: "passage" }).map((c) => c.id)).toEqual(["prodigal"]);
    expect(filterCards(cards, { ...EMPTY_NOTEBOOK_FILTERS, concept: "concept:atonement" }).map((c) => c.id)).toEqual(["prodigal", "succor"]);
    expect(filterCards(cards, { ...EMPTY_NOTEBOOK_FILTERS, sourceKind: "speaker" }).map((c) => c.id)).toEqual(["prodigal"]);
    expect(filterCards(cards, { ...EMPTY_NOTEBOOK_FILTERS, origin: "investigation", concept: "concept:atonement", sourceKind: "speaker" })).toEqual([]);
  });

  it("knows when the list is narrowed", () => {
    expect(hasActiveFilters(EMPTY_NOTEBOOK_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_NOTEBOOK_FILTERS, sort: "oldest" })).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_NOTEBOOK_FILTERS, query: " " })).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_NOTEBOOK_FILTERS, sourceKind: "scripture" })).toBe(true);
  });

  it("offers only the origins, concepts, and source kinds present, with counts", () => {
    expect(originOptions(cards).map((o) => [o.value, o.count])).toEqual([
      ["investigation", 1],
      ["passage", 1],
      ["attribute", 1],
    ]);
    expect(conceptOptions(cards).map((o) => [o.value, o.label, o.count])).toEqual([
      ["concept:atonement", "Atonement", 2],
      ["attribute:charity", "Charity (Christlike attribute)", 1],
      ["vocabulary:succor", "Succor (Vocabulary)", 1],
    ]);
    expect(sourceKindOptions(cards).map((o) => [o.value, o.label, o.count])).toEqual([
      ["scripture", "Scripture", 2],
      ["speaker", "Speaker's teaching", 1],
    ]);
  });
});

describe("grouping and contents", () => {
  it("groups sorted cards by month (UTC), keeping order", () => {
    const groups = groupCardsByMonth(sortCards(cards));
    expect(groups.map((g) => [g.key, g.label, g.cards.map((c) => c.id)])).toEqual([
      ["2026-10", "October 2026", ["charity", "prodigal"]],
      ["2026-09", "September 2026", ["succor"]],
    ]);
  });

  it("separates discovered concepts from suggested ones", () => {
    const { discovered, suggested } = splitConcepts(succor);
    expect(discovered.map((c) => c.label)).toEqual(["Atonement"]);
    expect(suggested.map((c) => c.label)).toEqual(["Succor"]);
  });
});

describe("researchDiscoveries", () => {
  function research(id: string, title: string, highlights: Array<{ id: string; title: string; insight: string; createdAt: string }>): Investigation {
    const base = createInvestigation({ id, now: "2026-09-01T00:00:00.000Z" });
    return {
      ...base,
      title,
      discoveryHighlights: highlights.map((h) => ({ ...h, evidenceIds: [], updatedAt: h.createdAt })),
    };
  }

  const investigations = [
    research("inv-1", "Faith and works", [
      { id: "h1", title: "Faith acts", insight: "James 2 shows faith moves us to act.", createdAt: "2026-09-02T00:00:00.000Z" },
      { id: "h2", title: "", insight: "", createdAt: "2026-09-03T00:00:00.000Z" },
    ]),
    research("inv-2", "", [{ id: "h3", title: "Grace is enabling", insight: "", createdAt: "2026-09-05T00:00:00.000Z" }]),
  ];

  it("lists saved discoveries newest first, skipping empty ones", () => {
    expect(researchDiscoveries(investigations).map((d) => [d.highlight.id, d.investigationTitle])).toEqual([
      ["h3", "Untitled investigation"],
      ["h1", "Faith and works"],
    ]);
  });

  it("matches a search against the discovery and its investigation", () => {
    expect(researchDiscoveries(investigations, "james").map((d) => d.highlight.id)).toEqual(["h1"]);
    expect(researchDiscoveries(investigations, "works faith").map((d) => d.highlight.id)).toEqual(["h1"]);
    expect(researchDiscoveries(investigations, "nothing-like-this")).toEqual([]);
  });
});
