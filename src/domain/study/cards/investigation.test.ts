import { describe, expect, it } from "vitest";
import { buildContentRegistry } from "../content-registry";
import { bundleInvestigation, labelsLookup } from "../engine/bundle";
import { startProgress, studyReducer, type StudyAction, type StudyCommand } from "../engine/progress";
import { SAMPLE_CONTENT } from "../test-fixtures";
import { discoveryCardSchema, type DiscoveryCard, type StudyProgress } from "../user-data";
import { buildInvestigationCard } from "./investigation";

const T0 = "2026-10-26T10:00:00.000Z";
const T1 = "2026-10-26T11:00:00.000Z";

const { registry } = buildContentRegistry(SAMPLE_CONTENT);
const investigation = registry.investigations[0];
const bundle = bundleInvestigation(registry, investigation);
const conceptRef = (id: string) => bundle.concepts[id].ref;

function play(...actions: StudyCommand[]): StudyProgress {
  return actions.reduce(
    (progress, action) => studyReducer(investigation, progress, { ...action, now: T0 } as StudyAction),
    startProgress(investigation, { difficulty: "medium", length: "deep", now: T0 }),
  );
}

const build = (progress: StudyProgress, existing?: DiscoveryCard) =>
  buildInvestigationCard({ investigation, progress, sources: bundle.sources, labelFor: labelsLookup(bundle.labels), conceptRef, id: "card-new", now: T1, existing });

