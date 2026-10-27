import { describe, expect, it } from "vitest";
import {
  coreStepCount,
  deepStepCount,
  describeReason,
  inProgressInvestigations,
  lengthFit,
  recentConcepts,
  sessionSteps,
  studyPosition,
  suggestInvestigations,
  type InvestigationSummary,
} from "./suggestions";
import type { DiscoveryCard, StudyProgress } from "./user-data";
import type { NodeRef } from "./vocabulary";

const T0 = "2026-10-01T12:00:00.000Z";
const at = (day: number) => `2026-10-${String(day).padStart(2, "0")}T12:00:00.000Z`;

function investigation(id: string, overrides: Partial<InvestigationSummary> = {}): InvestigationSummary {
  return {
    id,
    title: `Title ${id}`,
    question: `Question ${id}?`,
    hook: "Why it matters.",
    theme: "Jesus Christ",
    estimatedMinutes: { quick: 7, deep: 25 },
    steps: [
      { id: "a", deep: false },
      { id: "b", deep: true },
      { id: "c", deep: false },
      { id: "d", deep: false },
    ],
    branches: 1,
    related: [],
    ...overrides,
  };
}

function progress(id: string, overrides: Partial<StudyProgress> = {}): StudyProgress {
  return {
    id,
    contentVersion: 1,
    startedAt: T0,
    updatedAt: T0,
    difficulty: "medium",
    length: "quick",
    position: { stepId: "a" },
    steps: {},
    visitedBranches: [],
    ...overrides,
  };
}

type CardInput = Pick<DiscoveryCard, "createdAt" | "concepts" | "connections">;
function card(createdAt: string, concepts: [NodeRef, string][], connections: CardInput["connections"] = []): CardInput {
  return { createdAt, concepts: concepts.map(([ref, label]) => ({ ref, label, demonstrated: true })), connections };
}

const step = (status: "started" | "complete", extra: object = {}) => ({
  status,
  difficulty: "medium" as const,
  attempts: 0,
  hintsShown: 0,
  revealed: false,
  skipped: false,
  updatedAt: T0,
  ...extra,
});

describe("session steps", () => {
  it("follows core steps in a quick session and every step in a deep one", () => {
    const item = investigation("x");
    expect(sessionSteps(item, "quick").map((s) => s.id)).toEqual(["a", "c", "d"]);
    expect(sessionSteps(item, "deep").map((s) => s.id)).toEqual(["a", "b", "c", "d"]);
    expect(coreStepCount(item)).toBe(3);
    expect(deepStepCount(item)).toBe(1);
  });
});

describe("studyPosition", () => {
  const item = investigation("x");

  it("reports step n of m on the chosen path", () => {
    const record = progress("x", { position: { stepId: "c" }, steps: { a: step("complete") } });
    expect(studyPosition(record, item)).toEqual({ step: 2, total: 3, completed: 1, inBranch: false });
    expect(studyPosition({ ...record, length: "deep" }, item)).toMatchObject({ step: 3, total: 4 });
  });

  it("counts skipped steps as moved past", () => {
    const record = progress("x", { position: { stepId: "d" }, steps: { a: step("complete"), c: step("started", { skipped: true }) } });
    expect(studyPosition(record, item)).toMatchObject({ step: 3, completed: 2 });
  });

  it("uses the step to return to while in a side question", () => {
    const record = progress("x", { position: { stepId: "q1", branchId: "side" }, returnTo: "c" });
    expect(studyPosition(record, item)).toMatchObject({ step: 2, inBranch: true });
  });

  it("places a deep step in a quick session at the next core step", () => {
    expect(studyPosition(progress("x", { position: { stepId: "b" } }), item)).toMatchObject({ step: 2, total: 3 });
  });

  it("places a step that no longer exists after the completed steps", () => {
    const record = progress("x", { position: { stepId: "gone" }, steps: { a: step("complete"), c: step("complete") } });
    expect(studyPosition(record, item)).toMatchObject({ step: 3 });
  });
});

describe("inProgressInvestigations", () => {
  it("lists started, unfinished investigations, most recent first", () => {
    const items = [investigation("one"), investigation("two"), investigation("three")];
    const records = [
      progress("one", { updatedAt: at(2) }),
      progress("two", { updatedAt: at(5) }),
      progress("three", { updatedAt: at(9), completedAt: at(9) }),
      progress("removed-from-content", { updatedAt: at(10) }),
    ];
    expect(inProgressInvestigations(records, items).map((entry) => entry.investigation.id)).toEqual(["two", "one"]);
  });
});

