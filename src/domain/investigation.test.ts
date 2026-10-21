import { describe, expect, it } from "vitest";
import { findIntegrityIssues, investigationSchema, type Investigation } from "./investigation";
import { investigationReducer } from "./investigation-reducer";
import {
  blankInvestigation,
  challengeSnapshot,
  evidenceInput,
  richInvestigation,
  T1,
  TRAIL_ID,
  trailStepSnapshot,
} from "./test-fixtures";

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

describe("evidence connections", () => {
  const twoCards = () =>
    investigationReducer(withEvidence(), {
      type: "addEvidence",
      id: "ev-2",
      input: evidenceInput({ sourceTitle: "Ether 12:6" }),
      now: T1,
    });
  const connection = (overrides: Record<string, unknown> = {}) => ({
    id: "conn-1",
    fromEvidenceId: "ev-1",
    toEvidenceId: "ev-2",
    relationship: "supports",
    explanation: "",
    createdAt: T1,
    updatedAt: T1,
    ...overrides,
  });
  const issuesWith = (...connections: Record<string, unknown>[]) => {
    const result = investigationSchema.safeParse({ ...twoCards(), evidenceConnections: connections });
    return result.success ? [] : result.error.issues.map((issue) => issue.message);
  };

  it("accepts every relationship type", () => {
    for (const relationship of ["supports", "challenges", "connects-to", "raises-question"]) {
      expect(issuesWith(connection({ relationship }))).toEqual([]);
    }
  });

  it.each([
    ["an unknown relationship", { relationship: "proves" }],
    ["a missing card id", { toEvidenceId: undefined }],
    ["an empty card id", { fromEvidenceId: "" }],
    ["an explanation that isn't text", { explanation: 42 }],
    ["a malformed timestamp", { updatedAt: "yesterday" }],
  ])("rejects a malformed connection: %s", (_name, overrides) => {
    expect(issuesWith(connection(overrides))).not.toEqual([]);
  });

  it("rejects connections to missing evidence, to the same card, or repeating a pair", () => {
    expect(issuesWith(connection({ toEvidenceId: "ghost" }))).toEqual([
      'connection "conn-1" refers to missing evidence "ghost"',
    ]);
    expect(issuesWith(connection({ toEvidenceId: "ev-1" }))).toEqual(['connection "conn-1" connects evidence to itself']);
    expect(issuesWith(connection(), connection({ id: "conn-2", fromEvidenceId: "ev-2", toEvidenceId: "ev-1" }))).toEqual([
      'connection "conn-2" repeats a pair of evidence that is already connected',
    ]);
    expect(issuesWith(connection(), connection())).toEqual([
      'evidenceConnections: duplicate id "conn-1"',
      'connection "conn-1" repeats a pair of evidence that is already connected',
    ]);
  });
});

describe("discovery highlights and reflection", () => {
  const highlight = (overrides: Record<string, unknown> = {}) => ({
    id: "hl-1",
    title: "Insight",
    insight: "",
    evidenceIds: ["ev-1"],
    createdAt: T1,
    updatedAt: T1,
    ...overrides,
  });
  const issuesWith = (patch: Record<string, unknown>) => {
    const result = investigationSchema.safeParse({ ...withEvidence(), ...patch });
    return result.success ? [] : result.error.issues.map((issue) => issue.message);
  };

  it("accepts discoveries with and without evidence links", () => {
    expect(issuesWith({ discoveryHighlights: [highlight(), highlight({ id: "hl-2", evidenceIds: [] })] })).toEqual([]);
  });

  it.each([
    ["a title that isn't text", { title: 7 }],
    ["links that aren't a list", { evidenceIds: "ev-1" }],
    ["a missing timestamp", { createdAt: undefined }],
  ])("rejects a malformed discovery: %s", (_name, overrides) => {
    expect(issuesWith({ discoveryHighlights: [highlight(overrides)] })).not.toEqual([]);
  });

  it("rejects discoveries linking missing evidence or the same evidence twice", () => {
    expect(issuesWith({ discoveryHighlights: [highlight({ evidenceIds: ["ghost"] })] })).toEqual([
      'discovery "hl-1" links to missing evidence "ghost"',
    ]);
    expect(issuesWith({ discoveryHighlights: [highlight({ evidenceIds: ["ev-1", "ev-1"] })] })).toEqual([
      'discovery "hl-1" links the same evidence more than once',
    ]);
    expect(issuesWith({ discoveryHighlights: [highlight(), highlight()] })).toEqual([
      'discoveryHighlights: duplicate id "hl-1"',
    ]);
  });

  it("accepts text reflection answers, keeps answers to prompts it doesn't know, and rejects non-text", () => {
    const answers = { "learned-about-christ": "Patience", "a-prompt-from-a-newer-version": "Kept" };
    expect(investigationSchema.parse({ ...blankInvestigation(), christReflection: answers }).christReflection).toEqual(
      answers,
    );
    expect(issuesWith({ christReflection: { "follow-him": 3 } })).not.toEqual([]);
    expect(issuesWith({ christReflection: "not an object" })).not.toEqual([]);
  });
});

describe("compatibility", () => {
  it("reads an investigation saved before any of the 1.1 additions existed", () => {
    const { evidenceConnections, discoveryHighlights, challengeResponses, trailProgress, christReflection, ...savedBy10 } =
      richInvestigation("legacy");
    expect([evidenceConnections, discoveryHighlights, challengeResponses, trailProgress].map((l) => l.length)).toEqual([
      1, 1, 1, 1,
    ]);
    expect(Object.keys(christReflection)).toHaveLength(1);
    const result = investigationSchema.safeParse(savedBy10);
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({
      ...savedBy10,
      evidenceConnections: [],
      discoveryHighlights: [],
      challengeResponses: [],
      trailProgress: [],
      christReflection: {},
    });
  });

  it("keeps top-level fields added by a newer version, so saving here doesn't erase them", () => {
    const fromNewerVersion = { ...richInvestigation("next"), fieldFromANewerVersion: { step: 2, notes: ["kept"] } };
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

  it("reports a trail recorded twice, or a step recorded twice within a trail", () => {
    const note = { ...trailStepSnapshot(), discoveries: "x", explored: false, updatedAt: T1 };
    expect(
      findIntegrityIssues({
        ...blankInvestigation(),
        trailProgress: [
          { trailId: TRAIL_ID, steps: [note, note] },
          { trailId: TRAIL_ID, steps: [] },
        ],
      }),
    ).toEqual([
      `trail "${TRAIL_ID}" has more than one entry for step "mark-2-sins-forgiven"`,
      `trail "${TRAIL_ID}" appears more than once`,
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
