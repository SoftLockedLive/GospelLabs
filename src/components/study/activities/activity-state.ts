/**
 * Pure state logic behind ActivityRenderer, kept out of the component so it
 * can be tested directly: restoring a saved state, and turning checks,
 * hints, reveals, and skips into the next state and the result to report.
 */
import { check, isComplete, parseResponse, revealResponse, type CheckResult } from "@/domain/study/activities";
import type { Activity } from "@/domain/study/content-schema";
import { INITIAL_ACTIVITY_STATE, type ActivityResult, type ActivityState } from "./types";

/** The last check, with the response it judged (so marks can go stale as the learner edits). */
export interface CheckedResponse {
  response: unknown;
  result: CheckResult;
}

export type FinishedAs = "solved" | "revealed" | null;

export const finishedAs = (state: ActivityState): FinishedAs => (state.completed ? (state.revealed ? "revealed" : "solved") : null);

/** A saved state with defaults filled in and the response cleaned against the activity as it is now. */
export function restoreActivityState(activity: Activity, initial: Partial<ActivityState> = {}): ActivityState {
  const state: ActivityState = { ...INITIAL_ACTIVITY_STATE, ...initial };
  const response = parseResponse(activity, initial.response);
  // A revealed activity always shows the full answer, and so does a finished one whose answer wasn't
  // kept (some hosts remember only that an activity was completed).
  const showAnswer = state.revealed || (state.completed && activity.type !== "reflect" && !isComplete(activity, response));
  return { ...state, response: showAnswer ? revealResponse(activity) : response };
}

/** What a restored, finished activity shows: its final marks. Unfinished activities start without marks. */
export const restoredCheck = (activity: Activity, state: ActivityState): CheckedResponse | null =>
  state.completed && activity.type !== "reflect" ? { response: state.response, result: check(activity, state.response) } : null;

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** The last check was wrong and the answer hasn't changed since. */
export const isStaleWrong = (checked: CheckedResponse | null, response: unknown) =>
  !!checked && !checked.result.correct && sameJson(checked.response, response);

export function applyCheck(activity: Activity, state: ActivityState): { state: ActivityState; checked: CheckedResponse } {
  const result = check(activity, state.response);
  const next: ActivityState = { ...state, attempts: state.attempts + 1, completed: result.correct };
  return { state: next, checked: { response: state.response, result } };
}

export function applyReveal(activity: Activity, state: ActivityState): { state: ActivityState; checked: CheckedResponse } {
  const response = revealResponse(activity);
  const next: ActivityState = { ...state, response, revealed: true, completed: true };
  return { state: next, checked: { response, result: check(activity, response) } };
}

export const applyHint = (state: ActivityState, available: number): ActivityState =>
  state.hintsShown >= available ? state : { ...state, hintsShown: state.hintsShown + 1 };

export function resultOf(state: ActivityState, how: { skipped?: boolean } = {}): ActivityResult {
  const skipped = !!how.skipped;
  return {
    demonstrated: state.completed && !state.revealed && !skipped,
    revealed: state.revealed,
    skipped,
    attempts: state.attempts,
    hintsShown: state.hintsShown,
    response: state.response,
    reflection: state.reflection,
  };
}
