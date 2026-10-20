import { describe, expect, it } from "vitest";
import { investigationSchema, type Investigation } from "./investigation";
import {
  claimsInSection,
  countCitations,
  investigationReducer,
  type InvestigationAction,
} from "./investigation-reducer";
import { blankInvestigation, deepFreeze, evidenceInput, T0, T1, T2 } from "./test-fixtures";

/** Applies actions in order, freezing every intermediate state to catch mutation. */
function apply(state: Investigation, ...actions: InvestigationAction[]): Investigation {
  return actions.reduce((current, action) => investigationReducer(deepFreeze(current), action), state);
}

/** An investigation with two evidence cards and one analysis claim citing both. */
function withEvidenceAndClaim(): Investigation {
  return apply(
    blankInvestigation(),
    { type: "addEvidence", id: "ev-1", input: evidenceInput(), now: T1 },
    { type: "addEvidence", id: "ev-2", input: evidenceInput({ sourceTitle: "Ether 12:6" }), now: T1 },
    { type: "addClaim", id: "cl-1", section: "analysis", now: T1 },
    { type: "linkEvidence", claimId: "cl-1", evidenceId: "ev-1", now: T1 },
    { type: "linkEvidence", claimId: "cl-1", evidenceId: "ev-2", now: T1 },
  );
}

describe("text fields", () => {
  it("updates the field and the modification time only", () => {
    const before = blankInvestigation();
    const after = apply(before, { type: "setText", field: "question", value: "Why pray?", now: T1 });
    expect(after.question).toBe("Why pray?");
    expect(after.updatedAt).toBe(T1);
    expect(after.createdAt).toBe(T0);
    expect({ ...after, question: before.question, updatedAt: before.updatedAt }).toEqual(before);
  });

  it("returns the same object when the value is unchanged", () => {
    const before = blankInvestigation();
    expect(investigationReducer(before, { type: "setText", field: "title", value: "", now: T1 })).toBe(before);
  });
});

describe("navigation", () => {
  it("records the current section without counting as an edit", () => {
    const after = apply(blankInvestigation(), { type: "setSection", section: "research" });
    expect(after.currentSection).toBe("research");
    expect(after.updatedAt).toBe(T0);
  });

  it("allows jumping to any section in any order", () => {
    const after = apply(
      blankInvestigation(),
      { type: "setSection", section: "conclusion" },
      { type: "setSection", section: "hypothesis" },
    );
    expect(after.currentSection).toBe("hypothesis");
  });
});

describe("status", () => {
  it("can move between all statuses in any direction", () => {
    let state = blankInvestigation();
    for (const status of ["concluded", "investigating", "partially-understood", "concluded"] as const) {
      state = apply(state, { type: "setStatus", status, now: T1 });
      expect(state.status).toBe(status);
    }
  });

  it("keeps a concluded investigation editable", () => {
    const after = apply(
      blankInvestigation(),
      { type: "setStatus", status: "concluded", now: T1 },
      { type: "setText", field: "conclusion", value: "Revised later.", now: T2 },
      { type: "addEvidence", id: "ev-1", input: evidenceInput(), now: T2 },
    );
    expect(after).toMatchObject({ status: "concluded", conclusion: "Revised later.", updatedAt: T2 });
    expect(after.evidence).toHaveLength(1);
  });
});

