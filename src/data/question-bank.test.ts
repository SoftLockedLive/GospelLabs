/**
 * Checks the shipped question bank file and its generated JSON Schema.
 *
 * After changing the Zod schemas, regenerate the JSON Schema with:
 *   npm run questions:schema
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { formatQuestionBankIssues, parseQuestionBank, questionBankFileSchema } from "@/domain/question-bank";

const bankPath = fileURLToPath(new URL("./question-bank.json", import.meta.url));
const schemaPath = fileURLToPath(new URL("./question-bank.schema.json", import.meta.url));

describe("src/data/question-bank.json", () => {
  const raw: unknown = JSON.parse(readFileSync(bankPath, "utf8"));
  const result = parseQuestionBank(raw);

  it("is valid", () => {
    // Prints the exact entries and fields to fix when this fails.
    expect(formatQuestionBankIssues(result.issues)).toBe("");
  });

  it("contains at least 12 questions with unique ids", () => {
    const ids = result.questions.map((q) => q.id);
    expect(ids.length).toBeGreaterThanOrEqual(12);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("src/data/question-bank.schema.json", () => {
  const generated = `${JSON.stringify(
    {
      title: "Gospel Labs question bank",
      description: "Curated gospel investigation questions. See docs/QUESTION_BANK.md.",
      ...z.toJSONSchema(questionBankFileSchema, { io: "input" }),
    },
    null,
    2,
  )}\n`;

  it("matches the Zod schema", () => {
    if (process.env.UPDATE_QUESTION_SCHEMA) writeFileSync(schemaPath, generated);
    expect(readFileSync(schemaPath, "utf8"), "Run `npm run questions:schema` to regenerate").toBe(generated);
  });
});
