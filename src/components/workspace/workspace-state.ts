/**
 * Workspace state: the investigation plus a single-step Undo for deletions.
 * Offering Undo instead of confirmation dialogs keeps editing uninterrupted
 * while still protecting against accidental loss.
 */
import type { Investigation } from "@/domain/investigation";
import { investigationReducer, REMOVAL_ACTIONS, type InvestigationAction } from "@/domain/investigation-reducer";

type RemovalAction = (typeof REMOVAL_ACTIONS)[number];

const REMOVAL_LABELS: Record<RemovalAction, string> = {
  removeSubquestion: "Subquestion removed",
  removeHypothesis: "Hypothesis removed",
  removeEvidence: "Evidence removed",
  removeClaim: "Claim removed",
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

const isRemoval = (type: string): type is RemovalAction => (REMOVAL_ACTIONS as readonly string[]).includes(type);

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case "undo":
      if (!state.undo) return state;
      // Restore the content, but stay on the section the user is viewing.
      return {
        investigation: { ...state.undo.snapshot, currentSection: state.investigation.currentSection },
        undo: null,
      };

    case "dismissUndo":
      return state.undo ? { ...state, undo: null } : state;

    default: {
      const investigation = investigationReducer(state.investigation, action);
      if (investigation === state.investigation) return state;

      // Navigating keeps Undo available; any other edit makes the snapshot stale.
      if (action.type === "setSection") return { ...state, investigation };

      const undo = isRemoval(action.type)
        ? { label: REMOVAL_LABELS[action.type], snapshot: state.investigation, seq: (state.undo?.seq ?? 0) + 1 }
        : null;
      return { investigation, undo };
    }
  }
}
