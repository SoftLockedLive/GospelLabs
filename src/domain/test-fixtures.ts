/** Shared builders for domain tests. */
import { createInvestigation } from "./investigation-factory";
import { investigationReducer } from "./investigation-reducer";
import type { ChallengeSnapshot, EvidenceInput, Investigation } from "./investigation";

export const T0 = "2026-10-19T12:00:00.000Z";
export const T1 = "2026-10-19T12:05:00.000Z";
export const T2 = "2026-10-19T12:10:00.000Z";

export function blankInvestigation(): Investigation {
  return createInvestigation({ id: "inv-1", now: T0 });
}

export function evidenceInput(overrides: Partial<EvidenceInput> = {}): EvidenceInput {
  return {
    sourceType: "scripture",
    sourceTitle: "Alma 32:21",
    observation: "Faith is hoping for things not seen which are true.",
    relevance: "Defines faith.",
    tags: ["faith"],
    ...overrides,
  };
}

export function challengeSnapshot(overrides: Partial<ChallengeSnapshot> = {}): ChallengeSnapshot {
  return {
    challengeId: "observe-repeated-words",
    type: "observe",
    title: "Repeated words",
    prompt: "Which words or phrases appear more than once?",
    ...overrides,
  };
}

/** Recursively freezes a value so tests fail if a reducer mutates its input. */
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

/** A fully populated investigation (subquestion, hypothesis, evidence with link, claims, challenge response, conclusion). */
export function richInvestigation(id: string, overrides: Partial<Investigation> = {}): Investigation {
  let state = createInvestigation({ id, now: T0 });
  const steps: Parameters<typeof investigationReducer>[1][] = [
    { type: "setText", field: "question", value: `Question for ${id}?`, now: T1 },
    { type: "setText", field: "title", value: `Investigation ${id}`, now: T1 },
    { type: "addSubquestion", id: "sq-1", now: T1 },
    { type: "updateSubquestion", id: "sq-1", text: "A narrower question", now: T1 },
    { type: "addHypothesis", id: "h-1", now: T1 },
    { type: "addEvidence", id: "ev-1", input: evidenceInput({ sourceUrl: "https://example.org/a" }), now: T1 },
    { type: "addEvidence", id: "ev-2", input: evidenceInput({ sourceTitle: "Ether 12:6", tags: [] }), now: T1 },
    { type: "addClaim", id: "cl-1", section: "analysis", now: T1 },
    { type: "linkEvidence", claimId: "cl-1", evidenceId: "ev-1", now: T1 },
    { type: "addClaim", id: "cl-2", section: "conclusion", now: T2 },
    { type: "linkEvidence", claimId: "cl-2", evidenceId: "ev-2", now: T2 },
    { type: "respondToChallenge", id: "cr-1", challenge: challengeSnapshot(), response: "“Faith” appears three times.", now: T2 },
    { type: "setText", field: "conclusion", value: "My own conclusion.", now: T2 },
    { type: "setSection", section: "analysis" },
  ];
  for (const step of steps) state = investigationReducer(state, step);
  return { ...state, ...overrides };
}
