/**
 * Investigation data model. The Zod schemas are the single source of truth:
 * TypeScript types are inferred from them, and the same schemas validate data
 * at boundaries (form input now; IndexedDB records and backup imports later).
 *
 * An investigation is one self-contained record. Evidence cards, claims,
 * evidence connections, discovery highlights, challenge responses,
 * discovery-trail notes, and reflections live inside it and reference each
 * other by id, so it can be stored as a single IndexedDB document without
 * joins.
 */
import { z } from "zod";
import { CHALLENGE_TYPES } from "./research-challenges";

export const INVESTIGATION_STATUSES = ["investigating", "partially-understood", "concluded"] as const;
export type InvestigationStatus = (typeof INVESTIGATION_STATUSES)[number];

export const STATUS_LABELS: Record<InvestigationStatus, string> = {
  investigating: "Investigating",
  "partially-understood": "Partially understood",
  concluded: "Concluded",
};

export const SECTION_IDS = ["question", "hypothesis", "research", "analysis", "conclusion"] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export function isSectionId(value: unknown): value is SectionId {
  return SECTION_IDS.includes(value as SectionId);
}

/** Sections in which the user can write claims backed by evidence. */
export const CLAIM_SECTIONS = ["analysis", "conclusion"] as const;
export type ClaimSection = (typeof CLAIM_SECTIONS)[number];

export const EVIDENCE_SOURCE_TYPES = [
  "scripture",
  "conference-talk",
  "church-manual",
  "church-website",
  "personal-experience",
  "other",
] as const;
export type EvidenceSourceType = (typeof EVIDENCE_SOURCE_TYPES)[number];

export const SOURCE_TYPE_LABELS: Record<EvidenceSourceType, string> = {
  scripture: "Scripture",
  "conference-talk": "Conference talk",
  "church-manual": "Church manual",
  "church-website": "Church website",
  "personal-experience": "Personal experience",
  other: "Other",
};

/**
 * The stored-record format this version of the app writes. Every save stamps
 * it on the record as `dataVersion`. Raise it in any release that stores data
 * an earlier version would damage when saving (for example, a new field
 * inside evidence cards, which earlier versions would drop). Earlier versions
 * from 1.1 on then refuse to save over such records instead of damaging them.
 */
export const RECORD_DATA_VERSION = 2;

/** True for a record written by a newer version of the app than this one. */
export const isFromNewerVersion = (record: { dataVersion?: number }) =>
  (record.dataVersion ?? 0) > RECORD_DATA_VERSION;

/** Research activities, in the order they're shown. Saved per investigation as navigation state. */
export const RESEARCH_ACTIVITIES = ["discover", "challenges", "evidence", "connections"] as const;
export type ResearchActivity = (typeof RESEARCH_ACTIVITIES)[number];

const idSchema = z.string().min(1);
const timestampSchema = z.iso.datetime();

/** A user-entered web link. Only http(s) is allowed so links are always safe to open. */
export const webUrlSchema = z.url({ protocol: /^https?$/, error: "Enter a full web address starting with https://" });

export const subquestionSchema = z.object({
  id: idSchema,
  text: z.string(),
});

export const hypothesisSchema = z.object({
  id: idSchema,
  statement: z.string(),
});

