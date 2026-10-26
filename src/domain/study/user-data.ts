/**
 * Gospel Labs 2.0 personal study data, stored in IndexedDB alongside (never
 * inside) the 1.x research investigations. Four record types:
 *
 *   StudyProgress     — position and step states in one guided investigation
 *   DiscoveryCard     — a Notebook entry; also the evidence behind Map nodes and edges
 *   PersonalConnection — a relationship the learner added to the Map, in their own words
 *   Exploration       — what was explored in Scripture Explorer, Character of
 *                       Christ, and Connect with Christ (never a score)
 *
 * The Notebook and the Discovery Map read the same records: the Map is
 * computed from Discovery Cards plus Personal Connections (src/domain/study/graph.ts),
 * so the two can never disagree.
 *
 * Sync-ready conventions: every record has a stable random id, createdAt and
 * updatedAt timestamps, and a `dataVersion` stamp. Unknown top-level fields
 * are kept (loose objects), so a tab running an older version never erases
 * data written by a newer one. New fields must be added with defaults, or as
 * optional fields that readers treat as missing (Exploration.lastOpenedAt).
 */
import { z } from "zod";
import {
  DIFFICULTIES,
  isNodeRef,
  NODE_KINDS,
  PRIMARY_QUESTIONS,
  RELATIONS,
  SOURCE_KINDS,
  STUDY_LENGTHS,
  type NodeRef,
} from "./vocabulary";

/** Raise when stored study records change in a way older versions would damage on save. */
export const STUDY_DATA_VERSION = 1;

export const isFromNewerStudyVersion = (record: { dataVersion?: number }) => (record.dataVersion ?? 0) > STUDY_DATA_VERSION;

const idSchema = z.string().min(1);
const timestampSchema = z.iso.datetime();
const nodeRefSchema = z.custom<NodeRef>(isNodeRef, { error: "Invalid node reference" });

// --- Progress ----------------------------------------------------------------

export const STEP_STATUSES = ["started", "complete"] as const;
export type StepStatus = (typeof STEP_STATUSES)[number];

export const stepStateSchema = z
  .object({
    status: z.enum(STEP_STATUSES),
    /** The difficulty the step was worked (or completed) at. */
    difficulty: z.enum(DIFFICULTIES),
    /** Checked attempts made at the current difficulty. */
    attempts: z.number().int().nonnegative().default(0),
    /** How many hints have been shown. */
    hintsShown: z.number().int().nonnegative().default(0),
    /** True if the learner chose to see the answer instead of finding it. Relationships are then "suggested". */
    revealed: z.boolean().default(false),
    /** The learner chose to move on without finishing. Never blocks progress. */
    skipped: z.boolean().default(false),
    /** The learner's last answer, in the activity's own response format, so a step reopens as they left it. */
    response: z.unknown().optional(),
    /** Optional written reflection. Never evaluated. */
    reflection: z.string().optional(),
    completedAt: timestampSchema.optional(),
    updatedAt: timestampSchema,
  })
  .loose();
export type StepState = z.infer<typeof stepStateSchema>;

/** Key for a step in StudyProgress.steps: the step id, or "branchId/stepId" for steps in a side branch. */
export const stepKey = (stepId: string, branchId?: string) => (branchId ? `${branchId}/${stepId}` : stepId);

export const studyPositionSchema = z.object({ stepId: idSchema, branchId: idSchema.optional() });
export type StudyPosition = z.infer<typeof studyPositionSchema>;

export const studyProgressSchema = z
  .object({
    /** The investigation's content id. One progress record per investigation. */
    id: idSchema,
    dataVersion: z.number().int().positive().optional(),
    /** The content version this progress was made against. */
    contentVersion: z.number().int().positive(),
    startedAt: timestampSchema,
    updatedAt: timestampSchema,
    completedAt: timestampSchema.optional(),
    difficulty: z.enum(DIFFICULTIES),
    length: z.enum(STUDY_LENGTHS),
    position: studyPositionSchema,
    /** While in a side branch: the main-path step to return to. */
    returnTo: idSchema.optional(),
    steps: z.record(z.string(), stepStateSchema).default(() => ({})),
    visitedBranches: z.array(idSchema).default(() => []),
    /** The Discovery Card created when the investigation was completed. */
    discoveryId: idSchema.optional(),
  })
  .loose();
export type StudyProgress = z.infer<typeof studyProgressSchema>;

// --- Discovery Cards ----------------------------------------------------------

export const DISCOVERY_ORIGINS = ["investigation", "passage", "attribute", "connect"] as const;
export type DiscoveryOrigin = (typeof DISCOVERY_ORIGINS)[number];

export const labeledNodeSchema = z.object({ ref: nodeRefSchema, label: z.string().min(1) });
export type LabeledNode = z.infer<typeof labeledNodeSchema>;

/**
 * A relationship recorded in a Discovery Card. "demonstrated": the learner
 * worked it out. "suggested": the learner revealed the answer, or the app
 * explained it. Either way it cites its evidence.
 */
export const cardConnectionSchema = z.object({
  id: idSchema,
  from: labeledNodeSchema,
  to: labeledNodeSchema,
  relation: z.enum(RELATIONS),
  sourceIds: z.array(idSchema).min(1),
  note: z.string(),
  provenance: z.enum(["demonstrated", "suggested"]),
});
export type CardConnection = z.infer<typeof cardConnectionSchema>;

