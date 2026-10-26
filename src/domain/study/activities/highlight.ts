/**
 * Highlight: tap the phrases of a passage that answer the prompt. Correct when
 * enough targets are selected (`minTargets`, by default all of them) and no
 * phrase that isn't a target is. Feedback says how many targets remain,
 * never which ones.
 */
import type { ActivityOf } from "../content-schema";
import { capitalize, countOf, field } from "./parse";
import type { ActivityChecker, CheckResult, HighlightResponse, ItemFeedback, ItemMark } from "./types";

type Highlight = ActivityOf<"highlight">;

export const WRONG_PHRASE_FEEDBACK = "This phrase doesn't answer the question. Read it again in its verse.";

/** How many targets must be found. */
export const targetsRequired = (activity: Highlight) => activity.minTargets ?? activity.targets.length;

export function toggleChunk(response: HighlightResponse, index: number): HighlightResponse {
  const selected = response.selected.includes(index)
    ? response.selected.filter((i) => i !== index)
    : [...response.selected, index].sort((a, b) => a - b);
  return { selected };
}

export const highlight: ActivityChecker<Highlight, HighlightResponse> = {
  empty: () => ({ selected: [] }),

  parse(activity, value) {
    const stored = field(value, "selected");
    if (!Array.isArray(stored)) return { selected: [] };
    const valid = stored.filter((i): i is number => Number.isInteger(i) && i >= 0 && i < activity.chunks.length);
    return { selected: [...new Set(valid)].sort((a, b) => a - b) };
  },

  isComplete: (_activity, response) => response.selected.length > 0,

  check(activity, response): CheckResult {
    const targets = new Set(activity.targets);
    const marks: Record<string, ItemMark> = {};
    const feedback: ItemFeedback[] = [];
    let found = 0;
    let wrong = 0;
    for (const index of response.selected) {
      if (targets.has(index)) {
        found++;
        marks[String(index)] = "correct";
      } else {
        wrong++;
        marks[String(index)] = "incorrect";
        feedback.push({ itemId: String(index), message: WRONG_PHRASE_FEEDBACK });
      }
    }
    const required = targetsRequired(activity);
    const remaining = Math.max(0, required - found);
    const correct = remaining === 0 && wrong === 0;

    let summary: string;
    if (correct) summary = found === 1 ? "That phrase answers the question." : "Those phrases answer the question.";
    else if (wrong > 0) {
      summary = `${capitalize(countOf(wrong, "phrase you chose doesn't", "phrases you chose don't"))} answer the question.`;
      if (remaining > 0) summary += ` ${capitalize(countOf(remaining, "more phrase", "more phrases"))} to find.`;
    } else summary = `Good. ${capitalize(countOf(remaining, "more phrase", "more phrases"))} to find.`;

    return { correct, marks, feedback, summary, remaining };
  },

  reveal: (activity) => ({ selected: [...new Set(activity.targets)].sort((a, b) => a - b) }),
};
