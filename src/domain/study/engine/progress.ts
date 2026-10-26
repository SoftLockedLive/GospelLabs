/**
 * Every change to a learner's progress in a guided investigation goes through
 * this pure reducer over StudyProgress. Callers pass the current time (and
 * any ids), so it is deterministic and easy to test; the player persists
 * whatever it returns. When an action changes nothing, the same object comes
 * back, so React can skip rendering and autosave can skip writing.
 *
 * Rules (see docs/2.0/ARCHITECTURE.md, "Step state and progression"):
 *   - Opening a step records it as started, at the session's difficulty
 *     (resolved to the nearest level the step offers).
 *   - Completed steps are never reopened for answering; changing difficulty
 *     keeps them at the level they were done. Unfinished steps (started or
 *     skipped) reset their attempts, hints, and answer and use the new level;
 *     skipped steps stay skipped, so finished-ness never goes backwards.
 *   - Entering a side branch stores the main-path step to return to; leaving
 *     the branch (by returning, or by opening a main-path step) restores it
 *     and records the branch as visited.
 *   - Nothing blocks progress: "Continue anyway" (skip) always counts as done.
 */
import { resolveActivity } from "../content-registry";
import type { StudyInvestigation } from "../content-schema";
import { stepKey, type StepState, type StudyProgress } from "../user-data";
import type { Difficulty, StudyLength } from "../vocabulary";
import {
  findBranch,
  findStep,
  mainPath,
  mainPathIndex,
  refKey,
  sameRef,
  stepsAround,
  type StepRef,
} from "./path";
import { canOpenStep, completionState } from "./status";

/** How a step's activity ended. Structurally compatible with the activity components' ActivityResult. */
export interface StepOutcome {
  revealed?: boolean;
  skipped?: boolean;
  attempts?: number;
  hintsShown?: number;
  response?: unknown;
  reflection?: string;
}

/** The activity's state as an activity component reports it (ActivityState). */
export interface ActivitySnapshot {
  attempts: number;
  hintsShown: number;
  response?: unknown;
  reflection?: string;
}

export type StudyAction = (
  /** Open a visited step (or the next unfinished one) from the progress path. Opening a branch step enters the branch. */
  | { type: "open"; step: StepRef }
  | { type: "next" }
  | { type: "previous" }
  /** The learner changed their answer. */
  | { type: "respond"; step: StepRef; response: unknown }
  /** The learner checked an answer (right or wrong). */
  | { type: "attempt"; step: StepRef; response: unknown }
  | { type: "hint"; step: StepRef }
  /** Applies everything an activity component reports in one go (attempts, hints, answer, reflection). */
  | { type: "sync"; step: StepRef; snapshot: ActivitySnapshot }
  /** "Show me": the answer is shown with its explanation; the step is complete, its connections suggested. */
  | { type: "reveal"; step: StepRef; response?: unknown }
  /** "Continue anyway". */
  | { type: "skip"; step: StepRef }
  /** The activity finished: worked out, revealed, or skipped (see StepOutcome). */
  | { type: "complete"; step: StepRef; outcome?: StepOutcome }
  /** Optional reflection text; can be edited after the step is complete. */
  | { type: "reflect"; step: StepRef; text: string }
  | { type: "setDifficulty"; difficulty: Difficulty }
  | { type: "setLength"; length: StudyLength }
  | { type: "enterBranch"; branchId: string }
  | { type: "returnFromBranch" }
  /** Marks the investigation completed, if every main-path step is done. */
  | { type: "finish" }
  /** Records the Discovery Card created on completion. */
  | { type: "linkDiscovery"; discoveryId: string }
  /** Study it again from the start. The Discovery Card link is kept, so finishing again updates the same card. */
  | { type: "restart" }
) & { now: string };

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** An action before it is stamped with the time; the player stamps actions as it dispatches them. */
export type StudyCommand = DistributiveOmit<StudyAction, "now">;

// --- Creating progress ----------------------------------------------------------

function newStepState(investigation: StudyInvestigation, progress: Pick<StudyProgress, "difficulty">, ref: StepRef, now: string): StepState | undefined {
  const step = findStep(investigation, ref);
  if (!step) return undefined;
  return {
    status: "started",
    difficulty: resolveActivity(step, progress.difficulty).difficulty,
    attempts: 0,
    hintsShown: 0,
    revealed: false,
    skipped: false,
    updatedAt: now,
  };
}

/** Records a step as visited (started), if it isn't already. */
function ensureStep(investigation: StudyInvestigation, progress: StudyProgress, ref: StepRef, now: string): StudyProgress {
  const key = refKey(ref);
  if (progress.steps[key]) return progress;
  const state = newStepState(investigation, progress, ref, now);
  return state ? { ...progress, steps: { ...progress.steps, [key]: state } } : progress;
}