/** A source snapshot, so a card keeps its citations even if content changes later. */
export const cardSourceSchema = z.object({
  id: idSchema,
  label: z.string().min(1),
  kind: z.enum(SOURCE_KINDS),
  url: z.string().optional(),
});
export type CardSource = z.infer<typeof cardSourceSchema>;

/** A phrase the learner highlighted (Scripture Explorer), copied with its location. */
export const cardHighlightSchema = z.object({
  sourceId: idSchema,
  verse: z.number().int().positive(),
  text: z.string().min(1),
  conceptId: idSchema.optional(),
  note: z.string().default(""),
});
export type CardHighlight = z.infer<typeof cardHighlightSchema>;

export const discoveryCardSchema = z
  .object({
    id: idSchema,
    dataVersion: z.number().int().positive().optional(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
    origin: z.object({
      kind: z.enum(DISCOVERY_ORIGINS),
      /** Content id of the investigation, passage, attribute, or session. */
      contentId: idSchema,
      contentVersion: z.number().int().positive().optional(),
      difficulty: z.enum(DIFFICULTIES).optional(),
      /** Investigations: the primary question it rests on, so the Map can link to it. */
      primaryQuestion: z.enum(PRIMARY_QUESTIONS).optional(),
    }),
    title: z.string().min(1),
    question: z.string().optional(),
    /** Written by Gospel Labs content, never by the learner or AI. Always labeled as suggested. */
    summary: z.string().default(""),
    sources: z.array(cardSourceSchema).default(() => []),
    /** Concepts the learner worked with. `demonstrated` is false when they revealed the answer. */
    concepts: z.array(labeledNodeSchema.extend({ demonstrated: z.boolean() })).default(() => []),
    connections: z.array(cardConnectionSchema).default(() => []),
    highlights: z.array(cardHighlightSchema).default(() => []),
    /** Optional personal notes. The only free text on a card the learner writes. */
    notes: z.string().default(""),
  })
  .loose();
export type DiscoveryCard = z.infer<typeof discoveryCardSchema>;

// --- Personal connections -------------------------------------------------------

/** A relationship the learner added to their Map. Always shown as "Your interpretation". */
export const personalConnectionSchema = z
  .object({
    id: idSchema,
    dataVersion: z.number().int().positive().optional(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
    from: labeledNodeSchema,
    to: labeledNodeSchema,
    relation: z.enum(RELATIONS),
    /** Why the learner sees this connection, in their own words. Required. */
    note: z.string().trim().min(1),
    /** Optional sources the learner associates with it. */
    sourceIds: z.array(idSchema).default(() => []),
  })
  .loose()
  .refine((connection) => connection.from.ref !== connection.to.ref, { error: "A connection must join two different nodes" });
export type PersonalConnection = z.infer<typeof personalConnectionSchema>;

// --- Explorations --------------------------------------------------------------

export const EXPLORATION_KINDS = ["attribute", "passage", "connect"] as const;
export type ExplorationKind = (typeof EXPLORATION_KINDS)[number];

export const explorationId = (kind: ExplorationKind, contentId: string) => `${kind}:${contentId}`;

/** A highlight the learner made in Scripture Explorer: words [start, end) of a verse, split on whitespace. */
export const passageHighlightSchema = z
  .object({
    id: idSchema,
    verse: z.number().int().positive(),
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
    conceptId: idSchema.optional(),
    note: z.string().default(""),
    createdAt: timestampSchema,
  })
  .refine((highlight) => highlight.end > highlight.start, { error: "A highlight must cover at least one word" });
export type PassageHighlight = z.infer<typeof passageHighlightSchema>;

/**
 * What the learner explored in one attribute, passage, or Connect with Christ
 * session. Scripture Explorer also keeps each activity's saved state in an
 * `activityStates` field (by activity id); it is kept by the loose schema and
 * read defensively by src/domain/study/explorer.ts, so one malformed entry
 * can never make the whole record unreadable. Tracks material explored, never righteousness, feelings, or
 * streaks. Connect with Christ stores only when a session was last opened,
 * so the rotation can offer something fresh.
 *
 * `updatedAt` changes only when the learner's work changes (a note, a word or
 * activity explored, a highlight). Merely opening a page sets `lastOpenedAt`
 * instead: backup merges keep the more recently updated copy, so a visit must
 * never outrank a copy with real work in it.
 */
export const explorationSchema = z
  .object({
    /** explorationId(kind, contentId) */
    id: idSchema,
    dataVersion: z.number().int().positive().optional(),
    kind: z.enum(EXPLORATION_KINDS),
    contentId: idSchema,
    firstAt: timestampSchema,
    updatedAt: timestampSchema,
    /**
     * When the page was last opened. Optional, with no default, so records
     * read before it was added keep their shape; readers fall back to updatedAt.
     */
    lastOpenedAt: timestampSchema.optional(),
    completedActivities: z.array(idSchema).default(() => []),
    /** Vocabulary ids explored (Character of Christ). */
    vocabulary: z.array(idSchema).default(() => []),
    highlights: z.array(passageHighlightSchema).default(() => []),
    /** Optional private note. */
    note: z.string().default(""),
  })
  .loose();
export type Exploration = z.infer<typeof explorationSchema>;

export const NODE_KIND_ORDER = NODE_KINDS;
