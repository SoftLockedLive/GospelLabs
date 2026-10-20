import type { CuratedQuestion, Difficulty } from "./question-bank";

export interface QuestionFilters {
  query: string;
  category: string | null;
  difficulty: Difficulty | null;
}

export const EMPTY_QUESTION_FILTERS: QuestionFilters = { query: "", category: null, difficulty: null };

export function hasActiveFilters(filters: QuestionFilters): boolean {
  return filters.query.trim() !== "" || filters.category !== null || filters.difficulty !== null;
}

/** Lowercases, strips diacritics, and straightens quotes and dashes so search is forgiving. */
export function normalizeSearchText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function searchableText(question: CuratedQuestion): string {
  return normalizeSearchText(
    [
      question.question,
      question.category,
      ...question.tags,
      ...question.suggestedReferences.map((reference) => reference.label),
    ].join(" "),
  );
}

/** Every whitespace-separated term must appear somewhere in the question's text, category, tags, or references. */
export function matchesQuery(question: CuratedQuestion, query: string): boolean {
  const terms = normalizeSearchText(query).split(" ").filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = searchableText(question);
  return terms.every((term) => haystack.includes(term));
}

export function filterQuestions(questions: readonly CuratedQuestion[], filters: QuestionFilters): CuratedQuestion[] {
  return questions.filter(
    (question) =>
      (filters.category === null || question.category === filters.category) &&
      (filters.difficulty === null || question.difficulty === filters.difficulty) &&
      matchesQuery(question, filters.query),
  );
}

export interface CategorySummary {
  name: string;
  count: number;
}

/** Distinct categories in alphabetical order, with how many questions each has. */
export function listCategories(questions: readonly CuratedQuestion[]): CategorySummary[] {
  const counts = new Map<string, number>();
  for (const question of questions) counts.set(question.category, (counts.get(question.category) ?? 0) + 1);
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

interface RandomOptions {
  /** Avoid returning this id when another choice exists (e.g. the question currently shown). */
  excludeId?: string;
  /** Returns a number in [0, 1). Injectable for testing; defaults to Math.random. */
  random?: () => number;
}

/** Picks one item uniformly at random, or undefined when there is nothing to pick. */
export function pickRandomQuestion<T extends { id: string }>(
  items: readonly T[],
  { excludeId, random = Math.random }: RandomOptions = {},
): T | undefined {
  const candidates = items.length > 1 && excludeId ? items.filter((item) => item.id !== excludeId) : items;
  if (candidates.length === 0) return undefined;
  const index = Math.min(Math.floor(random() * candidates.length), candidates.length - 1);
  return candidates[index];
}