/** New progress for an investigation, starting at its first main-path step. */
export function startProgress(
  investigation: StudyInvestigation,
  options: { difficulty: Difficulty; length: StudyLength; now: string },
): StudyProgress {
  const first = mainPath(investigation, options.length)[0] ?? investigation.steps[0];
  const progress: StudyProgress = {
    id: investigation.id,
    contentVersion: investigation.contentVersion,
    startedAt: options.now,
    updatedAt: options.now,
    difficulty: options.difficulty,
    length: options.length,
    position: { stepId: first.id },
    steps: {},
    visitedBranches: [],
  };
  return ensureStep(investigation, progress, progress.position, options.now);
}

// --- Navigation -------------------------------------------------------------------

const addVisited = (list: readonly string[], branchId: string | undefined) =>
  !branchId || list.includes(branchId) ? [...list] : [...list, branchId];

/** Moves to `ref`, entering or leaving a branch as needed. Assumes `ref` exists. */
function moveTo(investigation: StudyInvestigation, progress: StudyProgress, ref: StepRef, now: string): StudyProgress {
  if (sameRef(progress.position, ref)) return ensureStep(investigation, progress, ref, now);
  const current = progress.position;
  let next: StudyProgress;
  if (ref.branchId) {
    // Entering a branch from the main path remembers where to return; moving within branches keeps it.
    const returnTo = current.branchId ? progress.returnTo : current.stepId;
    next = { ...progress, position: { stepId: ref.stepId, branchId: ref.branchId }, returnTo };
  } else {
    const { returnTo: _left, ...rest } = progress;
    void _left;
    next = { ...rest, position: { stepId: ref.stepId }, visitedBranches: addVisited(progress.visitedBranches, current.branchId) };
  }
  return ensureStep(investigation, { ...next, updatedAt: now }, ref, now);
}

function returnFromBranch(investigation: StudyInvestigation, progress: StudyProgress, now: string): StudyProgress {
  if (!progress.position.branchId) return progress;
  const path = mainPath(investigation, progress.length);
  const target = path.find((step) => step.id === progress.returnTo) ?? path[mainPathIndex(investigation, progress)] ?? path[0];
  return target ? moveTo(investigation, progress, { stepId: target.id }, now) : progress;
}

function step(investigation: StudyInvestigation, progress: StudyProgress, delta: 1 | -1, now: string): StudyProgress {
  const { branchId } = progress.position;
  if (branchId) {
    const steps = stepsAround(investigation, progress, branchId);
    const index = steps.findIndex((s) => s.id === progress.position.stepId);
    const target = steps[index + delta];
    return target && index >= 0 ? moveTo(investigation, progress, { stepId: target.id, branchId }, now) : returnFromBranch(investigation, progress, now);
  }
  const path = mainPath(investigation, progress.length);
  const index = mainPathIndex(investigation, progress);
  const onPath = path[index]?.id === progress.position.stepId;
  // Off the path (a deep step in a quick session), "next" lands on the stand-in step itself.
  const target = path[onPath || delta < 0 ? index + delta : index];
  return target ? moveTo(investigation, progress, { stepId: target.id }, now) : progress;
}

// --- Step changes -------------------------------------------------------------------

/**
 * Applies `change` to the state of the step at `ref` (recording the step as
 * visited first if needed). Returns the same progress if nothing changed.
 */
function updateStep(
  investigation: StudyInvestigation,
  progress: StudyProgress,
  ref: StepRef,
  now: string,
  change: (state: StepState) => StepState,
): StudyProgress {
  if (!findStep(investigation, ref)) return progress;
  const opened = ensureStep(investigation, progress, ref, now);
  const key = refKey(ref);
  const state = opened.steps[key];
  const updated = change(state);
  if (updated === state) return opened;
  return { ...opened, steps: { ...opened.steps, [key]: { ...updated, updatedAt: now } }, updatedAt: now };
}

/** A change for unfinished steps only: completed steps keep the answer they were completed with. */
const unlessComplete = (change: (state: StepState) => StepState) => (state: StepState) => (state.status === "complete" ? state : change(state));

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function withReflection(state: StepState, text: string | undefined): StepState {
  if (text === undefined || text === (state.reflection ?? "")) return state;
  if (text === "") {
    const { reflection: _removed, ...rest } = state;
    void _removed;
    return rest;
  }
  return { ...state, reflection: text };
}

function completeState(state: StepState, outcome: StepOutcome, now: string): StepState {
  const base: StepState = {
    ...state,
    attempts: outcome.attempts ?? state.attempts,
    hintsShown: outcome.hintsShown ?? state.hintsShown,
    response: outcome.response !== undefined ? outcome.response : state.response,
  };
  if (outcome.skipped) return withReflection({ ...base, skipped: true }, outcome.reflection);
  return withReflection({ ...base, status: "complete", revealed: outcome.revealed ?? state.revealed, skipped: false, completedAt: now }, outcome.reflection);
}

