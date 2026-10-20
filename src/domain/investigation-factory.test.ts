import { describe, expect, it } from "vitest";
import { createInvestigation, createInvestigationFromQuestion } from "./investigation-factory";
import type { CuratedQuestion } from "./question-bank";

const NOW = "2026-10-19T12:00:00.000Z";

const curated: CuratedQuestion = {
  id: "meaning-of-the-sabbath",
  question: "Why is the Sabbath day significant?",
  category: "Worship",
  difficulty: "introductory",
  tags: ["sabbath"],
  suggestedReferences: [{ label: "Exodus 20:8–11", type: "scripture" }],
  prompts: ["What purposes for the Sabbath do these passages describe?"],
};

describe("createInvestigation", () => {
  it("creates an empty investigation at the first section", () => {
    const investigation = createInvestigation({ id: "inv-1", now: NOW });
    expect(investigation).toMatchObject({
      id: "inv-1",
      question: "",
      createdAt: NOW,
      updatedAt: NOW,
      currentSection: "question",
      status: "investigating",
      hypotheses: [],
      evidence: [],
    });
    expect(investigation.sourceQuestionId).toBeUndefined();
  });
});

describe("createInvestigationFromQuestion", () => {
  const investigation = createInvestigationFromQuestion(curated, { id: "inv-2", now: NOW });

  it("copies the question, category, and a link to the bank entry", () => {
    expect(investigation).toMatchObject({
      id: "inv-2",
      question: curated.question,
      title: curated.question,
      category: "Worship",
      sourceQuestionId: "meaning-of-the-sabbath",
      createdAt: NOW,
      updatedAt: NOW,
    });
  });

  it("does not turn suggested references into evidence", () => {
    expect(investigation.evidence).toEqual([]);
  });

  it("does not presume hypotheses or a conclusion", () => {
    expect(investigation.hypotheses).toEqual([]);
    expect(investigation.subquestions).toEqual([]);
    expect(investigation.conclusion).toBe("");
    expect(investigation.status).toBe("investigating");
  });

  it("returns independent arrays for each investigation", () => {
    const other = createInvestigationFromQuestion(curated, { id: "inv-3", now: NOW });
    expect(other.evidence).not.toBe(investigation.evidence);
  });
});
