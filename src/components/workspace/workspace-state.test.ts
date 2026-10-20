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