describe("subquestions and hypotheses", () => {
  it("adds, edits, and removes subquestions in order", () => {
    const after = apply(
      blankInvestigation(),
      { type: "addSubquestion", id: "sq-1", now: T1 },
      { type: "addSubquestion", id: "sq-2", now: T1 },
      { type: "updateSubquestion", id: "sq-2", text: "Second", now: T1 },
      { type: "removeSubquestion", id: "sq-1", now: T2 },
    );
    expect(after.subquestions).toEqual([{ id: "sq-2", text: "Second" }]);
    expect(after.updatedAt).toBe(T2);
  });

  it("supports any number of hypotheses, including none", () => {
    expect(blankInvestigation().hypotheses).toEqual([]);
    const after = apply(
      blankInvestigation(),
      { type: "addHypothesis", id: "h-1", now: T1 },
      { type: "addHypothesis", id: "h-2", now: T1 },
      { type: "addHypothesis", id: "h-3", now: T1 },
      { type: "updateHypothesis", id: "h-2", statement: "Maybe B", now: T1 },
    );
    expect(after.hypotheses.map((h) => h.statement)).toEqual(["", "Maybe B", ""]);
  });

  it("ignores updates and removals for unknown ids", () => {
    const before = blankInvestigation();
    expect(investigationReducer(before, { type: "updateHypothesis", id: "nope", statement: "x", now: T1 })).toBe(before);
    expect(investigationReducer(before, { type: "removeSubquestion", id: "nope", now: T1 })).toBe(before);
  });

  it("ignores adding an id that already exists", () => {
    const once = apply(blankInvestigation(), { type: "addHypothesis", id: "h-1", now: T1 });
    expect(investigationReducer(once, { type: "addHypothesis", id: "h-1", now: T2 })).toBe(once);
  });
});

describe("evidence cards", () => {
  it("creates a card with creation and modification times", () => {
    const after = apply(blankInvestigation(), { type: "addEvidence", id: "ev-1", input: evidenceInput(), now: T1 });
    expect(after.evidence).toEqual([{ ...evidenceInput(), id: "ev-1", createdAt: T1, updatedAt: T1 }]);
  });

  it("edits a card, keeping its id and creation time", () => {
    const after = apply(
      blankInvestigation(),
      { type: "addEvidence", id: "ev-1", input: evidenceInput(), now: T1 },
      {
        type: "updateEvidence",
        id: "ev-1",
        input: evidenceInput({ observation: "Reread: hope in things unseen.", sourceUrl: "https://example.org" }),
        now: T2,
      },
    );
    expect(after.evidence[0]).toMatchObject({
      id: "ev-1",
      createdAt: T1,
      updatedAt: T2,
      observation: "Reread: hope in things unseen.",
      sourceUrl: "https://example.org",
    });
  });

  it("can clear an optional link when editing", () => {
    const after = apply(
      blankInvestigation(),
      { type: "addEvidence", id: "ev-1", input: evidenceInput({ sourceUrl: "https://example.org" }), now: T1 },
      { type: "updateEvidence", id: "ev-1", input: evidenceInput(), now: T2 },
    );
    expect(after.evidence[0]).not.toHaveProperty("sourceUrl");
  });

  it("deletes a card and unlinks it from every claim that cited it", () => {
    const after = apply(withEvidenceAndClaim(), { type: "removeEvidence", id: "ev-1", now: T2 });
    expect(after.evidence.map((e) => e.id)).toEqual(["ev-2"]);
    expect(after.claims[0].evidenceIds).toEqual(["ev-2"]);
    expect(after.claims[0].updatedAt).toBe(T2);
  });

  it("leaves claims that did not cite the deleted card untouched", () => {
    const state = apply(withEvidenceAndClaim(), { type: "addClaim", id: "cl-2", section: "conclusion", now: T1 });
    const after = apply(state, { type: "removeEvidence", id: "ev-1", now: T2 });
    expect(after.claims[1]).toBe(state.claims[1]);
  });
});

