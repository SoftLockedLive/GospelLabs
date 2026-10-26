/**
 * Where a learner stands in an investigation: each step's status, which
 * steps can be opened, and whether the investigation is complete. An
 * investigation is complete when every main-path step for the current session
 * length is completed or skipped; side branches are always optional.
 */
import type { StudyInvestigation } from "../content-schema";
import type { StepState, StudyProgress } from "../user-data";
import { findBranch, isStepDone, mainPath, mainPathIndex, refKey, stepStateAt, stepsAround, type StepRef } from "./path";

export type StepStatus = "unvisited" | "started" | "complete" | "revealed" | "skipped";

export function statusOf(state: StepState | undefined): StepStatus {
  if (!state) return "unvisited";
  if (state.status === "complete") return state.revealed ? "revealed" : "complete";
  return state.skipped ? "skipped" : "started";
}

export const stepStatus = (progress: StudyProgress, ref: StepRef): StepStatus => statusOf(stepStateAt(progress, ref));

/**
 * Steps that can be opened from the progress path: any step already visited,
 * plus the first one not yet finished (so nobody can skip ahead unseen, and
 * nobody is ever stuck behind a step they've already passed).
 */
export function canOpenStep(investigation: StudyInvestigation, progress: StudyProgress, ref: StepRef): boolean {
  if (ref.branchId && !findBranch(investigation, ref.branchId)) return false;
  const steps = stepsAround(investigation, progress, ref.branchId);
  const index = steps.findIndex((step) => step.id === ref.stepId);
  if (index < 0) return false;
  if (progress.steps[refKey(ref)]) return true;
  const frontier = steps.findIndex((step) => !isStepDone(progress.steps[refKey({ stepId: step.id, branchId: ref.branchId })]));
  return frontier < 0 || index <= frontier;
}

export interface CompletionState {
  /** Main-path steps for the current session length. */
  total: number;
  /** Of those, how many are completed or skipped. */
  done: number;
  complete: boolean;
  /** Main-path step ids not yet finished, in order. */
  remaining: string[];
  /** 0-based index on the main path of the current step (or the one a branch returns to). */
  currentIndex: number;
}

export function completionState(investigation: StudyInvestigation, progress: StudyProgress): CompletionState {
  const path = mainPath(investigation, progress.length);
  const remaining = path.filter((step) => !isStepDone(progress.steps[refKey({ stepId: step.id })])).map((step) => step.id);
  return {
    total: path.length,
    done: path.length - remaining.length,
    complete: path.length > 0 && remaining.length === 0,
    remaining,
    currentIndex: mainPathIndex(investigation, progress),
  };
}
