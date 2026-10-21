/**
 * Every change to an investigation goes through this pure reducer. Callers
 * supply ids and the current time, so the reducer is deterministic, easy to
 * test, and ready to sit in front of a persistence layer later.
 *
 * When an action changes nothing (an unknown id, a repeated link, the same
 * status), the reducer returns the same object so React can skip rendering.
 */
import {
  connectionPairKey,
  type ChallengeResponse,
  type ChallengeSnapshot,
  type Claim,
  type ClaimSection,
  type ConnectionInput,
  type EvidenceConnection,
  type HighlightInput,
  type EvidenceInput,
  type Investigation,
  type InvestigationStatus,
  type ResearchActivity,
  type SectionId,
  type TrailProgress,
  type TrailStepProgress,
  type TrailStepSnapshot,
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
  /** Ignored unless both cards exist, differ, and aren't already connected (in either direction). */
  | { type: "addConnection"; id: string; input: ConnectionInput }
  /** Replaces a connection's cards, relationship, and explanation, under the same rules as adding. */
  | { type: "updateConnection"; id: string; input: ConnectionInput }
  | { type: "removeConnection"; id: string }
  /** Links are kept only to evidence that exists, once each. */
  | { type: "addHighlight"; id: string; input: HighlightInput }
  | { type: "updateHighlight"; id: string; input: HighlightInput }
  | { type: "removeHighlight"; id: string }
  /** Answers one "Come unto Christ" prompt. Clearing the text removes the answer. */
  | { type: "setReflection"; promptId: string; value: string }
  /** Creates or updates the response to a challenge; `id` is used only when creating. Blank text removes it. */
  | { type: "respondToChallenge"; id: string; challenge: ChallengeSnapshot; response: string }
  | { type: "removeChallengeResponse"; id: string }
  /** Writes the user's notes for a trail step. A step with no notes and no explored mark isn't stored. */
  | { type: "recordTrailDiscoveries"; trailId: string; step: TrailStepSnapshot; discoveries: string }
  | { type: "setTrailStepExplored"; trailId: string; step: TrailStepSnapshot; explored: boolean }
) & { now: string };

/** Moving between sections or trail steps is remembered for resuming, but is not an edit. */
export type InvestigationNavigation =
  | { type: "setSection"; section: SectionId }
  | { type: "setResearchActivity"; activity: ResearchActivity }
  | { type: "setTrailStep"; trailId: string; stepId: string };

export const NAVIGATION_ACTIONS = ["setSection", "setResearchActivity", "setTrailStep"] as const;

export type InvestigationAction = InvestigationEdit | InvestigationNavigation;

