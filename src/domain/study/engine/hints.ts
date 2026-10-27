/**
 * The help policy for checked activities. Help is gentle and progressive, and
 * nobody is ever stuck or penalized:
 *
 *   - Hints can be requested from the start ("Need a hint?"), one at a time,
 *     each clearer than the last.
 *   - Where the host allows it, "Continue anyway" (skip) is offered from the
 *     start too, so nobody is held on a step. Skipping is recoverable: the
 *     step can be tried again later, and a skipped step adds nothing to the
 *     Discovery Card. The host keeps the button quiet so it doesn't tempt
 *     anyone before they've tried.
 *   - After a wrong check, item feedback points back to the evidence (never
 *     the answer), and the next hint is offered.
 *   - After 2 checked attempts, or after 1 once every hint has been shown,
 *     "Show me" is offered (reveal the answer with its explanation;
 *     connections are then recorded as suggested). Someone who thinks an
 *     answer is arguable shouldn't have to make deliberate wrong guesses to
 *     see it, and a younger learner shouldn't have to grind through many.
 *   - When the hints run out, "More help" points to the evidence to reread.
 */
import { activitySourceIds } from "../content-registry";
import type { Activity, ActivityType, Source } from "../content-schema";

/** Checked attempts after which "Show me" is offered (after 1, once every hint has been shown). */
export const ATTEMPTS_BEFORE_REVEAL = 2;

export interface HelpState {
  attempts: number;
  hintsShown: number;
  /** Finished: answered correctly, revealed, or continued. */
  completed: boolean;
  /** The most recent check was wrong (and the answer hasn't changed since). */
  lastCheckWrong?: boolean;
}

export interface HelpOptions {
  /** Item feedback from the last check is shown. */
  showFeedback: boolean;
  /** "Need a hint?" is available: hints remain and the activity isn't finished. */
  canRequestHint: boolean;
  /** The next hint is offered prominently, after a wrong check. */
  offerHint: boolean;
  /** The next hint to show, if any remain. */
  nextHint?: { index: number; text: string };
  /** Every hint has been shown, so "More help" (pointing at the evidence) takes their place. */
  hintsExhausted: boolean;
  /** "Show me". */
  canReveal: boolean;
  /** "Continue anyway", from the start; only when the host allows skipping. */
  canSkip: boolean;
}

export const hintsOf = (activity: Activity): readonly string[] => (activity.type === "reflect" ? [] : activity.hints);

export function helpOptions(activity: Activity, state: HelpState, options: { allowSkip?: boolean } = {}): HelpOptions {
  const hints = hintsOf(activity);
  const open = !state.completed && activity.type !== "reflect";
  const index = Math.min(state.hintsShown, hints.length);
  const nextHint = open && index < hints.length ? { index, text: hints[index] } : undefined;
  const hintsUsed = hints.length > 0 && index >= hints.length;
  // "Show me" waits for a real try or two, so the answer isn't one tap away before anyone has looked.
  const enoughAttempts = state.attempts >= ATTEMPTS_BEFORE_REVEAL || (state.attempts >= 1 && hintsUsed);
  return {
    showFeedback: open && !!state.lastCheckWrong,
    canRequestHint: !!nextHint,
    offerHint: !!nextHint && !!state.lastCheckWrong,
    nextHint,
    hintsExhausted: open && hintsUsed,
    canReveal: open && enoughAttempts,
    canSkip: open && !!options.allowSkip,
  };
}

/** How to look again, by activity type. Written by Gospel Labs; shown as a suggestion. */
export const LOOK_AGAIN: Record<ActivityType, string> = {
  "evidence-connect": "Take one statement at a time. Read each piece of evidence and ask: does this say what the statement says?",
  clue: "Lay the clues side by side. The answer should fit every clue, not just one of them.",
  "build-principle": "Start with what the evidence states plainly. Leave out any piece that adds something the sources don't say.",
  compare: "For each perspective, look for the words in the sources that speak to it. If none do, it may go beyond them.",
  "scripture-connect": "Read the passages one after the other, and notice the words and ideas they share.",
  "vocab-match": "Find each term where it appears in the scriptures. How is it used there?",
  sort: "Take the items one at a time, and test each against the description of each group.",
  highlight: "Read the passage phrase by phrase, and ask of each one: does this answer the question?",
  reflect: "There is no right answer here. Write as much or as little as you like, or simply ponder.",
};

export interface EvidencePointer {
  text: string;
  /** The evidence worth rereading, in the activity's order. */
  sourceIds: string[];
}

/** Where to look again once the hints have run out. Never gives the answer. */
export function evidencePointer(activity: Activity, sources: Readonly<Record<string, Source>> = {}): EvidencePointer {
  const sourceIds = activitySourceIds(activity).filter((id) => !Object.keys(sources).length || sources[id]);
  const labels = sourceIds.map((id) => sources[id]?.label).filter((label): label is string => !!label);
  const reread = labels.length ? ` Reread ${listOf(labels)}.` : "";
  return { text: `${LOOK_AGAIN[activity.type]}${reread}`, sourceIds };
}

/** "A", "A and B", "A, B, and C". */
export function listOf(items: readonly string[]): string {
  if (items.length <= 2) return items.join(" and ");
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
