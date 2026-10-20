/**
 * Every change to an investigation goes through this pure reducer. Callers
 * supply ids and the current time, so the reducer is deterministic, easy to
 * test, and ready to sit in front of a persistence layer later.
 *
 * When an action changes nothing (an unknown id, a repeated link, the same
 * status), the reducer returns the same object so React can skip rendering.
 */
import type {
  ChallengeResponse,
  ChallengeSnapshot,
  Claim,
  ClaimSection,
  EvidenceInput,
  Investigation,
  InvestigationStatus,
  SectionId,
} from "./investigation";

/** Free-text fields edited directly by the user. */
export const TEXT_FIELDS = [
  "question",
  "title",
  "category",
  "context",
  "analysisNotes",
  "conclusion",
  "remainingQuestions",
  "reflectionNotes",
] as const;
export type TextField = (typeof TEXT_FIELDS)[number];

/** Changes to content. Each carries the time it happened, used for updatedAt. */
export type InvestigationEdit = (
  | { type: "setText"; field: TextField; value: string }
  | { type: "setStatus"; status: InvestigationStatus }
  | { type: "addSubquestion"; id: string }
  | { type: "updateSubquestion"; id: string; text: string }
  | { type: "removeSubquestion"; id: string }
  | { type: "addHypothesis"; id: string }
  | { type: "updateHypothesis"; id: string; statement: string }
  | { type: "removeHypothesis"; id: string }
  | { type: "addEvidence"; id: string; input: EvidenceInput }
  | { type: "updateEvidence"; id: string; input: EvidenceInput }
  | { type: "removeEvidence"; id: string }
  | { type: "addClaim"; id: string; section: ClaimSection }
  | { type: "updateClaim"; id: string; statement: string }
  | { type: "removeClaim"; id: string }
  | { type: "linkEvidence"; claimId: string; evidenceId: string }
  | { type: "unlinkEvidence"; claimId: string; evidenceId: string }
  /** Creates or updates the response to a challenge; `id` is used only when creating. Blank text removes it. */
  | { type: "respondToChallenge"; id: string; challenge: ChallengeSnapshot; response: string }
  | { type: "removeChallengeResponse"; id: string }
) & { now: string };

/** Moving between sections is remembered for resuming, but is not an edit. */
export type InvestigationNavigation = { type: "setSection"; section: SectionId };

export type InvestigationAction = InvestigationEdit | InvestigationNavigation;

/** Actions that delete user content. The workspace offers Undo for these. */
export const REMOVAL_ACTIONS = [
  "removeSubquestion",
  "removeHypothesis",
  "removeEvidence",
  "removeClaim",
  "removeChallengeResponse",
] as const;

const has = (items: readonly { id: string }[], id: string) => items.some((item) => item.id === id);

/** Applies `change` to the item with `id`; returns the same array if nothing matched or changed. */
function updateById<T extends { id: string }>(items: T[], id: string, change: (item: T) => T): T[] {
  let changed = false;
  const next = items.map((item) => {
    if (item.id !== id) return item;
    const updated = change(item);
    if (updated !== item) changed = true;
    return updated;
  });
  return changed ? next : items;
}

function updateClaim(state: Investigation, claimId: string, now: string, change: (claim: Claim) => Claim | null) {
  const claims = updateById(state.claims, claimId, (claim) => {
    const updated = change(claim);
    return updated ? { ...updated, updatedAt: now } : claim;
  });
  return claims === state.claims ? state : { ...state, claims, updatedAt: now };
}