export const evidenceCardSchema = z.object({
  id: idSchema,
  sourceType: z.enum(EVIDENCE_SOURCE_TYPES),
  /** Title or reference, e.g. "Alma 7:11–13". */
  sourceTitle: z.string(),
  /** Entered by the user. Gospel Labs does not verify it. */
  sourceUrl: webUrlSchema.optional(),
  observation: z.string(),
  relevance: z.string(),
  tags: z.array(z.string()),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

/**
 * How the user sees two pieces of evidence relating. All but "connects-to"
 * read from the first card to the second ("E1 supports E3"); "connects-to"
 * has no direction.
 */
export const CONNECTION_RELATIONSHIPS = ["supports", "challenges", "connects-to", "raises-question"] as const;
export type ConnectionRelationship = (typeof CONNECTION_RELATIONSHIPS)[number];

export const RELATIONSHIP_LABELS: Record<ConnectionRelationship, string> = {
  supports: "Supports",
  challenges: "Challenges",
  "connects-to": "Connects to",
  "raises-question": "Raises a question",
};

/** The relationship as it reads between two cards: "E1 raises a question about E3". */
export const RELATIONSHIP_PHRASES: Record<ConnectionRelationship, string> = {
  supports: "supports",
  challenges: "challenges",
  "connects-to": "connects to",
  "raises-question": "raises a question about",
};

export const isDirectional = (relationship: ConnectionRelationship) => relationship !== "connects-to";

/**
 * A relationship between two evidence cards in the same investigation, made
 * and explained by the user. At most one connection per pair of cards.
 */
export const evidenceConnectionSchema = z.object({
  id: idSchema,
  /** The card the relationship reads from. */
  fromEvidenceId: idSchema,
  /** The card the relationship reads to. */
  toEvidenceId: idSchema,
  relationship: z.enum(CONNECTION_RELATIONSHIPS),
  /** Optional; written only by the user. */
  explanation: z.string(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

/** A user-written statement in Analysis or Conclusion, linked to the evidence that supports it. */
export const claimSchema = z.object({
  id: idSchema,
  section: z.enum(CLAIM_SECTIONS),
  statement: z.string(),
  /** Ids of evidence cards in the same investigation. */
  evidenceIds: z.array(idSchema),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

/**
 * The user's response to a research challenge. The challenge's wording is
 * copied in, so the response keeps its context even if the challenge text
 * is later changed or removed from the app.
 */
export const challengeResponseSchema = z.object({
  id: idSchema,
  /** The challenge in src/data/research-challenges.json. At most one response per challenge. */
  challengeId: idSchema,
  type: z.enum(CHALLENGE_TYPES),
  title: z.string(),
  prompt: z.string(),
  response: z.string(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

/**
 * The user's notes on one step of a discovery trail. The step's title and
 * guiding question are copied in, so the notes keep their context even if the
 * trail is later changed.
 */
export const trailStepProgressSchema = z.object({
  /** The step in src/data/discovery-trails.json. */
  stepId: idSchema,
  title: z.string(),
  question: z.string(),
  discoveries: z.string(),
  /** Set by the user ("Mark as explored"); never inferred. */
  explored: z.boolean(),
  updatedAt: timestampSchema,
});

/** Notes and position in one discovery trail. Steps without notes or an explored mark aren't stored. */
export const trailProgressSchema = z.object({
  trailId: idSchema,
  /** The step the user last opened, so the trail reopens there. Moving between steps isn't an edit. */
  currentStepId: idSchema.optional(),
  steps: z.array(trailStepProgressSchema),
});

/**
 * An insight the user chose to keep, with optional links to the evidence it
 * came from. Written only by the user; Gospel Labs never identifies,
 * generates, or judges discoveries.
 */
export const discoveryHighlightSchema = z.object({
  id: idSchema,
  title: z.string(),
  insight: z.string(),
  /** Ids of evidence cards in the same investigation. */
  evidenceIds: z.array(idSchema),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

const investigationObjectSchema = z.object({
  id: idSchema,
  /** See RECORD_DATA_VERSION. Missing on records saved before Gospel Labs 1.1. */
  dataVersion: z.number().int().positive().optional(),
  question: z.string(),
  /** The curated question this investigation started from, if any. */
  sourceQuestionId: z.string().optional(),
  title: z.string(),
  category: z.string(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  currentSection: z.enum(SECTION_IDS),
  /**
   * The Research activity last shown, like currentSection: navigation, not
   * content. Any string is accepted so a value from a newer version can't
   * make the record unreadable; unknown values fall back to a default.
   */
  researchActivity: z.string().optional(),
  context: z.string(),
  subquestions: z.array(subquestionSchema),
  hypotheses: z.array(hypothesisSchema),
  evidence: z.array(evidenceCardSchema),
  analysisNotes: z.string(),
  claims: z.array(claimSchema),
  /** Added in Gospel Labs 1.1. Records and backups saved earlier load with none. */
  evidenceConnections: z.array(evidenceConnectionSchema).default(() => []),
  /** Added in Gospel Labs 1.1. Records and backups saved earlier load with none. */
  challengeResponses: z.array(challengeResponseSchema).default(() => []),
  /** Added in Gospel Labs 1.1. Records and backups saved earlier load with none. */
  trailProgress: z.array(trailProgressSchema).default(() => []),
  /** Added in Gospel Labs 1.1. Records and backups saved earlier load with none. */
  discoveryHighlights: z.array(discoveryHighlightSchema).default(() => []),
  /** Written only by the user. Nothing in the app generates or edits it. */
  conclusion: z.string(),
  remainingQuestions: z.string(),
  reflectionNotes: z.string(),
  /**
   * Answers to the "Come unto Christ" prompts, keyed by prompt id (see
   * src/domain/reflection.ts). Unanswered prompts have no key. Keys this
   * version doesn't know are kept. Added in Gospel Labs 1.1.
   */
  christReflection: z.record(z.string(), z.string()).default(() => ({})),
  status: z.enum(INVESTIGATION_STATUSES),
});

type InvestigationShape = z.infer<typeof investigationObjectSchema>;

/**
 * Rules that span fields: unique ids per collection; claims, connections, and
 * discovery highlights only refer to evidence that exists, each at most once;
 * a connection joins two different cards, and each pair of cards has at most
 * one connection; each challenge has at most one response; and each trail
 * and trail step appears at most once.
 */
export function findIntegrityIssues(investigation: InvestigationShape): string[] {
  const issues: string[] = [];
  const collections = {
    subquestions: investigation.subquestions,
    hypotheses: investigation.hypotheses,
    evidence: investigation.evidence,
    claims: investigation.claims,
    evidenceConnections: investigation.evidenceConnections,
    discoveryHighlights: investigation.discoveryHighlights,
    challengeResponses: investigation.challengeResponses,
  };
  for (const [name, items] of Object.entries(collections)) {
    const seen = new Set<string>();
    for (const { id } of items) {
      if (seen.has(id)) issues.push(`${name}: duplicate id "${id}"`);
      seen.add(id);
    }
  }

  const evidenceIds = new Set(investigation.evidence.map((card) => card.id));
  for (const claim of investigation.claims) {
    for (const evidenceId of claim.evidenceIds) {
      if (!evidenceIds.has(evidenceId)) issues.push(`claim "${claim.id}" cites missing evidence "${evidenceId}"`);
    }
    if (new Set(claim.evidenceIds).size !== claim.evidenceIds.length) {
      issues.push(`claim "${claim.id}" cites the same evidence more than once`);
    }
  }

  for (const highlight of investigation.discoveryHighlights) {
    for (const evidenceId of highlight.evidenceIds) {
      if (!evidenceIds.has(evidenceId)) issues.push(`discovery "${highlight.id}" links to missing evidence "${evidenceId}"`);
    }
    if (new Set(highlight.evidenceIds).size !== highlight.evidenceIds.length) {
      issues.push(`discovery "${highlight.id}" links the same evidence more than once`);
    }
  }

  const pairs = new Set<string>();
  for (const { id, fromEvidenceId, toEvidenceId } of investigation.evidenceConnections) {
    for (const evidenceId of [fromEvidenceId, toEvidenceId]) {
      if (!evidenceIds.has(evidenceId)) issues.push(`connection "${id}" refers to missing evidence "${evidenceId}"`);
    }
    if (fromEvidenceId === toEvidenceId) issues.push(`connection "${id}" connects evidence to itself`);
    const pair = connectionPairKey(fromEvidenceId, toEvidenceId);
    if (pairs.has(pair)) issues.push(`connection "${id}" repeats a pair of evidence that is already connected`);
    pairs.add(pair);
  }

  const answered = new Set<string>();
  for (const { challengeId } of investigation.challengeResponses) {
    if (answered.has(challengeId)) issues.push(`challenge "${challengeId}" has more than one response`);
    answered.add(challengeId);
  }

  const trails = new Set<string>();
  for (const { trailId, steps } of investigation.trailProgress) {
    if (trails.has(trailId)) issues.push(`trail "${trailId}" appears more than once`);
    trails.add(trailId);
    const stepIds = new Set<string>();
    for (const { stepId } of steps) {
      if (stepIds.has(stepId)) issues.push(`trail "${trailId}" has more than one entry for step "${stepId}"`);
      stepIds.add(stepId);
    }
  }
  return issues;
}

/**
 * Validates a whole investigation. Top-level fields this version doesn't
 * know are kept rather than dropped: they come from a newer version of the
 * app, and a tab still running this version must not erase them on save.
 * New data should therefore be added as new top-level fields with defaults.
 */
/** The same key for a pair of cards in either order, so "A–B" and "B–A" count as one pair. */
export function connectionPairKey(firstEvidenceId: string, secondEvidenceId: string): string {
  return [firstEvidenceId, secondEvidenceId].sort().join("\u0000");
}

export const investigationSchema = investigationObjectSchema.loose().superRefine((investigation, ctx) => {
  for (const message of findIntegrityIssues(investigation)) ctx.addIssue({ code: "custom", message });
});

export type Subquestion = z.infer<typeof subquestionSchema>;
export type Hypothesis = z.infer<typeof hypothesisSchema>;
export type EvidenceCard = z.infer<typeof evidenceCardSchema>;
export type Claim = z.infer<typeof claimSchema>;
export type EvidenceConnection = z.infer<typeof evidenceConnectionSchema>;
export type DiscoveryHighlight = z.infer<typeof discoveryHighlightSchema>;
export type ChallengeResponse = z.infer<typeof challengeResponseSchema>;
export type TrailProgress = z.infer<typeof trailProgressSchema>;
export type TrailStepProgress = z.infer<typeof trailStepProgressSchema>;
export type Investigation = InvestigationShape;

/** The challenge wording copied into a response when it is first written. */
export type ChallengeSnapshot = Pick<ChallengeResponse, "challengeId" | "type" | "title" | "prompt">;

/** The step wording copied into the user's notes when they first write them. */
export type TrailStepSnapshot = Pick<TrailStepProgress, "stepId" | "title" | "question">;

/** The user-editable parts of a discovery highlight. */
export type HighlightInput = Pick<DiscoveryHighlight, "title" | "insight" | "evidenceIds">;

/** The user-editable parts of a connection. */
export type ConnectionInput = Pick<EvidenceConnection, "fromEvidenceId" | "toEvidenceId" | "relationship" | "explanation">;

/** The user-editable parts of an evidence card. */
export type EvidenceInput = Omit<EvidenceCard, "id" | "createdAt" | "updatedAt">;
