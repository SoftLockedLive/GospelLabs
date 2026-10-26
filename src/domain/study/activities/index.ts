/**
 * Answer checking for every activity type. Pure and synchronous: hosts pass
 * the activity and the learner's response (as stored, `unknown`), and get back
 * which parts fit the evidence, feedback that points back to the evidence,
 * whether "Check" can be enabled, and the correct response for "Show me".
 *
 * Reflections are never checked: they are always complete and always "correct".
 */
import type { Activity, ActivityOf, ActivityType } from "../content-schema";
import { buildPrinciple } from "./build-principle";
import { clue } from "./clue";
import { compare } from "./compare";
import { evidenceConnect } from "./evidence-connect";
import { highlight } from "./highlight";
import { scriptureConnect } from "./scripture-connect";
import { sort } from "./sort";
import type { ActivityChecker, CheckResult, ResponseFor } from "./types";
import { vocabMatch } from "./vocab-match";

export type * from "./types";

const reflect: ActivityChecker<ActivityOf<"reflect">, ResponseFor<"reflect">> = {
  empty: () => ({}),
  parse: () => ({}),
  isComplete: () => true,
  check: () => ({ correct: true, marks: {}, feedback: [], summary: "" }),
  reveal: () => ({}),
};

const CHECKERS: { [T in ActivityType]: ActivityChecker<ActivityOf<T>, ResponseFor<T>> } = {
  "evidence-connect": evidenceConnect,
  clue,
  "build-principle": buildPrinciple,
  compare,
  "scripture-connect": scriptureConnect,
  "vocab-match": vocabMatch,
  sort,
  highlight,
  reflect,
};

/** The checker for an activity's type. */
export function checkerFor<A extends Activity>(activity: A): ActivityChecker<A, ResponseFor<A["type"]>> {
  return CHECKERS[activity.type] as unknown as ActivityChecker<A, ResponseFor<A["type"]>>;
}

/** Whether an activity is ever checked (everything except reflections). */
export const isCheckedActivity = (activity: Activity) => activity.type !== "reflect";

export const emptyResponse = <A extends Activity>(activity: A): ResponseFor<A["type"]> => checkerFor(activity).empty(activity);

/** A stored response, cleaned of anything malformed or no longer in the activity. */
export const parseResponse = <A extends Activity>(activity: A, value: unknown): ResponseFor<A["type"]> =>
  value === undefined || value === null ? emptyResponse(activity) : checkerFor(activity).parse(activity, value);

/** All required inputs are given, so "Check" can be enabled. */
export const isComplete = (activity: Activity, response: unknown): boolean =>
  checkerFor(activity).isComplete(activity, parseResponse(activity, response));

export const check = (activity: Activity, response: unknown): CheckResult => checkerFor(activity).check(activity, parseResponse(activity, response));

/** The correct response, for "Show me". */
export const revealResponse = <A extends Activity>(activity: A): ResponseFor<A["type"]> => checkerFor(activity).reveal(activity);