function applyEdit(state: Investigation, action: InvestigationEdit): Investigation {
  const { now } = action;
  const edited = (patch: Partial<Investigation>): Investigation => ({ ...state, ...patch, updatedAt: now });

  switch (action.type) {
    case "setText":
      return state[action.field] === action.value ? state : edited({ [action.field]: action.value });

    case "setStatus":
      return state.status === action.status ? state : edited({ status: action.status });

    case "addSubquestion":
      if (has(state.subquestions, action.id)) return state;
      return edited({ subquestions: [...state.subquestions, { id: action.id, text: "" }] });

    case "updateSubquestion": {
      const subquestions = updateById(state.subquestions, action.id, (item) =>
        item.text === action.text ? item : { ...item, text: action.text },
      );
      return subquestions === state.subquestions ? state : edited({ subquestions });
    }

    case "removeSubquestion":
      if (!has(state.subquestions, action.id)) return state;
      return edited({ subquestions: state.subquestions.filter((item) => item.id !== action.id) });

    case "addHypothesis":
      if (has(state.hypotheses, action.id)) return state;
      return edited({ hypotheses: [...state.hypotheses, { id: action.id, statement: "" }] });

    case "updateHypothesis": {
      const hypotheses = updateById(state.hypotheses, action.id, (item) =>
        item.statement === action.statement ? item : { ...item, statement: action.statement },
      );
      return hypotheses === state.hypotheses ? state : edited({ hypotheses });
    }

    case "removeHypothesis":
      if (!has(state.hypotheses, action.id)) return state;
      return edited({ hypotheses: state.hypotheses.filter((item) => item.id !== action.id) });

    case "addEvidence":
      if (has(state.evidence, action.id)) return state;
      return edited({
        evidence: [...state.evidence, { ...action.input, id: action.id, createdAt: now, updatedAt: now }],
      });

    case "updateEvidence": {
      const evidence = updateById(state.evidence, action.id, (card) => ({
        ...action.input,
        id: card.id,
        createdAt: card.createdAt,
        updatedAt: now,
      }));
      return evidence === state.evidence ? state : edited({ evidence });
    }

    case "removeEvidence":
      if (!has(state.evidence, action.id)) return state;
      return edited({
        evidence: state.evidence.filter((card) => card.id !== action.id),
        // Keep claims consistent: nothing may cite evidence that no longer exists.
        claims: state.claims.map((claim) =>
          claim.evidenceIds.includes(action.id)
            ? { ...claim, evidenceIds: claim.evidenceIds.filter((id) => id !== action.id), updatedAt: now }
            : claim,
        ),
      });

    case "addClaim":
      if (has(state.claims, action.id)) return state;
      return edited({
        claims: [
          ...state.claims,
          { id: action.id, section: action.section, statement: "", evidenceIds: [], createdAt: now, updatedAt: now },
        ],
      });

    case "updateClaim":
      return updateClaim(state, action.id, now, (claim) =>
        claim.statement === action.statement ? null : { ...claim, statement: action.statement },
      );

    case "removeClaim":
      if (!has(state.claims, action.id)) return state;
      return edited({ claims: state.claims.filter((claim) => claim.id !== action.id) });

    case "linkEvidence":
      if (!has(state.evidence, action.evidenceId)) return state;
      return updateClaim(state, action.claimId, now, (claim) =>
        claim.evidenceIds.includes(action.evidenceId)
          ? null
          : { ...claim, evidenceIds: [...claim.evidenceIds, action.evidenceId] },
      );

    case "unlinkEvidence":
      return updateClaim(state, action.claimId, now, (claim) =>
        claim.evidenceIds.includes(action.evidenceId)
          ? { ...claim, evidenceIds: claim.evidenceIds.filter((id) => id !== action.evidenceId) }
          : null,
      );

    case "respondToChallenge": {
      const blank = action.response.trim() === "";
      const existing = findChallengeResponse(state, action.challenge.challengeId);
      if (!existing) {
        if (blank || has(state.challengeResponses, action.id)) return state;
        const created: ChallengeResponse = {
          ...action.challenge,
          id: action.id,
          response: action.response,
          createdAt: now,
          updatedAt: now,
        };
        return edited({ challengeResponses: [...state.challengeResponses, created] });
      }
      // Clearing the text removes the response, so blank responses are never stored.
      if (blank) return edited({ challengeResponses: state.challengeResponses.filter((item) => item !== existing) });
      if (existing.response === action.response) return state;
      // The challenge wording copied when the response was created is kept as it was.
      return edited({
        challengeResponses: state.challengeResponses.map((item) =>
          item === existing ? { ...item, response: action.response, updatedAt: now } : item,
        ),
      });
    }

    case "removeChallengeResponse":
      if (!has(state.challengeResponses, action.id)) return state;
      return edited({ challengeResponses: state.challengeResponses.filter((item) => item.id !== action.id) });
  }
}

export function investigationReducer(state: Investigation, action: InvestigationAction): Investigation {
  if (action.type === "setSection") {
    return state.currentSection === action.section ? state : { ...state, currentSection: action.section };
  }
  return applyEdit(state, action);
}

/** Claims for one section, in the order they were written. */
export function claimsInSection(investigation: Investigation, section: ClaimSection): Claim[] {
  return investigation.claims.filter((claim) => claim.section === section);
}

/** The response to one challenge, if the user has written one. */
export function findChallengeResponse(investigation: Investigation, challengeId: string): ChallengeResponse | undefined {
  return investigation.challengeResponses.find((item) => item.challengeId === challengeId);
}

/** How many claims cite each evidence card. */
export function countCitations(investigation: Investigation): Map<string, number> {
  const counts = new Map<string, number>();
  for (const claim of investigation.claims) {
    for (const id of claim.evidenceIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}
