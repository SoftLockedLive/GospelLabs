import { describe, expect, it } from "vitest";
import { blankInvestigation, challengeSnapshot, evidenceInput, T1, T2 } from "@/domain/test-fixtures";
import { initWorkspaceState, workspaceReducer, type WorkspaceAction, type WorkspaceState } from "./workspace-state";

const run = (state: WorkspaceState, ...actions: WorkspaceAction[]) => actions.reduce(workspaceReducer, state);

function withEvidence(): WorkspaceState {
  return run(
    initWorkspaceState(blankInvestigation()),
    { type: "addEvidence", id: "ev-1", input: evidenceInput(), now: T1 },
    { type: "addClaim", id: "cl-1", section: "analysis", now: T1 },
    { type: "linkEvidence", claimId: "cl-1", evidenceId: "ev-1", now: T1 },
  );
}

describe("workspaceReducer undo", () => {
  it("offers undo after a removal and restores the content, including claim links", () => {
    const before = withEvidence();
    const removed = run(before, { type: "removeEvidence", id: "ev-1", now: T2 });
    expect(removed.undo?.label).toBe("Evidence removed");
    expect(removed.investigation.claims[0].evidenceIds).toEqual([]);

    const restored = run(removed, { type: "undo" });
    expect(restored.investigation).toEqual(before.investigation);
    expect(restored.undo).toBeNull();
  });

  it("offers undo after removing a challenge response", () => {
    const before = run(initWorkspaceState(blankInvestigation()), {
      type: "respondToChallenge",
      id: "cr-1",
      challenge: challengeSnapshot(),
      response: "Worth keeping",
      now: T1,
    });
    const removed = run(before, { type: "removeChallengeResponse", id: "cr-1", now: T2 });
    expect(removed.undo?.label).toBe("Challenge response removed");
    expect(run(removed, { type: "undo" }).investigation).toEqual(before.investigation);
  });

  it("says how many connections went with deleted evidence, and undo restores them", () => {
    const connected = run(
      withEvidence(),
      { type: "addEvidence", id: "ev-2", input: evidenceInput({ sourceTitle: "Ether 12:6" }), now: T1 },
      {
        type: "addConnection",
        id: "conn-1",
        input: { fromEvidenceId: "ev-1", toEvidenceId: "ev-2", relationship: "supports", explanation: "" },
        now: T1,
      },
    );
    const removed = run(connected, { type: "removeEvidence", id: "ev-2", now: T2 });
    expect(removed.undo?.label).toBe("Evidence and 1 connection removed");
    expect(removed.investigation.evidenceConnections).toEqual([]);
    expect(run(removed, { type: "undo" }).investigation).toEqual(connected.investigation);

    const unlinked = run(connected, { type: "removeConnection", id: "conn-1", now: T2 });
    expect(unlinked.undo?.label).toBe("Connection removed");
  });

  it("offers undo for a deleted discovery, and restores evidence links a deletion removed", () => {
    const linked = run(withEvidence(), {
      type: "addHighlight",
      id: "hl-1",
      input: { title: "Insight", insight: "", evidenceIds: ["ev-1"] },
      now: T1,
    });
    const removed = run(linked, { type: "removeHighlight", id: "hl-1", now: T2 });
    expect(removed.undo?.label).toBe("Insight removed");
    expect(run(removed, { type: "undo" }).investigation).toEqual(linked.investigation);

    const evidenceGone = run(linked, { type: "removeEvidence", id: "ev-1", now: T2 });
    expect(evidenceGone.investigation.discoveryHighlights[0].evidenceIds).toEqual([]);
    expect(run(evidenceGone, { type: "undo" }).investigation.discoveryHighlights[0].evidenceIds).toEqual(["ev-1"]);
  });

  it("keeps undo available while moving between trail steps", () => {
    const removed = run(withEvidence(), { type: "removeEvidence", id: "ev-1", now: T2 });
    const moved = run(removed, { type: "setTrailStep", trailId: "trail", stepId: "step-2" });
    expect(moved.undo).toBe(removed.undo);
  });

  it("undo keeps the section and Research activity the user is viewing", () => {
    const removed = run(withEvidence(), { type: "removeEvidence", id: "ev-1", now: T2 });
    const moved = run(
      removed,
      { type: "setSection", section: "analysis" },
      { type: "setResearchActivity", activity: "connections" },
    );
    const restored = run(moved, { type: "undo" });
    expect(restored.investigation.evidence).toHaveLength(1);
    expect(restored.investigation.currentSection).toBe("analysis");
    expect(restored.investigation.researchActivity).toBe("connections");
  });

  it("does not offer undo for ordinary edits", () => {
    const state = run(initWorkspaceState(blankInvestigation()), {
      type: "setText",
      field: "question",
      value: "Why?",
      now: T1,
    });
    expect(state.undo).toBeNull();
  });

  it("drops the undo snapshot once the user makes another edit", () => {
    const state = run(
      withEvidence(),
      { type: "removeClaim", id: "cl-1", now: T2 },
      { type: "setText", field: "analysisNotes", value: "New notes", now: T2 },
    );
    expect(state.undo).toBeNull();
    expect(run(state, { type: "undo" })).toBe(state);
  });

  it("keeps undo available while navigating, and stays on the current section when undoing", () => {
    const state = run(
      withEvidence(),
      { type: "removeEvidence", id: "ev-1", now: T2 },
      { type: "setSection", section: "conclusion" },
    );
    expect(state.undo).not.toBeNull();
    const restored = run(state, { type: "undo" });
    expect(restored.investigation.evidence).toHaveLength(1);
    expect(restored.investigation.currentSection).toBe("conclusion");
  });

  it("numbers consecutive removals so each one is announced", () => {
    const state = run(
      initWorkspaceState(blankInvestigation()),
      { type: "addHypothesis", id: "h-1", now: T1 },
      { type: "addHypothesis", id: "h-2", now: T1 },
      { type: "removeHypothesis", id: "h-1", now: T2 },
    );
    const next = run(state, { type: "removeHypothesis", id: "h-2", now: T2 });
    expect(next.undo?.seq).toBe((state.undo?.seq ?? 0) + 1);
    // Undo restores only the most recent removal.
    expect(run(next, { type: "undo" }).investigation.hypotheses.map((h) => h.id)).toEqual(["h-2"]);
  });

  it("ignores no-op actions entirely", () => {
    const state = withEvidence();
    expect(run(state, { type: "removeClaim", id: "missing", now: T2 })).toBe(state);
    expect(run(state, { type: "dismissUndo" })).toBe(state);
  });
});
