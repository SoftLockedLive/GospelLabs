/**
 * Workspace state: the investigation plus a single-step Undo for deletions.
 * Offering Undo instead of confirmation dialogs keeps editing uninterrupted
 * while still protecting against accidental loss.
 */
import type { Investigation } from "@/domain/investigation";
import {
  connectionsFor,
  investigationReducer,
  isNavigation,
  REMOVAL_ACTIONS,
  type InvestigationAction,
} from "@/domain/investigation-reducer";

type RemovalAction = (typeof REMOVAL_ACTIONS)[number];

const REMOVAL_LABELS: Record<RemovalAction, string> = {
  removeSubquestion: "Subquestion removed",
  removeHypothesis: "Hypothesis removed",
  removeEvidence: "Evidence removed",
  removeClaim: "Claim removed",
  removeConnection: "Connection removed",
  removeHighlight: "Discovery removed",
  removeChallengeResponse: "Challenge response removed",
};

export interface UndoEntry {
  label: string;
  /** The investigation as it was just before the removal. */
  snapshot: Investigation;
  /** Increments with each removal so the Undo bar can re-announce and re-focus. */
  seq: number;
}

export interface WorkspaceState {
  investigation: Investigation;
  undo: UndoEntry | null;
}

export type WorkspaceAction = InvestigationAction | { type: "undo" } | { type: "dismissUndo" };

export function initWorkspaceState(investigation: Investigation): WorkspaceState {
  return { investigation, undo: null };
}

type Removal = Extract<InvestigationAction, { type: RemovalAction }>;

const isRemoval = (action: WorkspaceAction): action is Removal =>
  (REMOVAL_ACTIONS as readonly string[]).includes(action.type);

/** Says what a removal took with it, e.g. "Evidence and 2 connections removed". */
function removalLabel(action: Removal, before: Investigation): string {
  if (action.type === "removeEvidence") {
    const count = connectionsFor(before, action.id).length;
    if (count > 0) return `Evidence and ${count} ${count === 1 ? "connection" : "connections"} removed`;
  }
  return REMOVAL_LABELS[action.type];
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case "undo":
      if (!state.undo) return state;
      // Restore the content, but stay where the user is: same section, same Research activity.
      return {
        investigation: {
          ...state.undo.snapshot,
          currentSection: state.investigation.currentSection,
          researchActivity: state.investigation.researchActivity,
        },
        undo: null,
      };

    case "dismissUndo":
      return state.undo ? { ...state, undo: null } : state;

    default: {
      const investigation = investigationReducer(state.investigation, action);
      if (investigation === state.investigation) return state;

      // Navigating keeps Undo available; any other edit makes the snapshot stale.
      if (isNavigation(action)) return { ...state, investigation };

      const undo = isRemoval(action)
        ? {
            label: removalLabel(action, state.investigation),
            snapshot: state.investigation,
            seq: (state.undo?.seq ?? 0) + 1,
          }
        : null;
      return { investigation, undo };
    }
  }
}
