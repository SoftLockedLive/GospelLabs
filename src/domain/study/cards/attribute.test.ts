import { describe, expect, it } from "vitest";
import { attributeLinksFor } from "../character";
import { attributeSchema, sourceSchema, type Source } from "../content-schema";
import { discoveryCardSchema, type DiscoveryCard } from "../user-data";
import type { NodeRef } from "../vocabulary";
import { attributeCardNodeRefs, attributeDiscoveryCard, findAttributeCard } from "./attribute";

const scripture = (id: string, label: string): Source =>
  sourceSchema.parse({ id, kind: "scripture", label, url: `https://www.churchofjesuschrist.org/study/scriptures/${id}?lang=eng` });

const SOURCES: Record<string, Source> = {
  def: sourceSchema.parse({ id: "def", kind: "official", label: "Guide to the Scriptures: Meek", url: "https://www.churchofjesuschrist.org/study/scriptures/gs/meek-meekness?lang=eng" }),
  s1: scripture("s1", "Doctrine and Covenants 121:41"),
  s2: scripture("s2", "Matthew 11:29"),
  s3: scripture("s3", "Moroni 7:44"),
  s4: scripture("s4", "2 Timothy 2:24"),
};

const MEEKNESS = attributeSchema.parse({
  id: "meekness",
  status: "ready",
  name: "Meekness",
  summary: "A summary.",
  definition: { text: "The definition.", sourceIds: ["def"] },
  vocabulary: [
    { id: "meekness-gentle", term: "Gentle", meaning: "Kind and mild." },
    { id: "meekness-self-restraint", term: "Self-restraint", meaning: "Holding back." },
    { id: "meekness-receptive", term: "Receptive", meaning: "Open to learning." },
  ],
  scriptures: [
    { sourceId: "s1", note: "Note." },
    { sourceId: "s2", note: "Note." },
  ],
  saviorExamples: [
    { id: "meek-and-lowly", title: "Meek and lowly", sourceId: "s2", note: "He described Himself as meek." },
    { id: "second", title: "Second", sourceId: "s4", note: "Another example." },
  ],
  relationships: [{ attributeId: "long-suffering", relation: "relates-to", note: "Named together.", sourceIds: ["s1"] }],
  activities: [
    {
      type: "vocab-match",
      id: "meekness-vocab",
      prompt: "Match.",
      sourceIds: ["s4"],
      hints: ["Hint."],
      explanation: "Why.",
      pairs: [
        { id: "meekness-gentle", term: "Gentle", meaning: "Kind and mild" },
        { id: "meekness-self-restraint", term: "Self-restraint", meaning: "Holding back" },
      ],
    },
    {
      type: "highlight",
      id: "meekness-highlight",
      prompt: "Tap.",
      sourceIds: [],
      hints: ["Hint."],
      explanation: "Why.",
      passage: "s1",
      chunks: [
        { verse: 41, text: "by long-suffering," },
        { verse: 41, text: "by gentleness and meekness," },
      ],
      targets: [1],
    },
  ],
  sources: Object.values(SOURCES),
  review: { status: "verified" },
});

const CHARITY = { id: "charity", relationships: [{ attributeId: "meekness", relation: "leads-to" as const, note: "Meek and lowly must needs have charity.", sourceIds: ["s3"] }] };
const LINKS = attributeLinksFor([MEEKNESS, CHARITY], "meekness");

const LABELS: Record<string, string> = {
  "attribute:meekness": "Meekness",
  "attribute:long-suffering": "Long-suffering",
  "attribute:charity": "Charity",
  "vocabulary:meekness-gentle": "Gentle",
  "vocabulary:meekness-self-restraint": "Self-restraint",
  "vocabulary:meekness-receptive": "Receptive",
  "scripture:s2": "Matthew 11:29",
  "scripture:s4": "2 Timothy 2:24",
};
const labelFor = (ref: NodeRef) => LABELS[ref] ?? ref;

const NOW = new Date("2026-10-26T12:00:00.000Z");
const LATER = new Date("2026-10-27T08:30:00.000Z");

const build = (overrides: Partial<Parameters<typeof attributeDiscoveryCard>[0]> = {}) =>
  attributeDiscoveryCard({ attribute: MEEKNESS, links: LINKS, sources: SOURCES, labelFor, id: "card-1", now: NOW, ...overrides });

const conceptFlags = (card: DiscoveryCard) => Object.fromEntries(card.concepts.map((concept) => [concept.ref, concept.demonstrated]));
const provenance = (card: DiscoveryCard) => Object.fromEntries(card.connections.map((connection) => [connection.id, connection.provenance]));

