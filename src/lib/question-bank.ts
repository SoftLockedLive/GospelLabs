import rawQuestionBank from "@/data/question-bank.json";
import { formatQuestionBankIssues, parseQuestionBank, type CuratedQuestion } from "@/domain/question-bank";

/**
 * The validated question bank. Validation runs when this module is first
 * loaded (at build time for static pages), so an invalid entry fails the
 * build with a precise report instead of shipping broken data.
 */
function loadQuestionBank(): readonly CuratedQuestion[] {
  const { questions, issues } = parseQuestionBank(rawQuestionBank);
  if (issues.length > 0) {
    throw new Error(
      `src/data/question-bank.json has ${issues.length} problem${issues.length === 1 ? "" : "s"}:\n${formatQuestionBankIssues(issues)}`,
    );
  }
  return questions;
}

export const QUESTION_BANK: readonly CuratedQuestion[] = loadQuestionBank();

export function getCuratedQuestion(id: string): CuratedQuestion | undefined {
  return QUESTION_BANK.find((question) => question.id === id);
}
