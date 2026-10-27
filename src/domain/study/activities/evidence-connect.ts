/**
 * Evidence Connections: each claim (left) is connected to the evidence
 * (right) that supports it. Right items may be distractors. A wrong pair gets
 * the pair's `clue`, which sends the learner back to the evidence.
 */
import type { ActivityOf } from "../content-schema";
import { field, idSet, stillNeedAnotherLook, stringRecord } from "./parse";
import { seededShuffle } from "./shuffle";
import type { ActivityChecker, CheckResult, EvidenceConnectResponse, ItemFeedback, ItemMark } from "./types";

type EvidenceConnect = ActivityOf<"evidence-connect">;

export const DEFAULT_PAIR_CLUE = "Read that evidence again. Does it really say this, or does a different piece fit better?";

/**
 * True when no two claims share a piece of evidence, so connecting evidence
 * that is already in use should move it rather than share it.
 */
export const isOneToOne = (activity: EvidenceConnect) => new Set(activity.pairs.map((pair) => pair.right)).size === activity.pairs.length;

/** Right items in a stable shuffled order (authors often list them in pair order). */
export const evidenceOptions = (activity: EvidenceConnect) => seededShuffle(activity.right.items, `${activity.id}:right`);

/** Connects `left` to `right`, or disconnects them if they were connected. One-to-one activities move evidence already in use. */
export function connectPair(activity: EvidenceConnect, response: EvidenceConnectResponse, left: string, right: string): EvidenceConnectResponse {
  const pairs = { ...response.pairs };
  if (pairs[left] === right) {
    delete pairs[left];
    return { pairs };
  }
  if (isOneToOne(activity)) for (const [key, value] of Object.entries(pairs)) if (value === right) delete pairs[key];
  pairs[left] = right;
  return { pairs };
}

export const evidenceConnect: ActivityChecker<EvidenceConnect, EvidenceConnectResponse> = {
  empty: () => ({ pairs: {} }),

  parse: (activity, value) => ({ pairs: stringRecord(field(value, "pairs"), idSet(activity.left.items), idSet(activity.right.items)) }),

  isComplete: (activity, response) => activity.left.items.every((item) => !!response.pairs[item.id]),

  check(activity, response): CheckResult {
    const marks: Record<string, ItemMark> = {};
    const feedback: ItemFeedback[] = [];
    let right = 0;
    for (const pair of activity.pairs) {
      const chosen = response.pairs[pair.left];
      if (!chosen) continue;
      if (chosen === pair.right) {
        right++;
        marks[pair.left] = "correct";
      } else {
        marks[pair.left] = "incorrect";
        feedback.push({ itemId: pair.left, message: pair.clue ?? DEFAULT_PAIR_CLUE });
      }
    }
    const total = activity.pairs.length;
    const correct = right === total;
    return {
      correct,
      marks,
      feedback,
      summary: correct
        ? "Every connection is supported by the evidence."
        : stillNeedAnotherLook(total - right, "connection", "connections"),
    };
  },

  reveal: (activity) => ({ pairs: Object.fromEntries(activity.pairs.map((pair) => [pair.left, pair.right])) }),
};