// --- Settings -------------------------------------------------------------------------

function setDifficulty(investigation: StudyInvestigation, progress: StudyProgress, difficulty: Difficulty, now: string): StudyProgress {
  if (progress.difficulty === difficulty) return progress;
  const steps: Record<string, StepState> = {};
  for (const [key, state] of Object.entries(progress.steps)) {
    const [first, second] = key.split("/");
    const step = findStep(investigation, second ? { branchId: first, stepId: second } : { stepId: first });
    if (state.status === "complete" || !step) {
      steps[key] = state;
      continue;
    }
    const { response: _reset, ...rest } = state;
    void _reset;
    steps[key] = { ...rest, difficulty: resolveActivity(step, difficulty).difficulty, attempts: 0, hintsShown: 0, revealed: false, updatedAt: now };
  }
  return { ...progress, difficulty, steps, updatedAt: now };
}

function setLength(investigation: StudyInvestigation, progress: StudyProgress, length: StudyLength, now: string): StudyProgress {
  if (progress.length === length) return progress;
  let next: StudyProgress = { ...progress, length, updatedAt: now };
  // Quick sessions don't offer side branches: come back to the main path.
  if (length === "quick" && next.position.branchId) next = returnFromBranch(investigation, next, now);
  const path = mainPath(investigation, length);
  if (!next.position.branchId && !path.some((s) => s.id === next.position.stepId)) {
    const target = path[mainPathIndex(investigation, next)];
    if (target) next = moveTo(investigation, next, { stepId: target.id }, now);
  }
  return next;
}

function restart(investigation: StudyInvestigation, progress: StudyProgress, now: string): StudyProgress {
  const fresh = startProgress(investigation, { difficulty: progress.difficulty, length: progress.length, now });
  // Keep unknown fields (written by a newer version) and the Discovery Card link.
  const { completedAt: _done, returnTo: _returnTo, ...rest } = progress;
  void _done;
  void _returnTo;
  const restarted: StudyProgress = { ...rest, ...fresh, startedAt: progress.startedAt };
  return progress.discoveryId ? { ...restarted, discoveryId: progress.discoveryId } : restarted;
}

// --- The reducer ------------------------------------------------------------------------

export function studyReducer(investigation: StudyInvestigation, progress: StudyProgress, action: StudyAction): StudyProgress {
  const { now } = action;
  switch (action.type) {
    case "open":
      if (!findStep(investigation, action.step) || !canOpenStep(investigation, progress, action.step)) return progress;
      return moveTo(investigation, progress, action.step, now);
    case "next":
      return step(investigation, progress, 1, now);
    case "previous":
      return step(investigation, progress, -1, now);
    case "enterBranch": {
      const branch = findBranch(investigation, action.branchId);
      if (!branch || progress.position.branchId === branch.id) return progress;
      return moveTo(investigation, progress, { stepId: branch.steps[0].id, branchId: branch.id }, now);
    }
    case "returnFromBranch":
      return returnFromBranch(investigation, progress, now);

    case "respond":
      return updateStep(investigation, progress, action.step, now, unlessComplete((state) => (sameJson(state.response, action.response) ? state : { ...state, response: action.response })));
    case "attempt":
      return updateStep(investigation, progress, action.step, now, unlessComplete((state) => ({ ...state, attempts: state.attempts + 1, response: action.response })));
    case "hint": {
      const target = findStep(investigation, action.step);
      return updateStep(
        investigation,
        progress,
        action.step,
        now,
        unlessComplete((state) => {
          const activity = target && resolveActivity(target, state.difficulty).activity;
          const available = activity && activity.type !== "reflect" ? activity.hints.length : 0;
          return state.hintsShown >= available ? state : { ...state, hintsShown: state.hintsShown + 1 };
        }),
      );
    }
    case "sync":
      return updateStep(investigation, progress, action.step, now, (state) => {
        const withText = withReflection(state, action.snapshot.reflection);
        if (state.status === "complete") return withText;
        const { attempts, hintsShown, response } = action.snapshot;
        if (attempts === withText.attempts && hintsShown === withText.hintsShown && sameJson(response, withText.response)) return withText;
        return { ...withText, attempts, hintsShown, response };
      });
    case "reveal":
      return updateStep(investigation, progress, action.step, now, unlessComplete((state) => completeState(state, { revealed: true, response: action.response }, now)));
    case "skip":
      return updateStep(investigation, progress, action.step, now, unlessComplete((state) => (state.skipped ? state : { ...state, skipped: true })));
    case "complete":
      return updateStep(investigation, progress, action.step, now, (state) => {
        const outcome = action.outcome ?? {};
        // A finished step only takes later reflection edits.
        if (state.status === "complete") return withReflection(state, outcome.reflection);
        if (outcome.skipped && state.skipped) return withReflection(state, outcome.reflection);
        return completeState(state, outcome, now);
      });
    case "reflect":
      return updateStep(investigation, progress, action.step, now, (state) => withReflection(state, action.text));

    case "setDifficulty":
      return setDifficulty(investigation, progress, action.difficulty, now);
    case "setLength":
      return setLength(investigation, progress, action.length, now);
    case "finish":
      if (progress.completedAt || !completionState(investigation, progress).complete) return progress;
      return { ...progress, completedAt: now, updatedAt: now };
    case "linkDiscovery":
      return progress.discoveryId === action.discoveryId ? progress : { ...progress, discoveryId: action.discoveryId, updatedAt: now };
    case "restart":
      return restart(investigation, progress, now);
  }
}

