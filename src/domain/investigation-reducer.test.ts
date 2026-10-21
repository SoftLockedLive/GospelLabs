import { describe, expect, it } from "vitest";
import { investigationSchema, type ConnectionRelationship, type Investigation } from "./investigation";
import {
  canConnect,
  claimsInSection,
  connectionsFor,
  countCitations,
  findConnectionBetween,
  findChallengeResponse,
  findTrailProgress,
  investigationReducer,
  type InvestigationAction,
} from "./investigation-reducer";
import {
  blankInvestigation,
  challengeSnapshot,
  deepFreeze,
  evidenceInput,
  T0,
  T1,
  T2,
  TRAIL_ID,
  trailStepSnapshot,
} from "./test-fixtures";

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

  it("remembers the Research activity without counting it as an edit", () => {
    const before = blankInvestigation();
    const after = apply(before, { type: "setResearchActivity", activity: "connections" });
    expect(after.researchActivity).toBe("connections");
    expect(after.updatedAt).toBe(before.updatedAt);
    expect(apply(after, { type: "setResearchActivity", activity: "connections" })).toBe(after);
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

describe("evidence connections", () => {
  /** Three cards: ev-1, ev-2, ev-3. */
  function withThreeCards(): Investigation {
    return apply(
      blankInvestigation(),
      { type: "addEvidence", id: "ev-1", input: evidenceInput(), now: T0 },
      { type: "addEvidence", id: "ev-2", input: evidenceInput({ sourceTitle: "Ether 12:6" }), now: T0 },
      { type: "addEvidence", id: "ev-3", input: evidenceInput({ sourceTitle: "Hebrews 11:1" }), now: T0 },
    );
  }
  const connect = (
    id: string,
    fromEvidenceId: string,
    toEvidenceId: string,
    relationship: ConnectionRelationship = "supports",
    now = T1,
  ): InvestigationAction => ({
    type: "addConnection",
    id,
    input: { fromEvidenceId, toEvidenceId, relationship, explanation: "" },
    now,
  });

  it("creates a connection with timestamps", () => {
    const after = apply(withThreeCards(), {
      type: "addConnection",
      id: "conn-1",
      input: { fromEvidenceId: "ev-1", toEvidenceId: "ev-2", relationship: "challenges", explanation: "They differ." },
      now: T1,
    });
    expect(after.evidenceConnections).toEqual([
      {
        id: "conn-1",
        fromEvidenceId: "ev-1",
        toEvidenceId: "ev-2",
        relationship: "challenges",
        explanation: "They differ.",
        createdAt: T1,
        updatedAt: T1,
      },
    ]);
    expect(after.updatedAt).toBe(T1);
  });

  it.each([
    ["evidence that doesn't exist", connect("conn-1", "ev-1", "ghost")],
    ["a card connected to itself", connect("conn-1", "ev-2", "ev-2")],
  ])("refuses %s", (_name, action) => {
    const before = withThreeCards();
    expect(apply(before, action)).toBe(before);
  });

  it("allows one connection per pair of cards, in either direction", () => {
    const connected = apply(withThreeCards(), connect("conn-1", "ev-1", "ev-2"));
    expect(apply(connected, connect("conn-2", "ev-1", "ev-2", "challenges"))).toBe(connected);
    expect(apply(connected, connect("conn-2", "ev-2", "ev-1", "raises-question"))).toBe(connected);
    expect(apply(connected, connect("conn-1", "ev-2", "ev-3"))).toBe(connected); // id already used
    expect(apply(connected, connect("conn-2", "ev-2", "ev-3")).evidenceConnections).toHaveLength(2);
    expect(findConnectionBetween(connected, "ev-2", "ev-1")?.id).toBe("conn-1");
  });

  it("edits the relationship, direction, and explanation, keeping the id and creation time", () => {
    const connected = apply(withThreeCards(), connect("conn-1", "ev-1", "ev-2"));
    const edited = apply(connected, {
      type: "updateConnection",
      id: "conn-1",
      input: { fromEvidenceId: "ev-2", toEvidenceId: "ev-1", relationship: "raises-question", explanation: "Why?" },
      now: T2,
    });
    expect(edited.evidenceConnections).toEqual([
      {
        id: "conn-1",
        fromEvidenceId: "ev-2",
        toEvidenceId: "ev-1",
        relationship: "raises-question",
        explanation: "Why?",
        createdAt: T1,
        updatedAt: T2,
      },
    ]);
    const { fromEvidenceId, toEvidenceId, relationship, explanation } = edited.evidenceConnections[0];
    const same = { fromEvidenceId, toEvidenceId, relationship, explanation };
    expect(apply(edited, { type: "updateConnection", id: "conn-1", input: same, now: T2 })).toBe(edited);
  });

  it("refuses edits that would point at missing evidence, itself, or an already-connected pair", () => {
    const state = apply(withThreeCards(), connect("conn-1", "ev-1", "ev-2"), connect("conn-2", "ev-2", "ev-3"));
    const update = (fromEvidenceId: string, toEvidenceId: string, id = "conn-2"): InvestigationAction => ({
      type: "updateConnection",
      id,
      input: { fromEvidenceId, toEvidenceId, relationship: "supports", explanation: "" },
      now: T2,
    });
    expect(apply(state, update("ev-2", "ghost"))).toBe(state);
    expect(apply(state, update("ev-3", "ev-3"))).toBe(state);
    expect(apply(state, update("ev-1", "ev-2"))).toBe(state);
    expect(apply(state, update("ev-1", "ev-3", "nope"))).toBe(state);
    expect(apply(state, update("ev-1", "ev-3")).evidenceConnections[1]).toMatchObject({ fromEvidenceId: "ev-1" });
  });

  it("deletes a connection and leaves the evidence alone", () => {
    const connected = apply(withThreeCards(), connect("conn-1", "ev-1", "ev-2"));
    const removed = apply(connected, { type: "removeConnection", id: "conn-1", now: T2 });
    expect(removed.evidenceConnections).toEqual([]);
    expect(removed.evidence).toBe(connected.evidence);
    expect(apply(removed, { type: "removeConnection", id: "conn-1", now: T2 })).toBe(removed);
  });

  it("deleting evidence removes only the connections that use it", () => {
    const state = apply(
      withThreeCards(),
      connect("conn-1", "ev-1", "ev-2"),
      connect("conn-2", "ev-3", "ev-2", "challenges"),
      connect("conn-3", "ev-1", "ev-3", "connects-to"),
    );
    expect(connectionsFor(state, "ev-2").map((c) => c.id)).toEqual(["conn-1", "conn-2"]);
    const after = apply(state, { type: "removeEvidence", id: "ev-2", now: T2 });
    expect(after.evidenceConnections.map((c) => c.id)).toEqual(["conn-3"]);
    expect(investigationSchema.safeParse(after).success).toBe(true);
  });

  it("canConnect reports which pairs are still available", () => {
    const state = apply(withThreeCards(), connect("conn-1", "ev-1", "ev-2"));
    const input = (fromEvidenceId: string, toEvidenceId: string) => ({
      fromEvidenceId,
      toEvidenceId,
      relationship: "supports" as const,
      explanation: "",
    });
    expect(canConnect(state, input("ev-2", "ev-1"))).toBe(false);
    expect(canConnect(state, input("ev-2", "ev-1"), "conn-1")).toBe(true);
    expect(canConnect(state, input("ev-1", "ev-3"))).toBe(true);
  });
});

describe("discovery highlights", () => {
  function withTwoCards(): Investigation {
    return apply(
      blankInvestigation(),
      { type: "addEvidence", id: "ev-1", input: evidenceInput(), now: T0 },
      { type: "addEvidence", id: "ev-2", input: evidenceInput({ sourceTitle: "Ether 12:6" }), now: T0 },
    );
  }
  const add = (evidenceIds: string[] = [], id = "hl-1"): InvestigationAction => ({
    type: "addHighlight",
    id,
    input: { title: "Faith looks forward", insight: "Hope comes first.", evidenceIds },
    now: T1,
  });

  it("saves a discovery with its title, insight, links, and timestamps", () => {
    const after = apply(withTwoCards(), add(["ev-2"]));
    expect(after.discoveryHighlights).toEqual([
      {
        id: "hl-1",
        title: "Faith looks forward",
        insight: "Hope comes first.",
        evidenceIds: ["ev-2"],
        createdAt: T1,
        updatedAt: T1,
      },
    ]);
    expect(after.updatedAt).toBe(T1);
  });

  it("keeps links only to evidence that exists, once each", () => {
    const after = apply(withTwoCards(), add(["ev-2", "ghost", "ev-2", "ev-1"]));
    expect(after.discoveryHighlights[0].evidenceIds).toEqual(["ev-2", "ev-1"]);
    expect(investigationSchema.safeParse(after).success).toBe(true);
  });

  it("edits a discovery in place and ignores unchanged edits and unknown ids", () => {
    const state = apply(withTwoCards(), add(["ev-1"]));
    const input = { title: "Renamed", insight: "Rewritten.", evidenceIds: ["ev-1", "ev-2"] };
    const edited = apply(state, { type: "updateHighlight", id: "hl-1", input, now: T2 });
    expect(edited.discoveryHighlights[0]).toEqual({ ...input, id: "hl-1", createdAt: T1, updatedAt: T2 });
    expect(apply(edited, { type: "updateHighlight", id: "hl-1", input, now: T2 })).toBe(edited);
    expect(apply(edited, { type: "updateHighlight", id: "nope", input, now: T2 })).toBe(edited);
    expect(apply(edited, add([], "hl-1"))).toBe(edited);
  });

  it("deletes a discovery and leaves its evidence alone", () => {
    const state = apply(withTwoCards(), add(["ev-1"]));
    const removed = apply(state, { type: "removeHighlight", id: "hl-1", now: T2 });
    expect(removed.discoveryHighlights).toEqual([]);
    expect(removed.evidence).toBe(state.evidence);
  });

  it("deleting evidence unlinks it but keeps the discovery", () => {
    const state = apply(withTwoCards(), add(["ev-1", "ev-2"]));
    const after = apply(state, { type: "removeEvidence", id: "ev-1", now: T2 });
    expect(after.discoveryHighlights).toEqual([
      { ...state.discoveryHighlights[0], evidenceIds: ["ev-2"], updatedAt: T2 },
    ]);
    expect(investigationSchema.safeParse(after).success).toBe(true);
  });
});

describe("Come unto Christ reflection", () => {
  const reflect = (promptId: string, value: string, now = T1): InvestigationAction => ({
    type: "setReflection",
    promptId,
    value,
    now,
  });

  it("saves each answer under its prompt and leaves other answers alone", () => {
    const state = apply(blankInvestigation(), reflect("learned-about-christ", "He is patient."), reflect("follow-him", "Pray"));
    expect(state.christReflection).toEqual({ "learned-about-christ": "He is patient.", "follow-him": "Pray" });
    expect(state.updatedAt).toBe(T1);
  });

  it("removes an answer when it's cleared, and ignores unchanged text", () => {
    const state = apply(blankInvestigation(), reflect("follow-him", "Pray"));
    expect(apply(state, reflect("follow-him", "Pray", T2))).toBe(state);
    expect(apply(state, reflect("follow-him", "", T2)).christReflection).toEqual({});
    const blank = blankInvestigation();
    expect(apply(blank, reflect("follow-him", ""))).toBe(blank);
  });

  it("never touches the conclusion, claims, or status", () => {
    const before = apply(blankInvestigation(), { type: "setText", field: "conclusion", value: "Mine.", now: T0 });
    const after = apply(before, reflect("understand-better", "Grace", T1));
    expect({ ...after, christReflection: {}, updatedAt: before.updatedAt }).toEqual(before);
  });
});

describe("challenge responses", () => {
  const respond = (response: string, now = T1, id = "cr-1", challenge = challengeSnapshot()): InvestigationAction => ({
    type: "respondToChallenge",
    id,
    challenge,
    response,
    now,
  });

  it("creates a response that keeps the challenge's wording", () => {
    const after = apply(blankInvestigation(), respond("I noticed “faith” repeats."));
    expect(after.challengeResponses).toEqual([
      { id: "cr-1", ...challengeSnapshot(), response: "I noticed “faith” repeats.", createdAt: T1, updatedAt: T1 },
    ]);
    expect(after.updatedAt).toBe(T1);
  });

  it("edits the existing response in place, keeping its id, creation time, and original wording", () => {
    const reworded = challengeSnapshot({ title: "Renamed", prompt: "Changed later" });
    const after = apply(blankInvestigation(), respond("First"), respond("First, then more", T2, "cr-2", reworded));
    expect(after.challengeResponses).toEqual([
      { id: "cr-1", ...challengeSnapshot(), response: "First, then more", createdAt: T1, updatedAt: T2 },
    ]);
  });

  it("keeps one response per challenge and separate responses for different challenges", () => {
    const other = challengeSnapshot({ challengeId: "apply-with-others", type: "apply" });
    const after = apply(blankInvestigation(), respond("A"), respond("B", T1, "cr-2", other), respond("A2"));
    expect(after.challengeResponses.map((item) => [item.challengeId, item.response])).toEqual([
      ["observe-repeated-words", "A2"],
      ["apply-with-others", "B"],
    ]);
    expect(findChallengeResponse(after, "apply-with-others")?.response).toBe("B");
    expect(findChallengeResponse(after, "unknown")).toBeUndefined();
  });

  it("never stores a blank response, and clearing the text removes it", () => {
    const blank = blankInvestigation();
    expect(apply(blank, respond(""))).toBe(blank);
    expect(apply(blank, respond("  \n "))).toBe(blank);

    const cleared = apply(blank, respond("Something"), respond("", T2));
    expect(cleared.challengeResponses).toEqual([]);
    expect(cleared.updatedAt).toBe(T2);
  });

  it("returns the same object when the text is unchanged", () => {
    const state = apply(blankInvestigation(), respond("Same"));
    expect(apply(state, respond("Same", T2))).toBe(state);
  });

  it("removes a response by id and ignores unknown ids", () => {
    const state = apply(blankInvestigation(), respond("Gone soon"));
    expect(apply(state, { type: "removeChallengeResponse", id: "nope", now: T2 })).toBe(state);
    const removed = apply(state, { type: "removeChallengeResponse", id: "cr-1", now: T2 });
    expect(removed.challengeResponses).toEqual([]);
    expect(removed.updatedAt).toBe(T2);
  });

  it("leaves everything else in the investigation untouched", () => {
    const before = apply(
      blankInvestigation(),
      { type: "addEvidence", id: "ev-1", input: evidenceInput(), now: T1 },
      { type: "setText", field: "conclusion", value: "Mine.", now: T1 },
    );
    const after = apply(before, respond("A response", T2), { type: "removeChallengeResponse", id: "cr-1", now: T2 });
    expect({ ...after, updatedAt: before.updatedAt }).toEqual(before);
  });
});

describe("discovery trails", () => {
  const otherStep = trailStepSnapshot({ stepId: "john-8", title: "John 8", question: "What does Jesus say?" });
  const record = (discoveries: string, now = T1, step = trailStepSnapshot()): InvestigationAction => ({
    type: "recordTrailDiscoveries",
    trailId: TRAIL_ID,
    step,
    discoveries,
    now,
  });
  const explore = (explored: boolean, now = T1, step = trailStepSnapshot()): InvestigationAction => ({
    type: "setTrailStepExplored",
    trailId: TRAIL_ID,
    step,
    explored,
    now,
  });

  it("remembers the current step without counting it as an edit", () => {
    const before = blankInvestigation();
    const after = apply(before, { type: "setTrailStep", trailId: TRAIL_ID, stepId: "john-8" });
    expect(after.trailProgress).toEqual([{ trailId: TRAIL_ID, currentStepId: "john-8", steps: [] }]);
    expect(after.updatedAt).toBe(before.updatedAt);
    expect(apply(after, { type: "setTrailStep", trailId: TRAIL_ID, stepId: "john-8" })).toBe(after);
  });

  it("lets the user jump between steps in any order", () => {
    const state = apply(
      blankInvestigation(),
      { type: "setTrailStep", trailId: TRAIL_ID, stepId: "step-4" },
      { type: "setTrailStep", trailId: TRAIL_ID, stepId: "step-1" },
      { type: "setTrailStep", trailId: TRAIL_ID, stepId: "step-3" },
    );
    expect(findTrailProgress(state, TRAIL_ID)?.currentStepId).toBe("step-3");
  });

  it("records discoveries with the step's wording", () => {
    const after = apply(blankInvestigation(), record("Verse 10 ties the healing to forgiveness."));
    expect(findTrailProgress(after, TRAIL_ID)).toEqual({
      trailId: TRAIL_ID,
      steps: [{ ...trailStepSnapshot(), discoveries: "Verse 10 ties the healing to forgiveness.", explored: false, updatedAt: T1 }],
    });
    expect(after.updatedAt).toBe(T1);
  });

  it("edits notes in place, keeping the wording they were first written for", () => {
    const reworded = trailStepSnapshot({ title: "Renamed later", question: "Changed later?" });
    const after = apply(blankInvestigation(), record("First"), record("First, then more", T2, reworded));
    expect(findTrailProgress(after, TRAIL_ID)?.steps).toEqual([
      { ...trailStepSnapshot(), discoveries: "First, then more", explored: false, updatedAt: T2 },
    ]);
  });

  it("marks steps explored and unexplored, with or without notes", () => {
    const explored = apply(blankInvestigation(), explore(true));
    expect(findTrailProgress(explored, TRAIL_ID)?.steps[0]).toMatchObject({ discoveries: "", explored: true });
    expect(apply(explored, explore(true, T2))).toBe(explored);

    const withNotes = apply(explored, record("Notes", T2), explore(false, T2));
    expect(findTrailProgress(withNotes, TRAIL_ID)?.steps[0]).toMatchObject({ discoveries: "Notes", explored: false });
  });

  it("drops a step left with no notes and no explored mark, and never stores an empty one", () => {
    const blank = blankInvestigation();
    expect(apply(blank, record("   "))).toBe(blank);
    expect(apply(blank, explore(false))).toBe(blank);
    const cleared = apply(blank, record("Something"), record("", T2));
    expect(findTrailProgress(cleared, TRAIL_ID)?.steps).toEqual([]);
    expect(cleared.updatedAt).toBe(T2);
  });

  it("keeps each step's notes separate and keeps the current step when notes change", () => {
    const state = apply(
      blankInvestigation(),
      { type: "setTrailStep", trailId: TRAIL_ID, stepId: "john-8" },
      record("Mark notes"),
      record("John notes", T1, otherStep),
      explore(true, T1, otherStep),
    );
    const progress = findTrailProgress(state, TRAIL_ID);
    expect(progress?.currentStepId).toBe("john-8");
    expect(progress?.steps.map((item) => [item.stepId, item.discoveries, item.explored])).toEqual([
      ["mark-2-sins-forgiven", "Mark notes", false],
      ["john-8", "John notes", true],
    ]);
  });

  it("leaves everything else in the investigation untouched", () => {
    const before = apply(blankInvestigation(), { type: "addEvidence", id: "ev-1", input: evidenceInput(), now: T1 });
    const after = apply(before, record("Notes", T2));
    expect({ ...after, trailProgress: [], updatedAt: before.updatedAt }).toEqual(before);
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
      { type: "respondToChallenge", id: "cr-1", challenge: challengeSnapshot(), response: "Noticed", now: T2 },
      {
        type: "respondToChallenge",
        id: "cr-2",
        challenge: challengeSnapshot({ challengeId: "apply-with-others", type: "apply" }),
        response: "Kindness",
        now: T2,
      },
      { type: "respondToChallenge", id: "cr-3", challenge: challengeSnapshot(), response: "Noticed more", now: T2 },
      { type: "removeChallengeResponse", id: "cr-2", now: T2 },
      { type: "addEvidence", id: "ev-3", input: evidenceInput({ sourceTitle: "Moroni 7:41" }), now: T2 },
      {
        type: "addConnection",
        id: "conn-1",
        input: { fromEvidenceId: "ev-1", toEvidenceId: "ev-3", relationship: "connects-to", explanation: "" },
        now: T2,
      },
      {
        type: "updateConnection",
        id: "conn-1",
        input: { fromEvidenceId: "ev-3", toEvidenceId: "ev-1", relationship: "supports", explanation: "Hope." },
        now: T2,
      },
      {
        type: "addHighlight",
        id: "hl-1",
        input: { title: "Insight", insight: "", evidenceIds: ["ev-1", "ev-3", "missing"] },
        now: T2,
      },
      { type: "removeEvidence", id: "ev-3", now: T2 },
      { type: "setReflection", promptId: "follow-him", value: "Daily", now: T2 },
      { type: "setTrailStep", trailId: TRAIL_ID, stepId: "john-8" },
      { type: "recordTrailDiscoveries", trailId: TRAIL_ID, step: trailStepSnapshot(), discoveries: "Notes", now: T2 },
      { type: "setTrailStepExplored", trailId: TRAIL_ID, step: trailStepSnapshot(), explored: true, now: T2 },
      { type: "recordTrailDiscoveries", trailId: TRAIL_ID, step: trailStepSnapshot(), discoveries: "", now: T2 },
    ];
    let state = blankInvestigation();
    for (const action of actions) {
      state = investigationReducer(deepFreeze(state), action);
      const result = investigationSchema.safeParse(state);
      expect(result.success, `after ${action.type}: ${result.error?.message}`).toBe(true);
    }
  });
});
