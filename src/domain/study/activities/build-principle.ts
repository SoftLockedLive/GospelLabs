/**
 * Build the Principle: arrange fragments into one statement the evidence
 * supports. The `solution` or any of the `alternatives` is accepted, exactly
 * as ordered; fragments in none of them are distractors and must not be used.
 */
import type { ActivityOf } from "../content-schema";
import { capitalize, countOf, field, idSet, sameOrder, sameSet, stringList } from "./parse";
import { seededShuffle } from "./shuffle";
import type { ActivityChecker, BuildPrincipleResponse, CheckResult, ItemFeedback, ItemMark } from "./types";

type BuildPrinciple = ActivityOf<"build-principle">;

export const DISTRACTOR_FEEDBACK = "Check this piece against the evidence. Do the sources really say it?";

const acceptedOrders = (activity: BuildPrinciple) => [activity.solution, ...activity.alternatives];

/** Fragments in a stable shuffled order, so the pieces never start out in solution order. */
export const fragmentOptions = (activity: BuildPrinciple) => seededShuffle(activity.fragments, `${activity.id}:fragments`);

/**
 * The arranged fragments read as one sentence: single spaces, no space
 * before punctuation, a capital first letter, and a closing full stop.
 */
export function assembleSentence(parts: readonly string[]): string {
  const joined = parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+([,.;:!?])/g, "$1");
  if (!joined) return "";
  const sentence = capitalize(joined);
  return /[.!?…]["”’)]?$/.test(sentence) ? sentence : `${sentence.replace(/[,;:]$/, "")}.`;
}

/** Moves the fragment at `index` by `delta` places (−1 up, +1 down), staying in bounds. */
export function moveFragment(response: BuildPrincipleResponse, index: number, delta: number): BuildPrincipleResponse {
  const target = index + delta;
  if (index < 0 || index >= response.order.length || target < 0 || target >= response.order.length) return response;
  const order = [...response.order];
  [order[index], order[target]] = [order[target], order[index]];
  return { order };
}

export const buildPrinciple: ActivityChecker<BuildPrinciple, BuildPrincipleResponse> = {
  empty: () => ({ order: [] }),

  parse: (activity, value) => ({ order: stringList(field(value, "order"), idSet(activity.fragments)) }),

  isComplete: (_activity, response) => response.order.length >= 2,

  check(activity, response): CheckResult {
    const accepted = acceptedOrders(activity);
    const order = response.order;
    if (accepted.some((candidate) => sameOrder(candidate, order))) {
      return {
        correct: true,
        marks: Object.fromEntries(order.map((id) => [id, "correct" as const])),
        feedback: [],
        summary: "That principle is supported by the evidence.",
      };
    }

    const allowed = new Set(accepted.flat());
    const distractors = order.filter((id) => !allowed.has(id));
    const marks: Record<string, ItemMark> = Object.fromEntries(distractors.map((id) => [id, "incorrect" as const]));
    const feedback: ItemFeedback[] = distractors.map((id) => ({ itemId: id, message: DISTRACTOR_FEEDBACK }));

    let summary: string;
    if (distractors.length > 0) {
      summary = `${capitalize(countOf(distractors.length, "piece doesn't", "pieces don't"))} fit the evidence. Look again at the one${distractors.length === 1 ? "" : "s"} marked.`;
    } else if (accepted.some((candidate) => sameSet(candidate, order))) {
      summary = "You have the right pieces. Try another order, so they read as one statement the evidence supports.";
    } else if (accepted.some((candidate) => order.every((id) => candidate.includes(id)))) {
      summary = "You're on the right track, but the principle isn't complete yet. Something the evidence teaches is missing.";
    } else if (accepted.some((candidate) => candidate.every((id) => order.includes(id)))) {
      summary = "There's more here than one principle needs. Try taking a piece out.";
    } else {
      summary = "These pieces don't quite form one principle yet. Look again at what the evidence says.";
    }
    return { correct: false, marks, feedback, summary };
  },

  reveal: (activity) => ({ order: [...activity.solution] }),
};
