/**
 * Checks the shipped discovery trails. Links and the exact wording of
 * quotations are checked against ChurchofJesusChrist.org by
 * `npm run verify:references`, which needs a network connection.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseDiscoveryTrails, quotationsIn } from "@/domain/discovery-trails";
import { parseQuestionBank } from "@/domain/question-bank";

const read = (name: string): unknown => JSON.parse(readFileSync(fileURLToPath(new URL(name, import.meta.url)), "utf8"));
const { questions } = parseQuestionBank(read("./question-bank.json"));
const { trails, issues } = parseDiscoveryTrails(read("./discovery-trails.json"), {
  questionIds: new Set(questions.map((question) => question.id)),
});

describe("src/data/discovery-trails.json", () => {
  it("is valid, and every trail belongs to a question in the bank", () => {
    expect(issues.join("\n")).toBe("");
  });

  it("leaves most questions without a trail", () => {
    expect(trails.length).toBeLessThan(questions.length);
  });

  it.each(trails.map((trail) => [trail.id, trail] as const))("%s asks rather than answers", (_id, trail) => {
    for (const step of trail.steps) {
      expect(step.question, step.id).toMatch(/\?$/);
      for (const prompt of [...step.interpretation, ...step.reflection]) expect(prompt, step.id).toMatch(/\?$/);
    }
  });

  it.each(trails.map((trail) => [trail.id, trail] as const))("%s cites a source for every quotation", (_id, trail) => {
    const texts = trail.steps.flatMap((step) => [
      step.title,
      ...step.stated,
      ...step.interpretation,
      ...step.connections.map((c) => c.note),
    ]);
    const quoted = texts.flatMap(quotationsIn);
    if (quoted.length > 0) expect(trail.steps.some((step) => step.references.length > 0)).toBe(true);
    // Straight double quotes would slip past the quotation check.
    for (const text of texts) expect(text).not.toContain('"');
  });
});

describe("the forgiveness-before-the-Atonement trail", () => {
  const trail = trails.find((item) => item.questionId === "forgiveness-before-the-atonement");
  const question = questions.find((item) => item.id === "forgiveness-before-the-atonement");

  it("belongs to the question as worded", () => {
    expect(question?.question).toBe("How could Jesus Christ forgive sins before the Atonement?");
    expect(trail).toBeDefined();
  });

  it("starts from John 8:1–11, Mark 2:5–12, and Mosiah 3:13", () => {
    const labels = trail!.steps.flatMap((step) => step.references.map((reference) => reference.label));
    expect(labels).toEqual(expect.arrayContaining(["John 8:1–11", "Mark 2:5–12", "Mosiah 3:13"]));
  });

  it("says plainly that John 8 does not record Jesus forgiving the woman's sins", () => {
    const john = trail!.steps.find((step) => step.references.some((reference) => reference.label === "John 8:1–11"));
    expect(john?.stated.some((line) => line.includes("does not record Him telling her that her sins were forgiven"))).toBe(
      true,
    );
  });
});
