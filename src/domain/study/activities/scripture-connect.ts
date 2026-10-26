/**
 * Scripture Connections: read two or more passages side by side, then answer
 * up to three choice questions about how they relate.
 */
import type { ActivityOf } from "../content-schema";
import { checkChoice, isChoiceComplete, parseChoice } from "./choice";
import { field, isRecord } from "./parse";
import type { ActivityChecker, CheckResult, ItemFeedback, ItemMark, ScriptureConnectResponse } from "./types";

type ScriptureConnect = ActivityOf<"scripture-connect">;

/** The key prefix for a question's option marks and feedback. */
export const questionKey = (questionId: string) => `${questionId}/`;

export const scriptureConnect: ActivityChecker<ScriptureConnect, ScriptureConnectResponse> = {
  empty: () => ({ answers: {} }),

  parse(activity, value) {
    const stored = field(value, "answers");
    const answers: Record<string, string[]> = {};
    for (const question of activity.questions) {
      const selected = parseChoice(question, isRecord(stored) ? stored[question.id] : undefined);
      if (selected.length) answers[question.id] = selected;
    }
    return { answers };
  },

  isComplete: (activity, response) => activity.questions.every((q) => isChoiceComplete(response.answers[q.id] ?? [])),

  check(activity, response): CheckResult {
    const results = activity.questions.map((question) => ({
      question,
      result: checkChoice(question, response.answers[question.id] ?? [], questionKey(question.id)),
    }));
    // One question: its own wording is the clearest.
    if (results.length === 1) {
      const [{ question, result }] = results;
      if ((response.answers[question.id] ?? []).length) result.marks[question.id] = result.correct ? "correct" : "incorrect";
      return result;
    }
    const marks: Record<string, ItemMark> = {};
    const feedback: ItemFeedback[] = [];
    let right = 0;
    for (const { question, result } of results) {
      Object.assign(marks, result.marks);
      feedback.push(...result.feedback);
      if ((response.answers[question.id] ?? []).length) marks[question.id] = result.correct ? "correct" : "incorrect";
      if (result.correct) right++;
    }
    const correct = right === results.length;
    return {
      correct,
      marks,
      feedback,
      summary: correct
        ? "Each answer fits the passages."
        : `${right} of ${results.length} answers fit the passages. Look again at the ${results.length - right === 1 ? "question" : "questions"} marked.`,
    };
  },

  reveal: (activity) => ({ answers: Object.fromEntries(activity.questions.map((q) => [q.id, [...q.correct]])) }),
};
