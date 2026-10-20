import { describe, expect, it } from "vitest";
import { findIntegrityIssues, investigationSchema, type Investigation } from "./investigation";
import { investigationReducer } from "./investigation-reducer";
import { blankInvestigation, challengeSnapshot, evidenceInput, richInvestigation, T1 } from "./test-fixtures";

function withEvidence(): Investigation {
  return investigationReducer(blankInvestigation(), { type: "addEvidence", id: "ev-1", input: evidenceInput(), now: T1 });
}

describe("investigationSchema", () => {
  it("accepts blank and fully populated investigations", () => {
    expect(investigationSchema.safeParse(blankInvestigation()).success).toBe(true);
    expect(investigationSchema.safeParse(richInvestigation("full")).error).toBeUndefined();
  });

  it("rejects an unknown status or section", () => {
    expect(investigationSchema.safeParse({ ...blankInvestigation(), status: "solved" }).success).toBe(false);
    expect(investigationSchema.safeParse({ ...blankInvestigation(), currentSection: "summary" }).success).toBe(false);
  });

  it("rejects malformed timestamps", () => {
    expect(investigationSchema.safeParse({ ...blankInvestigation(), createdAt: "yesterday" }).success).toBe(false);
  });

  it.each(["javascript:alert(1)", "ftp://example.org/file", "not a url"])("rejects evidence link %s", (url) => {
    const investigation = withEvidence();
    const bad = { ...investigation, evidence: [{ ...investigation.evidence[0], sourceUrl: url }] };
    expect(investigationSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a claim that cites missing evidence", () => {
    const claim = { id: "cl-1", section: "analysis", statement: "", evidenceIds: ["ghost"], createdAt: T1, updatedAt: T1 };
    const result = investigationSchema.safeParse({ ...withEvidence(), claims: [claim] });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('claim "cl-1" cites missing evidence "ghost"');
  });
});

describe("compatibility", () => {
  it("reads an investigation saved before challenge responses existed", () => {
    const { challengeResponses, ...savedBy10 } = richInvestigation("legacy");
    expect(challengeResponses).toHaveLength(1);
    const result = investigationSchema.safeParse(savedBy10);
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({ ...savedBy10, challengeResponses: [] });
  });

  it("keeps top-level fields added by a newer version, so saving here doesn't erase them", () => {
    const fromNewerVersion = { ...richInvestigation("next"), trailProgress: { step: 2, notes: ["kept"] } };
    expect(investigationSchema.parse(fromNewerVersion)).toEqual(fromNewerVersion);
  });

  it("rejects a challenge response with an unknown type", () => {
    const response = { id: "cr-1", ...challengeSnapshot(), type: "debate", response: "x", createdAt: T1, updatedAt: T1 };
    expect(investigationSchema.safeParse({ ...blankInvestigation(), challengeResponses: [response] }).success).toBe(false);
  });
});

describe("findIntegrityIssues", () => {
  it("reports duplicate ids within a collection", () => {
    const investigation = withEvidence();
    const duplicated = { ...investigation, evidence: [investigation.evidence[0], investigation.evidence[0]] };
    expect(findIntegrityIssues(duplicated)).toEqual(['evidence: duplicate id "ev-1"']);
  });

  it("reports two responses to the same challenge", () => {
    const response = { id: "cr-1", ...challengeSnapshot(), response: "x", createdAt: T1, updatedAt: T1 };
    expect(
      findIntegrityIssues({ ...blankInvestigation(), challengeResponses: [response, { ...response, id: "cr-2" }] }),
    ).toEqual(['challenge "observe-repeated-words" has more than one response']);
    expect(findIntegrityIssues({ ...blankInvestigation(), challengeResponses: [response, response] })).toEqual([
      'challengeResponses: duplicate id "cr-1"',
      'challenge "observe-repeated-words" has more than one response',
    ]);
  });

  it("reports a claim citing the same evidence twice", () => {
    const claim = {
      id: "cl-1",
      section: "analysis" as const,
      statement: "",
      evidenceIds: ["ev-1", "ev-1"],
      createdAt: T1,
      updatedAt: T1,
    };
    expect(findIntegrityIssues({ ...withEvidence(), claims: [claim] })).toEqual([
      'claim "cl-1" cites the same evidence more than once',
    ]);
  });
});
