/**
 * Vocabulary Matching: match each term with its meaning, its scriptural
 * example, or both (`match`). Extra meanings are plausible distractors. Each
 * meaning and example belongs to one term, so choosing one already in use
 * moves it.
 */
import type { ActivityOf } from "../content-schema";
import { field, stillNeedAnotherLook, stringRecord } from "./parse";
import { seededShuffle } from "./shuffle";
import type { ActivityChecker, CheckResult, ItemFeedback, ItemMark, VocabMatchResponse } from "./types";

type VocabMatch = ActivityOf<"vocab-match">;
export type VocabPart = "meaning" | "example";

export interface VocabOption {
  /** A pair id, or "extra-<index>" for an extra meaning. */
  key: string;
  text: string;
  sourceId?: string;
}

export const asksMeanings = (activity: VocabMatch) => activity.match !== "example";
export const asksExamples = (activity: VocabMatch) => activity.match !== "meaning";

/** Terms that take part in example matching (every pair should have an example when it's asked for). */
const exampleTerms = (activity: VocabMatch) => (asksExamples(activity) ? activity.pairs.filter((pair) => pair.example) : []);
const meaningTerms = (activity: VocabMatch) => (asksMeanings(activity) ? activity.pairs : []);

/** Meanings (including the extras) in a stable shuffled order, so none sits beside its own term. */
export const meaningOptions = (activity: VocabMatch): VocabOption[] =>
  seededShuffle(
    [
      ...activity.pairs.map((pair) => ({ key: pair.id, text: pair.meaning })),
      ...activity.extraMeanings.map((text, index) => ({ key: `extra-${index}`, text })),
    ],
    `${activity.id}:meanings`,
  );

export const exampleOptions = (activity: VocabMatch): VocabOption[] =>
  seededShuffle(
    exampleTerms(activity).map((pair) => ({ key: pair.id, text: pair.example!.text, sourceId: pair.example!.sourceId })),
    `${activity.id}:examples`,
  );

/** Matches a term with an option, or clears it if it was already matched with that option. Options already in use move. */
export function matchTerm(response: VocabMatchResponse, part: VocabPart, termId: string, optionKey: string): VocabMatchResponse {
  const key = part === "meaning" ? "meanings" : "examples";
  const current = { ...response[key] };
  if (current[termId] === optionKey) delete current[termId];
  else {
    for (const [term, value] of Object.entries(current)) if (value === optionKey) delete current[term];
    current[termId] = optionKey;
  }
  return { ...response, [key]: current };
}

export const vocabMatch: ActivityChecker<VocabMatch, VocabMatchResponse> = {
  empty: () => ({ meanings: {}, examples: {} }),

  parse(activity, value) {
    const termIds = new Set(activity.pairs.map((pair) => pair.id));
    const meaningKeys = new Set(meaningOptions(activity).map((option) => option.key));
    const exampleKeys = new Set(exampleOptions(activity).map((option) => option.key));
    return {
      meanings: asksMeanings(activity) ? stringRecord(field(value, "meanings"), termIds, meaningKeys) : {},
      examples: asksExamples(activity) ? stringRecord(field(value, "examples"), termIds, exampleKeys) : {},
    };
  },

  isComplete: (activity, response) =>
    meaningTerms(activity).every((pair) => !!response.meanings[pair.id]) &&
    exampleTerms(activity).every((pair) => !!response.examples[pair.id]),

  check(activity, response): CheckResult {
    const marks: Record<string, ItemMark> = {};
    const feedback: ItemFeedback[] = [];
    const withExample = new Set(exampleTerms(activity).map((pair) => pair.id));
    let right = 0;
    for (const pair of activity.pairs) {
      const parts: boolean[] = [];
      if (asksMeanings(activity) && response.meanings[pair.id]) {
        const ok = response.meanings[pair.id] === pair.id;
        marks[`${pair.id}:meaning`] = ok ? "correct" : "incorrect";
        if (!ok) feedback.push({ itemId: `${pair.id}:meaning`, message: `Think about how ‘${pair.term}’ is used in the scriptures. Which meaning fits that use?` });
        parts.push(ok);
      }
      if (withExample.has(pair.id) && response.examples[pair.id]) {
        const ok = response.examples[pair.id] === pair.id;
        marks[`${pair.id}:example`] = ok ? "correct" : "incorrect";
        if (!ok) feedback.push({ itemId: `${pair.id}:example`, message: `Which passage shows ‘${pair.term}’ in action? Read the examples again.` });
        parts.push(ok);
      }
      // The term as a whole: wrong if any part is wrong, right once every part asked for is right.
      const required = (asksMeanings(activity) ? 1 : 0) + (withExample.has(pair.id) ? 1 : 0);
      if (parts.some((ok) => !ok)) marks[pair.id] = "incorrect";
      else if (required > 0 && parts.length === required) {
        marks[pair.id] = "correct";
        right++;
      }
    }
    const total = activity.pairs.filter((pair) => asksMeanings(activity) || withExample.has(pair.id)).length;
    const correct = right === total;
    return {
      correct,
      marks,
      feedback,
      summary: correct
        ? "Every term is matched the way the scriptures use it."
        : stillNeedAnotherLook(total - right, "term", "terms"),
    };
  },

  reveal: (activity) => ({
    meanings: Object.fromEntries(meaningTerms(activity).map((pair) => [pair.id, pair.id])),
    examples: Object.fromEntries(exampleTerms(activity).map((pair) => [pair.id, pair.id])),
  }),
};