// --- Content updates -------------------------------------------------------------------

/**
 * True when progress was made against a newer content version than `content`
 * (this build's investigation, or progress about to be saved over it): an
 * older tab, or a rollback.
 */
export const isFromNewerContent = (progress: Pick<StudyProgress, "contentVersion">, content: { contentVersion: number }) =>
  progress.contentVersion > content.contentVersion;

/**
 * Brings progress made against an older content version up to date. When an
 * investigation's contentVersion is raised (its steps or activities changed):
 *   - step states whose step ids still exist are kept, others are dropped;
 *   - completed steps keep their result exactly as it was;
 *   - unfinished steps start fresh (attempts, hints, and answer reset at the
 *     session difficulty), since their activities may have changed;
 *   - visited branches that no longer exist are forgotten;
 *   - a position on a step that no longer exists moves to the first step;
 *   - completedAt and the Discovery Card link are kept: the learner did
 *     complete it, and finishing again updates the same card.
 * Returns the same progress if the version already matches, and also if the
 * progress is from a newer content version: this build doesn't know the newer
 * steps, so "updating" would drop them and reset answers. The player shows
 * such progress read-only and never saves over it.
 */
export function reconcileContentVersion(investigation: StudyInvestigation, progress: StudyProgress, now: string): StudyProgress {
  if (progress.contentVersion >= investigation.contentVersion) return progress;
  const steps: Record<string, StepState> = {};
  const refs: StepRef[] = [
    ...investigation.steps.map((s) => ({ stepId: s.id })),
    ...investigation.branches.flatMap((branch) => branch.steps.map((s) => ({ stepId: s.id, branchId: branch.id }))),
  ];
  for (const ref of refs) {
    const key = stepKey(ref.stepId, ref.branchId);
    const state = progress.steps[key];
    if (!state) continue;
    if (state.status === "complete") steps[key] = state;
    else {
      // Keeps the reflection text and whether it was skipped; everything else starts over.
      const { response: _stale, ...kept } = state;
      void _stale;
      steps[key] = { ...kept, ...newStepState(investigation, progress, ref, now)!, skipped: state.skipped };
    }
  }
  const branchIds = new Set(investigation.branches.map((branch) => branch.id));
  let next: StudyProgress = {
    ...progress,
    contentVersion: investigation.contentVersion,
    steps,
    visitedBranches: progress.visitedBranches.filter((id) => branchIds.has(id)),
    updatedAt: now,
  };
  if (next.returnTo && !investigation.steps.some((s) => s.id === next.returnTo)) {
    const { returnTo: _gone, ...rest } = next;
    void _gone;
    next = rest;
  }
  if (!findStep(investigation, next.position)) {
    const { returnTo: _gone, ...rest } = next;
    void _gone;
    const first = mainPath(investigation, next.length)[0] ?? investigation.steps[0];
    next = ensureStep(investigation, { ...rest, position: { stepId: first.id } }, { stepId: first.id }, now);
  }
  return next;
}

// --- Saving alongside other tabs ---------------------------------------------------------

/** Completion stamps and Discovery Card links a page has had in its own copy of the progress. */
export type SeenCompletion = Readonly<Record<"completedAt" | "discoveryId", ReadonlySet<string>>>;

/**
 * The record to save when `record` (this page's copy) replaces `stored` (what
 * is in storage now). Progress is last-write-wins, but finishing mustn't be
 * lost to it: if another tab completed the investigation or linked its
 * Discovery Card after this page took over, the stored completedAt and
 * discoveryId are kept rather than dropped. A value this page has seen and
 * removed itself (restarting clears completedAt) stays removed.
 */
export function keepCompletionFromElsewhere(record: StudyProgress, stored: StudyProgress | undefined, seen: SeenCompletion): StudyProgress {
  if (!stored) return record;
  let next = record;
  for (const field of ["completedAt", "discoveryId"] as const) {
    const value = stored[field];
    if (value && !record[field] && !seen[field].has(value)) next = { ...next, [field]: value };
  }
  return next;
}
