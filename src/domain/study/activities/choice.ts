/**
 * Checking for choice questions, shared by Follow the Clues and Scripture
 * Connections. A wrong choice gets its own `feedback` (written to send the
 * learner back to the evidence); multiple-answer questions say how many
 * answers are still missing, never which.
 */
import type { ChoiceQuestion } from "../content-schema";
import { capitalize, countOf, idSet, stringList } from "./parse";
import { seededShuffle } from "./shuffle";
import type { CheckResult, ItemFeedback, ItemMark } from "./types";

export const DEFAULT_OPTION_FEEDBACK = "That doesn't quite match what the evidence says. Read it again, slowly.";

/**
 * Options in a stable shuffled order. Authors tend to write the right answer
 * first (and often longest), so showing options as written would give it away.
 * `seed` should identify the question uniquely, e.g. "<activity id>:<question id>".
 */
export const choiceOptions = (question: ChoiceQuestion, seed: string) => seededShuffle(question.options, `${seed}:options`);

/** Selected option ids that still exist, once each. */
export const parseChoice = (question: ChoiceQuestion, value: unknown): string[] => {
  const selected = stringList(value, idSet(question.options));
  return question.multiple ? selected : selected.slice(0, 1);
};

export const isChoiceComplete = (selected: readonly string[]) => selected.length > 0;

/** Selecting an option: replaces the answer for single-answer questions, toggles it for multiple. */
export function toggleChoice(question: ChoiceQuestion, selected: readonly string[], optionId: string): string[] {
  if (!question.multiple) return [optionId];
  return selected.includes(optionId) ? selected.filter((id) => id !== optionId) : [...selected, optionId];
}

/**
 * Checks one question. `keyPrefix` namespaces mark and feedback keys when an
 * activity has several questions (e.g. "q1/").
 */
export function checkChoice(question: ChoiceQuestion, selected: readonly string[], keyPrefix = ""): CheckResult {
  const correctIds = new Set(question.correct);
  const chosen = parseChoice(question, selected);
  const marks: Record<string, ItemMark> = {};
  const feedback: ItemFeedback[] = [];
  let found = 0;
  let wrong = 0;
  for (const id of chosen) {
    if (correctIds.has(id)) {
      found++;
      marks[keyPrefix + id] = "correct";
    } else {
      wrong++;
      marks[keyPrefix + id] = "incorrect";
      const option = question.options.find((o) => o.id === id);
      feedback.push({ itemId: keyPrefix + id, message: option?.feedback ?? DEFAULT_OPTION_FEEDBACK });
    }
  }
  const remaining = correctIds.size - found;
  const correct = wrong === 0 && remaining === 0;

  let summary: string;
  if (correct) summary = question.multiple ? "Those answers fit the evidence." : "That fits the evidence.";
  else if (!question.multiple) summary = "Not yet. Look again at the evidence.";
  else if (wrong > 0) {
    summary = `${capitalize(countOf(wrong, "choice doesn't", "choices don't"))} fit the evidence.`;
    if (remaining > 0) summary += ` There ${remaining === 1 ? "is" : "are"} also ${countOf(remaining, "more answer", "more answers")} to find.`;
  } else summary = `So far, so good. ${capitalize(countOf(remaining, "more answer", "more answers"))} to find.`;

  return { correct, marks, feedback, summary, remaining: question.multiple ? remaining : undefined };
}
