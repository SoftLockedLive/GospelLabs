import { describe, expect, it } from "vitest";
import { curatedQuestionSchema, formatQuestionBankIssues, parseQuestionBank } from "./question-bank";

const validEntry = {
  id: "meaningful-prayer",
  question: "What makes prayer meaningful rather than routine?",
  category: "Worship",
  difficulty: "introductory",
  tags: ["prayer"],
  suggestedReferences: [
    {
      label: "James 1:5–6",
      type: "scripture",
      url: "https://www.churchofjesuschrist.org/study/scriptures/nt/james/1?lang=eng&id=p5-p6#p5",
    },
  ],
  prompts: ["What counsel about how to pray appears in these passages?"],
};

const bank = (...questions: unknown[]) => ({ version: 1, questions });

describe("curatedQuestionSchema", () => {
  it("accepts a complete entry", () => {
    expect(curatedQuestionSchema.safeParse(validEntry).success).toBe(true);
  });

  it("defaults optional lists to empty arrays", () => {
    const minimal = { ...validEntry, suggestedReferences: undefined, prompts: undefined };
    const parsed = curatedQuestionSchema.parse(JSON.parse(JSON.stringify(minimal)));
    expect(parsed.suggestedReferences).toEqual([]);
    expect(parsed.prompts).toEqual([]);
  });

  it("accepts references without a URL", () => {
    const entry = { ...validEntry, suggestedReferences: [{ label: "Alma 32", type: "scripture" }] };
    expect(curatedQuestionSchema.safeParse(entry).success).toBe(true);
  });

  it.each([
    ["missing question", { question: undefined }],
    ["blank question", { question: "   " }],
    ["unknown difficulty", { difficulty: "expert" }],
    ["non-kebab-case id", { id: "Meaningful Prayer" }],
    ["missing tags", { tags: undefined }],
    ["misspelled field", { promts: ["typo"] }],
  ])("rejects %s", (_name, override) => {
    expect(curatedQuestionSchema.safeParse({ ...validEntry, ...override }).success).toBe(false);
  });

  it.each([
    ["http", "http://www.churchofjesuschrist.org/study/scriptures/nt/james/1?lang=eng"],
    ["unofficial host", "https://example.com/study/scriptures/nt/james/1"],
    ["look-alike host", "https://www.churchofjesuschrist.org.example.com/study"],
    ["not a URL", "James 1:5"],
  ])("rejects a reference URL that is %s", (_name, url) => {
    const entry = { ...validEntry, suggestedReferences: [{ label: "James 1:5", type: "scripture", url }] };
    expect(curatedQuestionSchema.safeParse(entry).success).toBe(false);
  });
});

describe("parseQuestionBank", () => {
  it("returns every valid entry with no issues", () => {
    const second = { ...validEntry, id: "another-question" };
    const result = parseQuestionBank(bank(validEntry, second));
    expect(result.issues).toEqual([]);
    expect(result.questions.map((q) => q.id)).toEqual(["meaningful-prayer", "another-question"]);
  });

  it("reports invalid entries by index, id, and path while keeping valid ones", () => {
    const broken = { ...validEntry, id: "broken-entry", difficulty: "expert" };
    const result = parseQuestionBank(bank(validEntry, broken));

    expect(result.questions.map((q) => q.id)).toEqual(["meaningful-prayer"]);
    expect(result.issues).toEqual([expect.objectContaining({ index: 1, id: "broken-entry", path: "difficulty" })]);
  });

  it("reports nested paths for invalid references", () => {
    const entry = {
      ...validEntry,
      suggestedReferences: [validEntry.suggestedReferences[0], { label: "", type: "scripture" }],
    };
    const [issue] = parseQuestionBank(bank(entry)).issues;
    expect(issue.path).toBe("suggestedReferences[1].label");
  });

  it("rejects duplicate ids, keeping the first occurrence", () => {
    const duplicate = { ...validEntry, question: "A different question with the same id?" };
    const result = parseQuestionBank(bank(validEntry, duplicate));

    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].question).toBe(validEntry.question);
    expect(result.issues).toEqual([
      {
        index: 1,
        id: "meaningful-prayer",
        path: "id",
        message: 'Duplicate id "meaningful-prayer" (already used by questions[0])',
      },
    ]);
  });

  it("reports every duplicate when an id appears three times", () => {
    const result = parseQuestionBank(bank(validEntry, validEntry, validEntry));
    expect(result.questions).toHaveLength(1);
    expect(result.issues.map((i) => i.index)).toEqual([1, 2]);
  });

  it.each([
    ["wrong version", { version: 2, questions: [] }],
    ["missing questions", { version: 1 }],
    ["not an object", "questions"],
  ])("rejects a file with %s", (_name, raw) => {
    const result = parseQuestionBank(raw);
    expect(result.questions).toEqual([]);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("handles entries that are not objects", () => {
    const result = parseQuestionBank(bank(null, validEntry));
    expect(result.questions).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({ index: 0, id: undefined });
  });
});

describe("formatQuestionBankIssues", () => {
  it("produces one readable line per issue", () => {
    const text = formatQuestionBankIssues([
      { index: 3, id: "born-again", path: "difficulty", message: "Invalid option" },
      { path: "version", message: "version must be 1" },
    ]);
    expect(text).toBe("  • questions[3] (born-again) → difficulty: Invalid option\n  • version: version must be 1");
  });
});