describe("buildInvestigationCard", () => {
  it("records what was worked out as demonstrated", () => {
    const progress = play(
      { type: "complete", step: { stepId: "notice" }, outcome: { attempts: 1 } },
      { type: "next" },
      { type: "complete", step: { stepId: "connect" }, outcome: { attempts: 2 } },
      { type: "next" },
      { type: "complete", step: { stepId: "reflect" } },
    );
    const card = build(progress);
    expect(discoveryCardSchema.parse(card)).toEqual(card);
    expect(card).toMatchObject({
      id: "card-new",
      createdAt: T1,
      updatedAt: T1,
      title: "He knows how to help",
      question: investigation.question,
      summary: investigation.discovery.summary,
      origin: { kind: "investigation", contentId: "sample-investigation", contentVersion: 1, difficulty: "medium", primaryQuestion: "christ" },
      notes: "",
    });
    expect(card.sources.map((s) => s.id)).toEqual(["alma-7-11-12", "john-15-13-15"]);
    expect(card.sources[0]).toEqual({ id: "alma-7-11-12", label: "Alma 7:11–12", kind: "scripture", url: expect.stringContaining("alma/7") });
    expect(card.concepts).toEqual([
      { ref: "concept:atonement", label: "Atonement of Jesus Christ", demonstrated: true },
      { ref: "vocabulary:succor", label: "Succor", demonstrated: true },
    ]);
    expect(card.connections.map((c) => [c.id, c.provenance])).toEqual([
      ["scripture:alma-7-11-12|teaches|concept:atonement", "demonstrated"],
      ["concept:atonement|leads-to|vocabulary:succor", "demonstrated"],
    ]);
    expect(card.connections[0].from).toEqual({ ref: "scripture:alma-7-11-12", label: "Alma 7:11–12" });
  });

  it("records revealed steps as suggested and leaves skipped steps out", () => {
    const progress = play(
      { type: "reveal", step: { stepId: "notice" } },
      { type: "next" },
      { type: "skip", step: { stepId: "connect" } },
      { type: "next" },
      { type: "complete", step: { stepId: "reflect" } },
    );
    const card = build(progress);
    expect(card.connections).toHaveLength(1);
    expect(card.connections[0]).toMatchObject({ id: "scripture:alma-7-11-12|teaches|concept:atonement", provenance: "suggested" });
    expect(card.concepts).toEqual([
      { ref: "concept:atonement", label: "Atonement of Jesus Christ", demonstrated: false },
      { ref: "vocabulary:succor", label: "Succor", demonstrated: false },
    ]);
    // The skipped step's extra source (John 15) isn't counted as explored.
    expect(card.sources.map((s) => s.id)).toEqual(["alma-7-11-12"]);
  });

  it("a concept is demonstrated if any finished step worked it out", () => {
    const progress = play(
      { type: "reveal", step: { stepId: "notice" } },
      { type: "next" },
      { type: "complete", step: { stepId: "connect" }, outcome: { attempts: 1 } },
    );
    const card = build(progress);
    expect(card.concepts.find((c) => c.ref === "vocabulary:succor")?.demonstrated).toBe(true);
    expect(card.concepts.find((c) => c.ref === "concept:atonement")?.demonstrated).toBe(false);
  });

  it("includes finished branch steps", () => {
    const progress = play({ type: "enterBranch", branchId: "friends" }, { type: "complete", step: { stepId: "friends-step", branchId: "friends" } });
    expect(build(progress).sources.map((s) => s.id)).toEqual(["john-15-13-15"]);
  });

  it("updates an existing card in place, keeping its id, creation time, notes, and unknown fields", () => {
    const progress = play({ type: "complete", step: { stepId: "notice" } });
    const existing = { ...build(progress), id: "card-old", createdAt: T0, notes: "My notes", futureField: 1 } as DiscoveryCard;
    const updated = build(play({ type: "complete", step: { stepId: "notice" } }, { type: "next" }, { type: "complete", step: { stepId: "connect" } }), existing);
    expect(updated).toMatchObject({ id: "card-old", createdAt: T0, updatedAt: T1, notes: "My notes", futureField: 1 });
    expect(updated.connections).toHaveLength(2);
  });

  it("re-completing keeps earlier discoveries: a side question explored before, and what was worked out before", () => {
    // First time: the first step worked out, and the side question (the only step citing John 15 here).
    const first = build(
      play(
        { type: "complete", step: { stepId: "notice" } },
        { type: "enterBranch", branchId: "friends" },
        { type: "complete", step: { stepId: "friends-step", branchId: "friends" } },
      ),
    );
    expect(first.sources.map((s) => s.id)).toEqual(["alma-7-11-12", "john-15-13-15"]);
    const highlights = [{ sourceId: "alma-7-11-12", verse: 12, text: "succor", note: "" }];
    const existing: DiscoveryCard = { ...first, id: "card-old", createdAt: T0, notes: "My notes", highlights };
    // Again: the first step's answer shown this time, and no side question.
    const again = build(play({ type: "reveal", step: { stepId: "notice" } }), existing);

    expect(discoveryCardSchema.parse(again)).toEqual(again);
    expect(again).toMatchObject({ id: "card-old", createdAt: T0, updatedAt: T1, notes: "My notes", highlights });
    // The side question's source stays, after this time's.
    expect(again.sources.map((s) => s.id)).toEqual(["alma-7-11-12", "john-15-13-15"]);
    // Worked out the first time, shown this time: still demonstrated.
    expect(again.connections.map((c) => [c.id, c.provenance])).toEqual([["scripture:alma-7-11-12|teaches|concept:atonement", "demonstrated"]]);
    expect(again.concepts).toEqual(first.concepts);
    expect(again.concepts.every((c) => c.demonstrated)).toBe(true);
  });

  it("re-completing keeps what only an earlier completion found, after this completion's", () => {
    const earlier = build(play({ type: "complete", step: { stepId: "notice" } }, { type: "next" }, { type: "complete", step: { stepId: "connect" } }));
    const again = build(play({ type: "skip", step: { stepId: "notice" } }, { type: "next" }, { type: "reveal", step: { stepId: "connect" } }), earlier);
    expect(again.connections.map((c) => [c.id, c.provenance])).toEqual([
      ["concept:atonement|leads-to|vocabulary:succor", "demonstrated"],
      ["scripture:alma-7-11-12|teaches|concept:atonement", "demonstrated"],
    ]);
    expect(again.concepts.map((c) => [c.ref, c.demonstrated])).toEqual([
      ["vocabulary:succor", true],
      ["concept:atonement", true],
    ]);
  });

  it("re-completing upgrades what was only shown before to demonstrated once worked out", () => {
    const shown = build(play({ type: "reveal", step: { stepId: "notice" } }));
    expect(shown.connections[0].provenance).toBe("suggested");
    const worked = build(play({ type: "complete", step: { stepId: "notice" } }), shown);
    expect(worked.connections).toHaveLength(1);
    expect(worked.connections[0]).toMatchObject({ id: shown.connections[0].id, provenance: "demonstrated" });
    expect(worked.concepts.find((c) => c.ref === "concept:atonement")?.demonstrated).toBe(true);
  });

  it("falls back to inline concept kinds without a conceptRef", () => {
    const progress = play({ type: "complete", step: { stepId: "notice" } });
    const card = buildInvestigationCard({ investigation, progress, sources: bundle.sources, labelFor: (ref) => ref, id: "x", now: T1 });
    expect(card.concepts.map((c) => c.ref)).toEqual(["concept:atonement", "concept:succor"]);
  });
});