/** Actions that delete user content. The workspace offers Undo for these. */
export const REMOVAL_ACTIONS = [
  "removeSubquestion",
  "removeHypothesis",
  "removeEvidence",
  "removeClaim",
  "removeConnection",
  "removeHighlight",
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

/** A highlight's fields with links only to evidence that exists, each once. */
function cleanHighlight(state: Investigation, input: HighlightInput): HighlightInput {
  const evidenceIds = [...new Set(input.evidenceIds)].filter((id) => has(state.evidence, id));
  return { title: input.title, insight: input.insight, evidenceIds };
}

/** Replaces the progress for `trail.trailId`, or appends it. */
function upsertTrail(list: TrailProgress[], trail: TrailProgress): TrailProgress[] {
  return list.some((item) => item.trailId === trail.trailId)
    ? list.map((item) => (item.trailId === trail.trailId ? trail : item))
    : [...list, trail];
}

/**
 * Changes the user's notes on one trail step, creating the trail's progress
 * and the step's entry as needed. A step left with no notes and no explored
 * mark is removed, so empty entries are never stored.
 */
function updateTrailStep(
  state: Investigation,
  trailId: string,
  snapshot: TrailStepSnapshot,
  now: string,
  change: (step: TrailStepProgress) => TrailStepProgress,
): Investigation {
  const trail = findTrailProgress(state, trailId) ?? { trailId, steps: [] };
  const existing = trail.steps.find((step) => step.stepId === snapshot.stepId);
  // An existing entry keeps the wording it was first written for.
  const changed = change(existing ?? { ...snapshot, discoveries: "", explored: false, updatedAt: now });
  if (existing && changed.discoveries === existing.discoveries && changed.explored === existing.explored) return state;

  const empty = changed.discoveries.trim() === "" && !changed.explored;
  if (!existing && empty) return state;
  const updated = { ...changed, updatedAt: now };
  const steps = empty
    ? trail.steps.filter((step) => step !== existing)
    : existing
      ? trail.steps.map((step) => (step === existing ? updated : step))
      : [...trail.steps, updated];
  return { ...state, trailProgress: upsertTrail(state.trailProgress, { ...trail, steps }), updatedAt: now };
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
        // Keep claims and connections consistent: nothing may refer to evidence that no longer exists.
        claims: state.claims.map((claim) =>
          claim.evidenceIds.includes(action.id)
            ? { ...claim, evidenceIds: claim.evidenceIds.filter((id) => id !== action.id), updatedAt: now }
            : claim,
        ),
        evidenceConnections: state.evidenceConnections.filter(
          (connection) => connection.fromEvidenceId !== action.id && connection.toEvidenceId !== action.id,
        ),
        // Discoveries are the user's own insights: they stay, and only lose the link.
        discoveryHighlights: state.discoveryHighlights.map((highlight) =>
          highlight.evidenceIds.includes(action.id)
            ? { ...highlight, evidenceIds: highlight.evidenceIds.filter((id) => id !== action.id), updatedAt: now }
            : highlight,
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

    case "addConnection":
      if (has(state.evidenceConnections, action.id) || !canConnect(state, action.input)) return state;
      return edited({
        evidenceConnections: [
          ...state.evidenceConnections,
          { ...action.input, id: action.id, createdAt: now, updatedAt: now },
        ],
      });

    case "updateConnection": {
      if (!canConnect(state, action.input, action.id)) return state;
      const evidenceConnections = updateById(state.evidenceConnections, action.id, (connection) =>
        connection.fromEvidenceId === action.input.fromEvidenceId &&
        connection.toEvidenceId === action.input.toEvidenceId &&
        connection.relationship === action.input.relationship &&
        connection.explanation === action.input.explanation
          ? connection
          : { ...connection, ...action.input, updatedAt: now },
      );
      return evidenceConnections === state.evidenceConnections ? state : edited({ evidenceConnections });
    }

    case "removeConnection":
      if (!has(state.evidenceConnections, action.id)) return state;
      return edited({ evidenceConnections: state.evidenceConnections.filter((item) => item.id !== action.id) });

    case "addHighlight":
      if (has(state.discoveryHighlights, action.id)) return state;
      return edited({
        discoveryHighlights: [
          ...state.discoveryHighlights,
          { ...cleanHighlight(state, action.input), id: action.id, createdAt: now, updatedAt: now },
        ],
      });

    case "updateHighlight": {
      const input = cleanHighlight(state, action.input);
      const discoveryHighlights = updateById(state.discoveryHighlights, action.id, (highlight) =>
        highlight.title === input.title &&
        highlight.insight === input.insight &&
        highlight.evidenceIds.join() === input.evidenceIds.join()
          ? highlight
          : { ...highlight, ...input, updatedAt: now },
      );
      return discoveryHighlights === state.discoveryHighlights ? state : edited({ discoveryHighlights });
    }

    case "removeHighlight":
      if (!has(state.discoveryHighlights, action.id)) return state;
      return edited({ discoveryHighlights: state.discoveryHighlights.filter((item) => item.id !== action.id) });

    case "setReflection": {
      const current = state.christReflection[action.promptId] ?? "";
      if (current === action.value) return state;
      const others = Object.fromEntries(
        Object.entries(state.christReflection).filter(([promptId]) => promptId !== action.promptId),
      );
      return edited({ christReflection: action.value === "" ? others : { ...others, [action.promptId]: action.value } });
    }

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

    case "recordTrailDiscoveries":
      return updateTrailStep(state, action.trailId, action.step, now, (step) => ({
        ...step,
        discoveries: action.discoveries,
      }));

    case "setTrailStepExplored":
      return updateTrailStep(state, action.trailId, action.step, now, (step) => ({ ...step, explored: action.explored }));
  }
}

function applyNavigation(state: Investigation, action: InvestigationNavigation): Investigation {
  switch (action.type) {
    case "setSection":
      return state.currentSection === action.section ? state : { ...state, currentSection: action.section };

    case "setResearchActivity":
      return state.researchActivity === action.activity ? state : { ...state, researchActivity: action.activity };

    case "setTrailStep": {
      const trail = findTrailProgress(state, action.trailId);
      if (trail?.currentStepId === action.stepId) return state;
      const next = trail
        ? { ...trail, currentStepId: action.stepId }
        : { trailId: action.trailId, currentStepId: action.stepId, steps: [] };
      return { ...state, trailProgress: upsertTrail(state.trailProgress, next) };
    }
  }
}

export const isNavigation = (action: InvestigationAction): action is InvestigationNavigation =>
  (NAVIGATION_ACTIONS as readonly string[]).includes(action.type);

export function investigationReducer(state: Investigation, action: InvestigationAction): Investigation {
  return isNavigation(action) ? applyNavigation(state, action) : applyEdit(state, action);
}

/** Claims for one section, in the order they were written. */
export function claimsInSection(investigation: Investigation, section: ClaimSection): Claim[] {
  return investigation.claims.filter((claim) => claim.section === section);
}

/** The response to one challenge, if the user has written one. */
export function findChallengeResponse(investigation: Investigation, challengeId: string): ChallengeResponse | undefined {
  return investigation.challengeResponses.find((item) => item.challengeId === challengeId);
}

/** The connection between two cards, in either direction, ignoring the connection `exceptId`. */
export function findConnectionBetween(
  investigation: Investigation,
  firstEvidenceId: string,
  secondEvidenceId: string,
  exceptId?: string,
): EvidenceConnection | undefined {
  const pair = connectionPairKey(firstEvidenceId, secondEvidenceId);
  return investigation.evidenceConnections.find(
    (connection) =>
      connection.id !== exceptId && connectionPairKey(connection.fromEvidenceId, connection.toEvidenceId) === pair,
  );
}

/**
 * Whether a connection with these cards would be valid: both cards exist in
 * this investigation, they're different, and no other connection joins them.
 */
export function canConnect(investigation: Investigation, input: ConnectionInput, exceptId?: string): boolean {
  const { fromEvidenceId, toEvidenceId } = input;
  return (
    fromEvidenceId !== toEvidenceId &&
    has(investigation.evidence, fromEvidenceId) &&
    has(investigation.evidence, toEvidenceId) &&
    !findConnectionBetween(investigation, fromEvidenceId, toEvidenceId, exceptId)
  );
}

/** Connections that involve one evidence card. */
export function connectionsFor(investigation: Investigation, evidenceId: string): EvidenceConnection[] {
  return investigation.evidenceConnections.filter(
    (connection) => connection.fromEvidenceId === evidenceId || connection.toEvidenceId === evidenceId,
  );
}

/** The user's progress in one trail, if they have opened it or written in it. */
export function findTrailProgress(investigation: Investigation, trailId: string): TrailProgress | undefined {
  return investigation.trailProgress.find((item) => item.trailId === trailId);
}

/** How many claims cite each evidence card. */
export function countCitations(investigation: Investigation): Map<string, number> {
  const counts = new Map<string, number>();
  for (const claim of investigation.claims) {
    for (const id of claim.evidenceIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}