describe("recentConcepts", () => {
  it("weights newer discoveries more and ignores scripture and question nodes", () => {
    const concepts = recentConcepts([
      card(at(1), [["concept:grace", "Grace"]]),
      card(at(3), [
        ["concept:atonement", "Atonement"],
        ["scripture:alma-7-11-12", "Alma 7:11–12"],
      ]),
    ]);
    expect([...concepts.keys()]).toEqual(["concept:atonement", "concept:grace"]);
    expect(concepts.get("concept:atonement")!.weight).toBeGreaterThan(concepts.get("concept:grace")!.weight);
  });

  it("includes concepts joined by a card's connections", () => {
    const connection = {
      id: "c1",
      from: { ref: "scripture:john-15-13" as NodeRef, label: "John 15:13" },
      to: { ref: "attribute:charity" as NodeRef, label: "Charity" },
      relation: "teaches" as const,
      sourceIds: ["john-15-13"],
      note: "",
      provenance: "demonstrated" as const,
    };
    expect([...recentConcepts([card(at(1), [], [connection])]).keys()]).toEqual(["attribute:charity"]);
  });
});

describe("suggestInvestigations", () => {
  it("offers investigations not started before ones already completed, and leaves out ones in progress", () => {
    const items = [investigation("done"), investigation("started"), investigation("fresh")];
    const suggestions = suggestInvestigations({
      investigations: items,
      progress: [progress("done", { completedAt: at(2) }), progress("started")],
      discoveries: [],
      length: "quick",
    });
    expect(suggestions.map((s) => s.investigation.id)).toEqual(["fresh", "done"]);
    expect(suggestions[1].reason).toEqual({ kind: "revisit" });
  });

  it("prefers investigations related to recent discoveries, and says why", () => {
    const items = [investigation("plain"), investigation("related", { related: ["concept:atonement"] })];
    const [first] = suggestInvestigations({
      investigations: items,
      progress: [],
      discoveries: [card(at(4), [["concept:atonement", "the Atonement"]])],
      length: "quick",
    });
    expect(first.investigation.id).toBe("related");
    expect(first.reason).toEqual({ kind: "related", ref: "concept:atonement", label: "the Atonement" });
  });

  it("matches the session length", () => {
    const long = investigation("long", { estimatedMinutes: { quick: 15, deep: 35 } });
    const short = investigation("short", { estimatedMinutes: { quick: 10, deep: 25 }, steps: [{ id: "a", deep: false }], branches: 0 });
    const quick = suggestInvestigations({ investigations: [long, short], progress: [], discoveries: [], length: "quick" });
    // The shorter one first, even listed second.
    expect(quick.map((s) => s.investigation.id)).toEqual(["short", "long"]);
    expect(quick[0].reason).toEqual({ kind: "fits", minutes: 10 });
    const deep = suggestInvestigations({ investigations: [short, long], progress: [], discoveries: [], length: "deep" });
    expect(deep.map((s) => s.investigation.id)).toEqual(["long", "short"]);
    expect(lengthFit(short, "deep")).toBeLessThan(lengthFit(long, "deep"));
  });

  it("varies the themes in the list", () => {
    const items = [
      investigation("a1", { theme: "Prayer" }),
      investigation("a2", { theme: "prayer " }),
      investigation("b1", { theme: "Adversity" }),
    ];
    const suggestions = suggestInvestigations({ investigations: items, progress: [], discoveries: [], length: "quick" });
    expect(suggestions.map((s) => s.investigation.id)).toEqual(["a1", "b1", "a2"]);
  });

  it("keeps content order when everything else is equal, and respects the limit and exclusions", () => {
    const items = ["p", "q", "r", "s"].map((id) => investigation(id, { theme: id }));
    expect(suggestInvestigations({ investigations: items, progress: [], discoveries: [], length: "quick", limit: 2 }).map((s) => s.investigation.id)).toEqual([
      "p",
      "q",
    ]);
    expect(
      suggestInvestigations({ investigations: items, progress: [], discoveries: [], length: "quick", exclude: ["p"] }).map((s) => s.investigation.id),
    ).toEqual(["q", "r", "s"]);
  });

  it("returns nothing when there is nothing to suggest", () => {
    expect(suggestInvestigations({ investigations: [], progress: [], discoveries: [], length: "deep" })).toEqual([]);
  });
});

describe("describeReason", () => {
  it("explains each kind of suggestion plainly", () => {
    expect(describeReason({ kind: "related", ref: "concept:grace", label: "Grace" }, "quick")).toBe("Builds on Grace, from your recent discoveries");
    expect(describeReason({ kind: "fits", minutes: 8 }, "quick")).toBe("A good fit for a quick study");
    expect(describeReason({ kind: "fits", minutes: 25 }, "deep")).toBe("Plenty here for a deep study");
    expect(describeReason({ kind: "new" }, "quick")).toBe("Something new to explore");
    expect(describeReason({ kind: "revisit" }, "deep")).toBe("Studied before · worth revisiting");
  });
});
