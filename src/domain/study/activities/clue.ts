/**
 * Clue Investigation: the learner examines clues one at a time (at least
 * `minRevealed`, by default all of them), then answers what they show together.
 */
import type { ActivityOf } from "../content-schema";
import { checkChoice, isChoiceComplete, parseChoice } from "./choice";
import { field, idSet, stringList } from "./parse";
import type { ActivityChecker, ClueResponse } from "./types";

type Clue = ActivityOf<"clue">;

/** How many clues must be examined before answering. */
export const cluesRequired = (activity: Clue) => activity.minRevealed ?? activity.clues.length;

export const canAnswerClue = (activity: Clue, response: ClueResponse) => response.examined.length >= cluesRequired(activity);

/** Marks a clue examined (once; the order they were opened is kept). */
export const examineClue = (response: ClueResponse, clueId: string): ClueResponse =>
  response.examined.includes(clueId) ? response : { ...response, examined: [...response.examined, clueId] };

export const clue: ActivityChecker<Clue, ClueResponse> = {
  empty: () => ({ examined: [], answer: [] }),

  parse: (activity, value) => ({
    examined: stringList(field(value, "examined"), idSet(activity.clues)),
    answer: parseChoice(activity.question, field(value, "answer")),
  }),

  isComplete: (activity, response) => canAnswerClue(activity, response) && isChoiceComplete(response.answer),

  check: (activity, response) => checkChoice(activity.question, response.answer),

  reveal: (activity) => ({ examined: activity.clues.map((c) => c.id), answer: [...activity.question.correct] }),
};
