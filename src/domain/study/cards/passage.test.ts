import { describe, expect, it } from "vitest";
import type { Source } from "../content-schema";
import { addHighlight, newPassageExploration, withActivityState, withHighlights } from "../explorer";
import { SAMPLE_PASSAGE } from "../explorer.test-fixtures";
import { ALMA_7_11_12, JOHN_15_13_15 } from "../test-fixtures";
import { discoveryCardSchema, type DiscoveryCard, type Exploration, type PassageHighlight } from "../user-data";
import { nodeRef, type NodeRef } from "../vocabulary";
import { buildPassageCard, connectionDemonstrated, demonstratedThemes, findPassageCard } from "./passage";

const NOW = "2026-10-26T12:00:00.000Z";
const LATER = "2026-10-27T09:30:00.000Z";

const sources: Record<string, Source> = {
  "alma-7-11-12": ALMA_7_11_12 as unknown as Source,
  "john-15-13-15": JOHN_15_13_15 as unknown as Source,
};
const LABELS: Record<string, string> = {
  "scripture:alma-7-11-12": "Alma 7:11–12",
  "scripture:john-15-13-15": "John 15:13–15",
  "concept:atonement": "Atonement of Jesus Christ",
  "vocabulary:succor": "Succor",
};
const labelFor = (ref: NodeRef) => LABELS[ref] ?? ref;
const themeRef = (id: string) => (id === "succor" ? nodeRef("vocabulary", id) : nodeRef("concept", id));

const highlight = (over: Partial<PassageHighlight> = {}): PassageHighlight => ({
  id: "h1",
  verse: 12,
  start: 47,
  end: 52,
  note: "",
  createdAt: NOW,
  ...over,
});

const build = (exploration: Exploration | undefined, existing?: DiscoveryCard) =>
  buildPassageCard({ passage: SAMPLE_PASSAGE, sources, exploration, labelFor, themeRef, id: "card-1", now: NOW, existing });

