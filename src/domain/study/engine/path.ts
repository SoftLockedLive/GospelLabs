/**
 * The shape of an investigation as the learner walks it: which steps the main
 * path has for a session length, where branches are offered, and which
 * activity a step uses at a difficulty. Pure helpers shared by the reducer,
 * the player, and the Discovery Card builder.
 */
import { resolveActivity } from "../content-registry";
import type { Activity, Branch, Step, StudyInvestigation } from "../content-schema";
import { stepKey, type StepState, type StudyPosition, type StudyProgress } from "../user-data";
import type { Difficulty, StudyLength } from "../vocabulary";

/** A step on the main path (no branchId) or inside a side branch. Same shape as StudyProgress.position. */
export type StepRef = StudyPosition;

export const refKey = (ref: StepRef) => stepKey(ref.stepId, ref.branchId);

export const sameRef = (a: StepRef, b: StepRef) => a.stepId === b.stepId && a.branchId === b.branchId;

/**
 * Main-path steps for a session length. Quick sessions follow the core steps
 * (three: the question, the heart of the answer, and a reflection); deep
 * sessions add the deeper steps. STUDY_LENGTH_MINUTES says how long each takes.
 */
export function mainPath(investigation: StudyInvestigation, length: StudyLength): Step[] {
  return length === "deep" ? investigation.steps : investigation.steps.filter((step) => step.depth === "core");
}

export const findBranch = (investigation: StudyInvestigation, branchId: string): Branch | undefined =>
  investigation.branches.find((branch) => branch.id === branchId);

export function findStep(investigation: StudyInvestigation, ref: StepRef): Step | undefined {
  const steps = ref.branchId ? findBranch(investigation, ref.branchId)?.steps : investigation.steps;
  return steps?.find((step) => step.id === ref.stepId);
}

/** The steps the learner moves through at `ref`: its branch's steps, or the main path for the session length. */
export function stepsAround(investigation: StudyInvestigation, progress: Pick<StudyProgress, "length">, branchId?: string): Step[] {
  return branchId ? (findBranch(investigation, branchId)?.steps ?? []) : mainPath(investigation, progress.length);
}

export const stepStateAt = (progress: StudyProgress, ref: StepRef): StepState | undefined => progress.steps[refKey(ref)];

/** Finished for progression: completed (worked out or revealed) or skipped with "Continue anyway". */
export const isStepDone = (state: StepState | undefined) => !!state && (state.status === "complete" || state.skipped);

/** The difficulty a step is worked at: the one recorded for it, else the session's. */
export const stepDifficulty = (progress: StudyProgress, ref: StepRef): Difficulty => stepStateAt(progress, ref)?.difficulty ?? progress.difficulty;

/** The activity a step shows for this learner, and the difficulty it actually belongs to. */
export function activityAt(investigation: StudyInvestigation, progress: StudyProgress, ref: StepRef): { activity: Activity; difficulty: Difficulty } | undefined {
  const step = findStep(investigation, ref);
  return step ? resolveActivity(step, stepDifficulty(progress, ref)) : undefined;
}

/** Side questions offered at a step. Only deep sessions offer them, and only if the learner wants them. */
export function branchesOffered(
  investigation: StudyInvestigation,
  progress: Pick<StudyProgress, "length">,
  step: Step,
  options: { offerBranches: boolean },
): Branch[] {
  if (progress.length !== "deep" || !options.offerBranches) return [];
  return step.branchIds.map((id) => findBranch(investigation, id)).filter((branch): branch is Branch => !!branch);
}

/**
 * The main-path step the learner is on, or will return to from a branch.
 * When the position isn't on the path for the current length (a deep step
 * in a quick session), the nearest following path step stands in for it.
 */
export function mainPathIndex(investigation: StudyInvestigation, progress: StudyProgress): number {
  const path = mainPath(investigation, progress.length);
  const stepId = progress.position.branchId ? progress.returnTo : progress.position.stepId;
  const direct = path.findIndex((step) => step.id === stepId);
  if (direct >= 0 || path.length === 0) return Math.max(direct, 0);
  const order = investigation.steps.findIndex((step) => step.id === stepId);
  if (order < 0) return 0;
  const following = path.findIndex((step) => investigation.steps.indexOf(step) > order);
  return following >= 0 ? following : path.length - 1;
}
