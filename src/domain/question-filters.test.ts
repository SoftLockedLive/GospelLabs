import { describe, expect, it } from "vitest";
import type { CuratedQuestion } from "./question-bank";
import {
  EMPTY_QUESTION_FILTERS,
  filterQuestions,
  hasActiveFilters,
  listCategories,
  normalizeSearchText,
  pickRandomQuestion,
} from "./question-filters";

function question(overrides: Partial<CuratedQuestion> & Pick<CuratedQuestion, "id">): CuratedQuestion {
  return {
    question: "Placeholder question?",
    category: "Worship",
    difficulty: "introductory",
    tags: [],
    suggestedReferences: [],
    prompts: [],
    ...overrides,
  };
}

const QUESTIONS: CuratedQuestion[] = [
  question({
    id: "born-again",
    question: "What does it mean to be “born again”?",
    category: "Doctrine of Christ",
    tags: ["conversion"],
    suggestedReferences: [{ label: "Mosiah 5:7", type: "scripture" }],
  }),
  question({ id: "sabbath", question: "Why is the Sabbath significant?", category: "Worship", tags: ["rest"] }),
  question({
    id: "godhead",
    question: "What do the scriptures teach about the Godhead?",
    category: "Godhead",
    difficulty: "advanced",
  }),
  question({ id: "prayer", question: "What makes prayer meaningful?", category: "Worship", difficulty: "intermediate" }),
];

const ids = (list: CuratedQuestion[]) => list.map((q) => q.id);
const filter = (overrides: Partial<typeof EMPTY_QUESTION_FILTERS>) =>
  ids(filterQuestions(QUESTIONS, { ...EMPTY_QUESTION_FILTERS, ...overrides }));

describe("filterQuestions", () => {
  it("returns everything when no filters are set", () => {
    expect(filter({})).toEqual(["born-again", "sabbath", "godhead", "prayer"]);
  });

  it("matches question text case-insensitively", () => {
    expect(filter({ query: "SABBATH" })).toEqual(["sabbath"]);
  });

  it("ignores curly quotes and surrounding whitespace", () => {
    expect(filter({ query: '  "born again"  ' })).toEqual(["born-again"]);
  });

  it("ignores diacritics", () => {
    expect(normalizeSearchText("Café Naïve")).toBe("cafe naive");
  });

  it("searches tags, categories, and reference labels", () => {
    expect(filter({ query: "conversion" })).toEqual(["born-again"]);
    expect(filter({ query: "worship" })).toEqual(["sabbath", "prayer"]);
    expect(filter({ query: "mosiah" })).toEqual(["born-again"]);
  });

  it("requires every search term to match", () => {
    expect(filter({ query: "scriptures godhead" })).toEqual(["godhead"]);
    expect(filter({ query: "scriptures sabbath" })).toEqual([]);
  });

  it("filters by exact category", () => {
    expect(filter({ category: "Worship" })).toEqual(["sabbath", "prayer"]);
    expect(filter({ category: "Wor" })).toEqual([]);
  });

  it("filters by difficulty", () => {
    expect(filter({ difficulty: "advanced" })).toEqual(["godhead"]);
  });

  it("combines search, category, and difficulty", () => {
    expect(filter({ category: "Worship", difficulty: "intermediate" })).toEqual(["prayer"]);
    expect(filter({ category: "Worship", difficulty: "intermediate", query: "sabbath" })).toEqual([]);
  });

  it("does not mutate the input list", () => {
    const copy = [...QUESTIONS];
    filterQuestions(QUESTIONS, { ...EMPTY_QUESTION_FILTERS, query: "prayer" });
    expect(QUESTIONS).toEqual(copy);
  });
});

describe("hasActiveFilters", () => {
  it("treats a whitespace-only query as inactive", () => {
    expect(hasActiveFilters({ ...EMPTY_QUESTION_FILTERS, query: "  " })).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_QUESTION_FILTERS, difficulty: "advanced" })).toBe(true);
  });
});

describe("listCategories", () => {
  it("lists distinct categories alphabetically with counts", () => {
    expect(listCategories(QUESTIONS)).toEqual([
      { name: "Doctrine of Christ", count: 1 },
      { name: "Godhead", count: 1 },
      { name: "Worship", count: 2 },
    ]);
  });
});

describe("pickRandomQuestion", () => {
  it("maps the random value onto the list", () => {
    expect(pickRandomQuestion(QUESTIONS, { random: () => 0 })?.id).toBe("born-again");
    expect(pickRandomQuestion(QUESTIONS, { random: () => 0.5 })?.id).toBe("godhead");
    expect(pickRandomQuestion(QUESTIONS, { random: () => 0.999999 })?.id).toBe("prayer");
  });

  it("stays in range even if the generator returns 1", () => {
    expect(pickRandomQuestion(QUESTIONS, { random: () => 1 })?.id).toBe("prayer");
  });

  it("returns undefined for an empty list", () => {
    expect(pickRandomQuestion([])).toBeUndefined();
  });

  it("never returns the excluded question when alternatives exist", () => {
    for (let i = 0; i < 50; i++) {
      expect(pickRandomQuestion(QUESTIONS, { excludeId: "sabbath" })?.id).not.toBe("sabbath");
    }
  });

  it("returns the only question even if it is excluded", () => {
    expect(pickRandomQuestion([QUESTIONS[0]], { excludeId: "born-again" })?.id).toBe("born-again");
  });

  it("can reach every question", () => {
    const seen = new Set<string>();
    for (let i = 0; i < QUESTIONS.length; i++) {
      seen.add(pickRandomQuestion(QUESTIONS, { random: () => i / QUESTIONS.length })!.id);
    }
    expect(seen.size).toBe(QUESTIONS.length);
  });
});