describe("buildPassageCard", () => {
  it("builds a valid card from a passage the learner has only read", () => {
    const card = build(newPassageExploration(SAMPLE_PASSAGE.id, NOW));
    expect(discoveryCardSchema.safeParse(card).success).toBe(true);
    expect(card).toMatchObject({
      id: "card-1",
      origin: { kind: "passage", contentId: "sample-passage" },
      title: "He knows how to help",
      summary: "Alma spoke to the people in Gideon.",
      notes: "",
      highlights: [],
    });
    expect(card.sources.map((s) => s.id)).toEqual(["alma-7-11-12", "john-15-13-15"]);
    expect(card.concepts).toEqual([
      { ref: "concept:atonement", label: "Atonement of Jesus Christ", demonstrated: false },
      { ref: "vocabulary:succor", label: "Succor", demonstrated: false },
    ]);
    expect(card.connections.map((c) => c.provenance)).toEqual(["suggested", "suggested"]);
    expect(card.connections[0]).toMatchObject({
      id: "scripture:alma-7-11-12|teaches|concept:atonement",
      from: { ref: "scripture:alma-7-11-12", label: "Alma 7:11–12" },
      to: { ref: "concept:atonement", label: "Atonement of Jesus Christ" },
    });
  });

  it("copies highlighted words from the verse with their theme and note", () => {
    const exploration = withHighlights(
      newPassageExploration(SAMPLE_PASSAGE.id, NOW),
      [highlight({ conceptId: "succor", note: "He knows how to help." }), highlight({ id: "h2", verse: 11, start: 0, end: 4 })],
      NOW,
    );
    const card = build(exploration);
    expect(card.highlights).toEqual([
      { sourceId: "alma-7-11-12", verse: 11, text: "And he shall go", note: "" },
      { sourceId: "alma-7-11-12", verse: 12, text: "how to succor his people", conceptId: "succor", note: "He knows how to help." },
    ]);
  });

  it("skips highlights that no longer fit the verse", () => {
    const exploration = withHighlights(newPassageExploration(SAMPLE_PASSAGE.id, NOW), [highlight({ verse: 13 }), highlight({ id: "h2", end: 400 })], NOW);
    expect(build(exploration).highlights).toEqual([]);
  });

  it("marks a theme demonstrated when the learner tags a highlight with it", () => {
    const exploration = withHighlights(newPassageExploration(SAMPLE_PASSAGE.id, NOW), [highlight({ conceptId: "atonement" })], NOW);
    const card = build(exploration);
    expect(card.concepts.find((c) => c.ref === "concept:atonement")?.demonstrated).toBe(true);
    expect(card.concepts.find((c) => c.ref === "vocabulary:succor")?.demonstrated).toBe(false);
    // Tagging a passage theme demonstrates the passage's connection to it.
    expect(card.connections.find((c) => c.to.ref === "concept:atonement")?.provenance).toBe("demonstrated");
  });

  it("marks themes and connections demonstrated by worked-out activities, but not revealed ones", () => {
    const worked = withActivityState(
      newPassageExploration(SAMPLE_PASSAGE.id, NOW),
      "find-why",
      { attempts: 1, hintsShown: 0, revealed: false, completed: true },
      NOW,
    );
    // The highlight activity's answer is in verse 12, which both themes include.
    expect([...demonstratedThemes(SAMPLE_PASSAGE, sources["alma-7-11-12"], worked)].sort()).toEqual(["atonement", "succor"]);
    const card = build(worked);
    // It examines Alma 7 only, so it demonstrates the Alma connection but not the one that also cites John 15.
    expect(card.connections.map((c) => c.provenance)).toEqual(["demonstrated", "suggested"]);

    const revealed = withActivityState(
      newPassageExploration(SAMPLE_PASSAGE.id, NOW),
      "sort-verses",
      { attempts: 3, hintsShown: 1, revealed: true, completed: true },
      NOW,
    );
    expect(build(revealed).concepts.every((c) => !c.demonstrated)).toBe(true);
    expect(build(revealed).connections.every((c) => c.provenance === "suggested")).toBe(true);

    const sorted = withActivityState(revealed, "sort-verses", { attempts: 4, hintsShown: 1, revealed: false, completed: true }, NOW);
    expect(build(sorted).connections.map((c) => c.provenance)).toEqual(["demonstrated", "demonstrated"]);
  });

  it("only links highlight tags to connections that start at this passage", () => {
    const exploration = withHighlights(newPassageExploration(SAMPLE_PASSAGE.id, NOW), [highlight({ conceptId: "succor" })], NOW);
    const johnConnection = SAMPLE_PASSAGE.connections[1];
    expect(connectionDemonstrated(johnConnection, SAMPLE_PASSAGE, exploration, themeRef)).toBe(false);
  });

  it("updates an existing card in place, keeping its id, creation time, notes, and unknown fields", () => {
    const first = build(newPassageExploration(SAMPLE_PASSAGE.id, NOW));
    const existing = { ...first, notes: "My thoughts", futureField: 1 } as DiscoveryCard;
    const exploration = withHighlights(
      newPassageExploration(SAMPLE_PASSAGE.id, NOW),
      addHighlight([], highlight({ conceptId: "succor" })),
      LATER,
    );
    const updated = buildPassageCard({ passage: SAMPLE_PASSAGE, sources, exploration, labelFor, themeRef, id: "ignored", now: LATER, existing });
    expect(updated).toMatchObject({ id: "card-1", createdAt: NOW, updatedAt: LATER, notes: "My thoughts", futureField: 1 });
    expect(updated.highlights).toHaveLength(1);
  });
});

describe("findPassageCard", () => {
  it("finds the most recent card saved from a passage", () => {
    const cards = [
      { id: "a", origin: { kind: "passage" as const, contentId: "sample-passage" }, updatedAt: NOW },
      { id: "b", origin: { kind: "passage" as const, contentId: "sample-passage" }, updatedAt: LATER },
      { id: "c", origin: { kind: "investigation" as const, contentId: "sample-passage" }, updatedAt: LATER },
      { id: "d", origin: { kind: "passage" as const, contentId: "other" }, updatedAt: LATER },
    ];
    expect(findPassageCard(cards, "sample-passage")?.id).toBe("b");
    expect(findPassageCard(cards, "missing")).toBeUndefined();
  });
});
