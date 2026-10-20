import type { Investigation } from "./investigation";
import type { CuratedQuestion } from "./question-bank";

interface CreateOptions {
  id: string;
  /** ISO timestamp used for both createdAt and updatedAt. */
  now: string;
}

export function createInvestigation({ id, now }: CreateOptions): Investigation {
  return {
    id,
    question: "",
    title: "",
    category: "",
    createdAt: now,
    updatedAt: now,
    currentSection: "question",
    context: "",
    subquestions: [],
    hypotheses: [],
    evidence: [],
    analysisNotes: "",
    claims: [],
    conclusion: "",
    remainingQuestions: "",
    reflectionNotes: "",
    status: "investigating",
  };
}

/**
 * Starts an investigation from a curated question. Only the question text,
 * category, and a link back to the bank entry are copied. Suggested
 * references are deliberately not turned into evidence: they are starting
 * points the user still has to study and record themselves.
 */
export function createInvestigationFromQuestion(question: CuratedQuestion, options: CreateOptions): Investigation {
  return {
    ...createInvestigation(options),
    question: question.question,
    title: question.question,
    category: question.category,
    sourceQuestionId: question.id,
  };
}
