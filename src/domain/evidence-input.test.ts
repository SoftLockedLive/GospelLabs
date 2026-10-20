import { describe, expect, it } from "vitest";
import {
  evidenceDraftFromReference,
  normalizeUrlInput,
  parseEvidenceForm,
  parseTags,
  toEvidenceFormValues,
  type EvidenceFormValues,
} from "./evidence-input";

const values = (overrides: Partial<EvidenceFormValues> = {}): EvidenceFormValues => ({
  ...toEvidenceFormValues(),
  sourceTitle: "Alma 32:21",
  observation: "Faith is not a perfect knowledge.",
  ...overrides,
});

describe("parseEvidenceForm", () => {
  it("accepts a source title and observation, trimming whitespace", () => {
    const result = parseEvidenceForm(values({ sourceTitle: "  Alma 32:21 ", relevance: "  Defines faith " }));
    expect(result).toEqual({
      ok: true,
      input: {
        sourceType: "scripture",
        sourceTitle: "Alma 32:21",
        observation: "Faith is not a perfect knowledge.",
        relevance: "Defines faith",
        tags: [],
      },
    });
  });

  it("requires a source title and an observation", () => {
    const result = parseEvidenceForm(values({ sourceTitle: "  ", observation: "" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(["observation", "sourceTitle"]);
    }
  });

  it("treats relevance, link, and tags as optional", () => {
    expect(parseEvidenceForm(values()).ok).toBe(true);
  });

  it("adds https:// to a bare web address", () => {
    const result = parseEvidenceForm(values({ sourceUrl: "churchofjesuschrist.org/study" }));
    expect(result.ok && result.input.sourceUrl).toBe("https://churchofjesuschrist.org/study");
  });

  it.each(["javascript:alert(1)", "mailto:someone@example.org", "https://"])("rejects the link %s", (sourceUrl) => {
    const result = parseEvidenceForm(values({ sourceUrl }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.sourceUrl).toBeDefined();
  });

  it("omits the link entirely when left blank", () => {
    const result = parseEvidenceForm(values({ sourceUrl: "   " }));
    expect(result.ok && "sourceUrl" in result.input).toBe(false);
  });

  it("round-trips an existing card through the form", () => {
    const input = {
      sourceType: "conference-talk" as const,
      sourceTitle: "A talk",
      sourceUrl: "https://example.org/talk",
      observation: "Observed",
      relevance: "Relevant",
      tags: ["grace", "faith"],
    };
    expect(parseEvidenceForm(toEvidenceFormValues(input))).toEqual({ ok: true, input });
  });
});

describe("parseTags", () => {
  it("splits on commas, trims, lowercases, and removes duplicates and blanks", () => {
    expect(parseTags(" Faith, grace,,  FAITH , holy   ghost ")).toEqual(["faith", "grace", "holy ghost"]);
  });

  it("returns an empty list for blank input", () => {
    expect(parseTags("  ")).toEqual([]);
  });
});

describe("normalizeUrlInput", () => {
  it("leaves blank input and full URLs alone", () => {
    expect(normalizeUrlInput("")).toBe("");
    expect(normalizeUrlInput(" http://example.org ")).toBe("http://example.org");
  });
});

describe("evidenceDraftFromReference", () => {
  it("fills in only the source, never the observation or relevance", () => {
    const draft = evidenceDraftFromReference({
      label: "Gospel Topics: Prayer",
      type: "gospel-topics",
      url: "https://www.churchofjesuschrist.org/study/manual/gospel-topics/prayer?lang=eng",
    });
    expect(draft).toEqual({
      sourceType: "church-website",
      sourceTitle: "Gospel Topics: Prayer",
      sourceUrl: "https://www.churchofjesuschrist.org/study/manual/gospel-topics/prayer?lang=eng",
    });
  });
});
