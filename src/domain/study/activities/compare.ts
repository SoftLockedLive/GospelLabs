/**
 * Compare Perspectives: decide whether each perspective is supported by the
 * sources, goes beyond them, or is contradicted by them. A wrong verdict gets
 * a question about the evidence that fits the verdict chosen, which narrows
 * the search without naming the answer. Rationales are shown once a
 * perspective is judged correctly, and for all of them at the end.
 */
import type { ActivityOf } from "../content-schema";
import { VERDICTS, type Verdict } from "../vocabulary";
import { field, idSet, stringRecord } from "./parse";
import type { ActivityChecker, CheckResult, CompareResponse, ItemFeedback, ItemMark } from "./types";

type Compare = ActivityOf<"compare">;

/** Feedback for a wrong verdict, by the verdict the learner chose. */
export const VERDICT_FEEDBACK: Record<Verdict, string> = {
  supported: "Look for the words in the sources that say this. If you can't find them, it may add something they don't say.",
  beyond: "Look again: do the sources speak to this directly, either for it or against it?",
  contradicted: "Look again: does anything in the sources actually say the opposite?",
};

const VERDICT_SET: ReadonlySet<string> = new Set(VERDICTS);

export const compare: ActivityChecker<Compare, CompareResponse> = {
  empty: () => ({ verdicts: {} }),

  parse: (activity, value) => ({
    verdicts: stringRecord(field(value, "verdicts"), idSet(activity.perspectives), VERDICT_SET) as Record<string, Verdict>,
  }),

  isComplete: (activity, response) => activity.perspectives.every((p) => !!response.verdicts[p.id]),

  check(activity, response): CheckResult {
    const marks: Record<string, ItemMark> = {};
    const feedback: ItemFeedback[] = [];
    let right = 0;
    for (const perspective of activity.perspectives) {
      const chosen = response.verdicts[perspective.id];
      if (!chosen) continue;
      if (chosen === perspective.verdict) {
        right++;
        marks[perspective.id] = "correct";
      } else {
        marks[perspective.id] = "incorrect";
        feedback.push({ itemId: perspective.id, message: VERDICT_FEEDBACK[chosen] });
      }
    }
    const total = activity.perspectives.length;
    const correct = right === total;
    return {
      correct,
      marks,
      feedback,
      summary: correct
        ? "Each judgment fits the sources."
        : `${right} of ${total} judgments fit the sources. Look again at the ones marked.`,
    };
  },

  reveal: (activity) => ({ verdicts: Object.fromEntries(activity.perspectives.map((p) => [p.id, p.verdict])) }),
};
