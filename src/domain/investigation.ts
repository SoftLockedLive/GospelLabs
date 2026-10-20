/**
 * Investigation data model. The Zod schemas are the single source of truth:
 * TypeScript types are inferred from them, and the same schemas validate data
 * at boundaries (form input now; IndexedDB records and backup imports later).
 *
 * An investigation is one self-contained record. Evidence cards, claims, and
 * challenge responses live inside it and reference each other by id, so it
 * can be stored as a single IndexedDB document without joins.
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

const investigationObjectSchema = z.object({
  id: idSchema,
  question: z.string(),
  /** The curated question this investigation started from, if any. */
  sourceQuestionId: z.string().optional(),
  title: z.string(),
  category: z.string(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  currentSection: z.enum(SECTION_IDS),
  context: z.string(),
  subquestions: z.array(subquestionSchema),
  hypotheses: z.array(hypothesisSchema),
  evidence: z.array(evidenceCardSchema),
  analysisNotes: z.string(),
  claims: z.array(claimSchema),
  /** Added in Gospel Labs 1.1. Records and backups saved earlier load with none. */
  challengeResponses: z.array(challengeResponseSchema).default(() => []),
  /** Written only by the user. Nothing in the app generates or edits it. */
  conclusion: z.string(),
  remainingQuestions: z.string(),
  reflectionNotes: z.string(),
  status: z.enum(INVESTIGATION_STATUSES),
});

type InvestigationShape = z.infer<typeof investigationObjectSchema>;

/**
 * Rules that span fields: unique ids per collection, claims only cite
 * evidence that exists, and each challenge has at most one response.
 */
export function findIntegrityIssues(investigation: InvestigationShape): string[] {
  const issues: string[] = [];
  const collections = {
    subquestions: investigation.subquestions,
    hypotheses: investigation.hypotheses,
    evidence: investigation.evidence,
    claims: investigation.claims,
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

  const answered = new Set<string>();
  for (const { challengeId } of investigation.challengeResponses) {
    if (answered.has(challengeId)) issues.push(`challenge "${challengeId}" has more than one response`);
    answered.add(challengeId);
  }
  return issues;
}

/**
 * Validates a whole investigation. Top-level fields this version doesn't
 * know are kept rather than dropped: they come from a newer version of the
 * app, and a tab still running this version must not erase them on save.
 * New data should therefore be added as new top-level fields with defaults.
 */
export const investigationSchema = investigationObjectSchema.loose().superRefine((investigation, ctx) => {
  for (const message of findIntegrityIssues(investigation)) ctx.addIssue({ code: "custom", message });
});

export type Subquestion = z.infer<typeof subquestionSchema>;
export type Hypothesis = z.infer<typeof hypothesisSchema>;
export type EvidenceCard = z.infer<typeof evidenceCardSchema>;
export type Claim = z.infer<typeof claimSchema>;
export type ChallengeResponse = z.infer<typeof challengeResponseSchema>;
export type Investigation = InvestigationShape;

/** The challenge wording copied into a response when it is first written. */
export type ChallengeSnapshot = Pick<ChallengeResponse, "challengeId" | "type" | "title" | "prompt">;

/** The user-editable parts of an evidence card. */
export type EvidenceInput = Omit<EvidenceCard, "id" | "createdAt" | "updatedAt">;
