"use client";

import { useMemo, useReducer, type Dispatch } from "react";
import type {
  ChallengeSnapshot,
  ClaimSection,
  ConnectionInput,
  EvidenceInput,
  HighlightInput,
  Investigation,
  InvestigationStatus,
  ResearchActivity,
  SectionId,
  TrailStepSnapshot,
} from "@/domain/investigation";
import type { InvestigationEdit, TextField } from "@/domain/investigation-reducer";
import { createId } from "@/lib/ids";
import { initWorkspaceState, workspaceReducer, type WorkspaceAction } from "./workspace-state";

/** Omit that preserves each member of a union, so actions stay discriminated. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type EditWithoutTime = DistributiveOmit<InvestigationEdit, "now">;

/** Named operations bound to the reducer. Each "add" returns the new item's id. */
function createActions(dispatch: Dispatch<WorkspaceAction>) {
  const edit = (action: EditWithoutTime) =>
    dispatch({ ...action, now: new Date().toISOString() } as InvestigationEdit);
  const add = (build: (id: string) => EditWithoutTime) => {
    const id = createId();
    edit(build(id));
    return id;
  };

  return {
    setSection: (section: SectionId) => dispatch({ type: "setSection", section }),
    setResearchActivity: (activity: ResearchActivity) => dispatch({ type: "setResearchActivity", activity }),
    setText: (field: TextField, value: string) => edit({ type: "setText", field, value }),
    setStatus: (status: InvestigationStatus) => edit({ type: "setStatus", status }),

    addSubquestion: () => add((id) => ({ type: "addSubquestion", id })),
    updateSubquestion: (id: string, text: string) => edit({ type: "updateSubquestion", id, text }),
    removeSubquestion: (id: string) => edit({ type: "removeSubquestion", id }),

    addHypothesis: () => add((id) => ({ type: "addHypothesis", id })),
    updateHypothesis: (id: string, statement: string) => edit({ type: "updateHypothesis", id, statement }),
    removeHypothesis: (id: string) => edit({ type: "removeHypothesis", id }),

    addEvidence: (input: EvidenceInput) => add((id) => ({ type: "addEvidence", id, input })),
    updateEvidence: (id: string, input: EvidenceInput) => edit({ type: "updateEvidence", id, input }),
    removeEvidence: (id: string) => edit({ type: "removeEvidence", id }),

    addClaim: (section: ClaimSection) => add((id) => ({ type: "addClaim", id, section })),
    updateClaim: (id: string, statement: string) => edit({ type: "updateClaim", id, statement }),
    removeClaim: (id: string) => edit({ type: "removeClaim", id }),
    linkEvidence: (claimId: string, evidenceId: string) => edit({ type: "linkEvidence", claimId, evidenceId }),
    unlinkEvidence: (claimId: string, evidenceId: string) => edit({ type: "unlinkEvidence", claimId, evidenceId }),

    addConnection: (input: ConnectionInput) => add((id) => ({ type: "addConnection", id, input })),
    updateConnection: (id: string, input: ConnectionInput) => edit({ type: "updateConnection", id, input }),
    removeConnection: (id: string) => edit({ type: "removeConnection", id }),

    addHighlight: (input: HighlightInput) => add((id) => ({ type: "addHighlight", id, input })),
    updateHighlight: (id: string, input: HighlightInput) => edit({ type: "updateHighlight", id, input }),
    removeHighlight: (id: string) => edit({ type: "removeHighlight", id }),
    setReflection: (promptId: string, value: string) => edit({ type: "setReflection", promptId, value }),

    respondToChallenge: (challenge: ChallengeSnapshot, response: string) =>
      edit({ type: "respondToChallenge", id: createId(), challenge, response }),
    removeChallengeResponse: (id: string) => edit({ type: "removeChallengeResponse", id }),

    setTrailStep: (trailId: string, stepId: string) => dispatch({ type: "setTrailStep", trailId, stepId }),
    recordTrailDiscoveries: (trailId: string, step: TrailStepSnapshot, discoveries: string) =>
      edit({ type: "recordTrailDiscoveries", trailId, step, discoveries }),
    setTrailStepExplored: (trailId: string, step: TrailStepSnapshot, explored: boolean) =>
      edit({ type: "setTrailStepExplored", trailId, step, explored }),

    undo: () => dispatch({ type: "undo" }),
    dismissUndo: () => dispatch({ type: "dismissUndo" }),
  };
}

export type InvestigationActions = ReturnType<typeof createActions>;

/**
 * In-memory investigation state for the workspace. Persistence will hook in
 * here later by observing `investigation` changes.
 */
export function useInvestigation(initial: Investigation) {
  const [state, dispatch] = useReducer(workspaceReducer, initial, initWorkspaceState);
  const actions = useMemo(() => createActions(dispatch), []);
  return { investigation: state.investigation, undo: state.undo, actions };
}