describe("claims", () => {
  it("adds claims to Analysis and Conclusion separately", () => {
    const after = apply(
      blankInvestigation(),
      { type: "addClaim", id: "a1", section: "analysis", now: T1 },
      { type: "addClaim", id: "c1", section: "conclusion", now: T1 },
      { type: "addClaim", id: "a2", section: "analysis", now: T1 },
    );
    expect(claimsInSection(after, "analysis").map((c) => c.id)).toEqual(["a1", "a2"]);
    expect(claimsInSection(after, "conclusion").map((c) => c.id)).toEqual(["c1"]);
  });

  it("edits the claim statement", () => {
    const after = apply(withEvidenceAndClaim(), { type: "updateClaim", id: "cl-1", statement: "Faith acts.", now: T2 });
    expect(after.claims[0]).toMatchObject({ statement: "Faith acts.", updatedAt: T2 });
  });

  it("links and unlinks evidence", () => {
    const linked = withEvidenceAndClaim();
    expect(linked.claims[0].evidenceIds).toEqual(["ev-1", "ev-2"]);
    const after = apply(linked, { type: "unlinkEvidence", claimId: "cl-1", evidenceId: "ev-1", now: T2 });
    expect(after.claims[0].evidenceIds).toEqual(["ev-2"]);
  });

  it("lets one evidence card support claims in both sections", () => {
    const after = apply(
      withEvidenceAndClaim(),
      { type: "addClaim", id: "cl-2", section: "conclusion", now: T2 },
      { type: "linkEvidence", claimId: "cl-2", evidenceId: "ev-1", now: T2 },
    );
    expect(countCitations(after).get("ev-1")).toBe(2);
    expect(countCitations(after).get("ev-2")).toBe(1);
  });

  it("ignores linking the same evidence twice", () => {
    const state = withEvidenceAndClaim();
    expect(investigationReducer(state, { type: "linkEvidence", claimId: "cl-1", evidenceId: "ev-1", now: T2 })).toBe(state);
  });

  it("refuses to link evidence that does not exist", () => {
    const state = withEvidenceAndClaim();
    expect(investigationReducer(state, { type: "linkEvidence", claimId: "cl-1", evidenceId: "ghost", now: T2 })).toBe(state);
  });

  it("deleting a claim keeps the evidence it cited", () => {
    const after = apply(withEvidenceAndClaim(), { type: "removeClaim", id: "cl-1", now: T2 });
    expect(after.claims).toEqual([]);
    expect(after.evidence).toHaveLength(2);
  });
});

describe("user-authored conclusion", () => {
  it("is never written by any operation other than editing it directly", () => {
    const after = apply(
      withEvidenceAndClaim(),
      { type: "addClaim", id: "cl-2", section: "conclusion", now: T2 },
      { type: "updateClaim", id: "cl-2", statement: "A supporting point", now: T2 },
      { type: "linkEvidence", claimId: "cl-2", evidenceId: "ev-2", now: T2 },
      { type: "setStatus", status: "concluded", now: T2 },
      { type: "removeEvidence", id: "ev-2", now: T2 },
    );
    expect(after.conclusion).toBe("");
  });
});

describe("data integrity", () => {
  it("every state produced by a long editing session passes schema validation", () => {
    const actions: InvestigationAction[] = [
      { type: "setText", field: "question", value: "How does grace work?", now: T1 },
      { type: "addSubquestion", id: "sq-1", now: T1 },
      { type: "addHypothesis", id: "h-1", now: T1 },
      { type: "addEvidence", id: "ev-1", input: evidenceInput(), now: T1 },
      { type: "addEvidence", id: "ev-2", input: evidenceInput({ sourceUrl: "https://example.org/a" }), now: T1 },
      { type: "addClaim", id: "cl-1", section: "analysis", now: T1 },
      { type: "linkEvidence", claimId: "cl-1", evidenceId: "ev-1", now: T1 },
      { type: "linkEvidence", claimId: "cl-1", evidenceId: "ev-2", now: T1 },
      { type: "addClaim", id: "cl-2", section: "conclusion", now: T2 },
      { type: "linkEvidence", claimId: "cl-2", evidenceId: "ev-2", now: T2 },
      { type: "removeEvidence", id: "ev-2", now: T2 },
      { type: "setSection", section: "conclusion" },
      { type: "setText", field: "conclusion", value: "Grace enables effort.", now: T2 },
      { type: "setStatus", status: "partially-understood", now: T2 },
      { type: "removeClaim", id: "cl-1", now: T2 },
    ];
    let state = blankInvestigation();
    for (const action of actions) {
      state = investigationReducer(deepFreeze(state), action);
      const result = investigationSchema.safeParse(state);
      expect(result.success, `after ${action.type}: ${result.error?.message}`).toBe(true);
    }
  });
});