describe("attributeDiscoveryCard", () => {
  it("creates a valid card for the attribute with suggested connections", () => {
    const card = build({ exploration: { vocabulary: ["meekness-receptive"], completedActivities: [] } });
    expect(discoveryCardSchema.parse(card)).toEqual(card);
    expect(card).toMatchObject({
      id: "card-1",
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
      origin: { kind: "attribute", contentId: "meekness" },
      title: "Meekness",
      summary: "The definition.",
      notes: "",
      highlights: [],
    });
    expect(conceptFlags(card)).toEqual({ "attribute:meekness": false, "vocabulary:meekness-receptive": false });
    expect(provenance(card)).toEqual({
      "attribute:meekness|relates-to|attribute:long-suffering": "suggested",
      "attribute:charity|leads-to|attribute:meekness": "suggested",
      "scripture:s2|illustrates|attribute:meekness": "suggested",
      "scripture:s4|illustrates|attribute:meekness": "suggested",
    });
    const inbound = card.connections.find((connection) => connection.from.ref === "attribute:charity");
    expect(inbound).toMatchObject({ to: { ref: "attribute:meekness", label: "Meekness" }, relation: "leads-to", sourceIds: ["s3"] });
  });

  it("marks matched words and the attribute demonstrated when the learner matched them correctly", () => {
    const card = build({
      exploration: { vocabulary: [], completedActivities: ["meekness-vocab"] },
      outcomes: { "meekness-vocab": { demonstrated: true } },
    });
    expect(conceptFlags(card)).toEqual({
      "attribute:meekness": true,
      "vocabulary:meekness-gentle": true,
      "vocabulary:meekness-self-restraint": true,
    });
    // The vocab-match evidence (s4) is also a Savior example's source.
    expect(provenance(card)["scripture:s4|illustrates|attribute:meekness"]).toBe("demonstrated");
    expect(provenance(card)["scripture:s2|illustrates|attribute:meekness"]).toBe("suggested");
  });

  it("records revealed answers as explored but not demonstrated", () => {
    const card = build({ outcomes: { "meekness-vocab": { demonstrated: false } } });
    expect(conceptFlags(card)).toEqual({
      "attribute:meekness": false,
      "vocabulary:meekness-gentle": false,
      "vocabulary:meekness-self-restraint": false,
    });
    expect(Object.values(provenance(card)).every((value) => value === "suggested")).toBe(true);
  });

  it("demonstrates a relationship when a worked-out activity used its evidence", () => {
    const card = build({ outcomes: { "meekness-highlight": { demonstrated: true } } });
    expect(provenance(card)["attribute:meekness|relates-to|attribute:long-suffering"]).toBe("demonstrated");
    expect(provenance(card)["attribute:charity|leads-to|attribute:meekness"]).toBe("suggested");
  });

  it("cites the definition, finished activities, and every connection's sources once each", () => {
    const card = build({ outcomes: { "meekness-highlight": { demonstrated: true } } });
    expect(card.sources.map((source) => source.id)).toEqual(["def", "s1", "s3", "s2", "s4"]);
    expect(card.sources[0]).toEqual({ id: "def", label: "Guide to the Scriptures: Meek", kind: "official", url: SOURCES.def.url });
  });

  it("updates the existing card without losing notes, highlights, unknown fields, or demonstrated work", () => {
    const first = build({
      exploration: { vocabulary: [], completedActivities: ["meekness-vocab"] },
      outcomes: { "meekness-vocab": { demonstrated: true } },
    });
    const saved = {
      ...first,
      notes: "My own notes",
      highlights: [{ sourceId: "s1", verse: 41, text: "by long-suffering", note: "" }],
      futureField: { kept: true },
    } as DiscoveryCard;
    const updated = build({
      existing: saved,
      id: "ignored-new-id",
      now: LATER,
      exploration: { vocabulary: ["meekness-receptive"], completedActivities: ["meekness-vocab", "meekness-highlight"] },
      outcomes: { "meekness-highlight": { demonstrated: false } },
    });
    expect(updated.id).toBe("card-1");
    expect(updated.createdAt).toBe(NOW.toISOString());
    expect(updated.updatedAt).toBe(LATER.toISOString());
    expect(updated.notes).toBe("My own notes");
    expect(updated.highlights).toEqual(saved.highlights);
    expect((updated as Record<string, unknown>).futureField).toEqual({ kept: true });
    expect(conceptFlags(updated)).toEqual({
      "attribute:meekness": true,
      "vocabulary:meekness-gentle": true,
      "vocabulary:meekness-self-restraint": true,
      "vocabulary:meekness-receptive": false,
    });
    expect(provenance(updated)["scripture:s4|illustrates|attribute:meekness"]).toBe("demonstrated");
  });

  it("keeps the private note from the attribute's page on the card, as the note grows", () => {
    const exploration = { vocabulary: [], completedActivities: [], note: "I want to be gentle with my kids." };
    const first = build({ exploration });
    expect(first.notes).toBe("I want to be gentle with my kids.");
    // Notes written on the card stay; the page's note, extended since, replaces its earlier copy.
    const saved = { ...first, notes: `${first.notes}\n\nAdded in the Notebook.` };
    const grown = build({ existing: saved, now: LATER, exploration: { ...exploration, note: "I want to be gentle with my kids, even when I’m tired." } });
    expect(grown.notes).toBe("I want to be gentle with my kids, even when I’m tired.\n\nAdded in the Notebook.");
  });
});

describe("findAttributeCard", () => {
  it("finds the most recently updated card from this attribute", () => {
    const cards = [
      { id: "a", origin: { kind: "attribute" as const, contentId: "meekness" }, updatedAt: "2026-01-01T00:00:00.000Z" },
      { id: "b", origin: { kind: "passage" as const, contentId: "meekness" }, updatedAt: "2026-03-01T00:00:00.000Z" },
      { id: "c", origin: { kind: "attribute" as const, contentId: "meekness" }, updatedAt: "2026-02-01T00:00:00.000Z" },
      { id: "d", origin: { kind: "attribute" as const, contentId: "charity" }, updatedAt: "2026-04-01T00:00:00.000Z" },
    ];
    expect(findAttributeCard(cards, "meekness")?.id).toBe("c");
    expect(findAttributeCard(cards, "mercy")).toBeUndefined();
  });
});

describe("attributeCardNodeRefs", () => {
  it("lists every node the card can name", () => {
    expect(attributeCardNodeRefs(MEEKNESS, LINKS).sort()).toEqual(
      [
        "attribute:charity",
        "attribute:long-suffering",
        "attribute:meekness",
        "scripture:s2",
        "scripture:s4",
        "vocabulary:meekness-gentle",
        "vocabulary:meekness-receptive",
        "vocabulary:meekness-self-restraint",
      ].sort(),
    );
  });
});
