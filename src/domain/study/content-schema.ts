/**
 * Gospel Labs 2.0 study content: Zod schemas for curated, version-controlled
 * content in src/content/. The schemas are the single source of truth;
 * TypeScript types are inferred from them, and src/lib/study-content.ts
 * validates every file when it loads (at build time for static pages), so
 * invalid content fails the build instead of shipping.
 *
 * Accuracy rules enforced here or by `npm run verify:references`:
 *   - Every source has a link to its original.
 *   - Scripture verse text and excerpts must match the original word for word.
 *   - Text inside curly double quotes (“…”) in any content field is a
 *     quotation and must appear verbatim in the sources that item cites.
 *     Single curly quotes (‘…’) mark a word being discussed and aren't checked.
 *   - Every Discovery Map connection cites at least one source.
 *   - Content is never generated at runtime; nothing AI-produced is stored here.
 */
import { z } from "zod";
import {
  DIFFICULTIES,
  isNodeRef,
  LEARNING_METHODS,
  PHASES,
  PRIMARY_QUESTIONS,
  RELATIONS,
  SOURCE_KINDS,
  VERDICTS,
  type Difficulty,
  type NodeRef,
} from "./vocabulary";

export const STUDY_CONTENT_VERSION = 1;

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const contentIdSchema = z.string().regex(ID_PATTERN, { error: "Use lowercase words joined by hyphens" });
const text = (max: number) => z.string().trim().min(1, { error: "Must not be empty" }).max(max);

export const nodeRefSchema = z.custom<NodeRef>(isNodeRef, {
  error: 'Must be "kind:id", where kind is scripture, concept, question, attribute, vocabulary, or investigation',
});

/** Draft content is validated but hidden from learners. */
export const CONTENT_STATUSES = ["draft", "ready"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

// --- Sources ----------------------------------------------------------------

export const verseSchema = z.strictObject({
  number: z.number().int().positive(),
  /** Exact verse text from the linked edition, without footnote markers. Verified by `npm run verify:references`. */
  text: text(1200),
});

/**
 * A source the learner can consult. Sources are declared inline in each
 * content file with globally unique ids; a source used by several files must
 * be declared identically everywhere (checked by tests).
 */
export const sourceSchema = z
  .strictObject({
    id: contentIdSchema,
    kind: z.enum(SOURCE_KINDS),
    /** How the source is cited, e.g. "Alma 7:11–13" or "Guide to the Scriptures: Meek, Meekness". */
    label: text(140),
    /** Talk or article title, when it differs from the label. */
    title: text(200).optional(),
    /** Speaker or author, for talks, speeches, and scholarly sources. */
    author: text(120).optional(),
    /** Where and when it was given or published, e.g. "General Conference, October 2016". */
    publication: text(160).optional(),
    url: z.url({ protocol: /^https$/, error: "Must be an https:// link to the original source" }),
    /** Scripture only: the verses shown in the app, verbatim. At most 12 verses, to keep excerpts short. */
    verses: z.array(verseSchema).max(12).optional(),
    /** A short verbatim excerpt (non-scripture sources), at most about 60 words. */
    excerpt: text(480).optional(),
    /** A neutral description of what the source contains. Not a quotation; never put “…” around paraphrase. */
    summary: text(400).optional(),
  })
  .superRefine((source, ctx) => {
    if (source.verses && source.kind !== "scripture") {
      ctx.addIssue({ code: "custom", message: "Only scripture sources can include verses", path: ["verses"] });
    }
    if (source.verses) {
      const numbers = source.verses.map((verse) => verse.number);
      if (numbers.some((n, i) => i > 0 && n !== numbers[i - 1] + 1)) {
        ctx.addIssue({ code: "custom", message: "Verses must be consecutive and in order", path: ["verses"] });
      }
    }
  });
export type Source = z.infer<typeof sourceSchema>;

// --- Concepts ---------------------------------------------------------------

/** A gospel concept or vocabulary term that can appear on the Discovery Map. */
export const conceptSchema = z.strictObject({
  id: contentIdSchema,
  kind: z.enum(["concept", "vocabulary"]),
  label: text(60),
  description: text(400),
  sourceIds: z.array(contentIdSchema).default([]),
});
export type Concept = z.infer<typeof conceptSchema>;

/**
 * A relationship the learner establishes by completing a step or activity.
 * Shown on the Discovery Map with its evidence. If the learner revealed the
 * answer instead of working it out, it is recorded as suggested, not discovered.
 */
export const connectionDefSchema = z.strictObject({
  from: nodeRefSchema,
  to: nodeRefSchema,
  relation: z.enum(RELATIONS),
  /** The evidence for this connection. At least one source is required: no unsupported connections. */
  sourceIds: z.array(contentIdSchema).min(1, { error: "Every connection needs supporting evidence" }),
  /** One sentence explaining the connection. */
  note: text(300),
});
export type ConnectionDef = z.infer<typeof connectionDefSchema>;

// --- Activities -------------------------------------------------------------

const choiceOptionSchema = z.strictObject({
  id: contentIdSchema,
  text: text(300),
  /** Shown when this option is chosen incorrectly: a clue pointing back to the evidence, never the answer. */
  feedback: text(400).optional(),
});

export const choiceQuestionSchema = z
  .strictObject({
    id: contentIdSchema,
    prompt: text(400),
    options: z.array(choiceOptionSchema).min(2).max(6),
    correct: z.array(contentIdSchema).min(1),
    multiple: z.boolean().default(false),
  })
  .superRefine((question, ctx) => {
    const ids = new Set(question.options.map((option) => option.id));
    for (const id of question.correct) {
      if (!ids.has(id)) ctx.addIssue({ code: "custom", message: `Correct option "${id}" isn't an option`, path: ["correct"] });
    }
    if (!question.multiple && question.correct.length !== 1) {
      ctx.addIssue({ code: "custom", message: "A single-answer question needs exactly one correct option", path: ["correct"] });
    }
  });
export type ChoiceQuestion = z.infer<typeof choiceQuestionSchema>;

/** Fields shared by every checked activity. */
const checkedBase = {
  id: contentIdSchema,
  /** The instruction or question the learner works on. */
  prompt: text(400),
  /** Evidence to consult; shown in the evidence panel beside the activity. */
  sourceIds: z.array(contentIdSchema).default([]),
  /** Progressively clearer hints, offered one at a time after incorrect attempts or on request. */
  hints: z.array(text(400)).min(1).max(4),
  /** Why the answer is what it is. Shown after completion, labeled as suggested by Gospel Labs. */
  explanation: text(900),
};

const sideItemSchema = z.strictObject({ id: contentIdSchema, text: text(300), sourceId: contentIdSchema.optional() });

/** Evidence Connections: connect principles or claims (left) with the evidence that supports them (right). */
export const evidenceConnectSchema = z
  .strictObject({
    type: z.literal("evidence-connect"),
    ...checkedBase,
    left: z.strictObject({ label: text(40), items: z.array(sideItemSchema).min(2).max(6) }),
    /** May include distractors: items that pair with nothing. */
    right: z.strictObject({ label: text(40), items: z.array(sideItemSchema).min(2).max(7) }),
    /** Exactly one pair per left item. */
    pairs: z
      .array(
        z.strictObject({
          left: contentIdSchema,
          right: contentIdSchema,
          because: text(400),
          /** Shown when this left item is paired incorrectly. */
          clue: text(400).optional(),
        }),
      )
      .min(2),
  })
  .superRefine((activity, ctx) => {
    const left = new Set(activity.left.items.map((item) => item.id));
    const right = new Set(activity.right.items.map((item) => item.id));
    const paired = new Set<string>();
    for (const pair of activity.pairs) {
      if (!left.has(pair.left)) ctx.addIssue({ code: "custom", message: `Pair uses unknown left item "${pair.left}"`, path: ["pairs"] });
      if (!right.has(pair.right)) ctx.addIssue({ code: "custom", message: `Pair uses unknown right item "${pair.right}"`, path: ["pairs"] });
      if (paired.has(pair.left)) ctx.addIssue({ code: "custom", message: `Left item "${pair.left}" has more than one pair`, path: ["pairs"] });
      paired.add(pair.left);
    }
    for (const id of left) if (!paired.has(id)) ctx.addIssue({ code: "custom", message: `Left item "${id}" has no pair`, path: ["pairs"] });
  });

/** Follow the Clues: examine clues one at a time, then answer what they show together. */
export const clueSchema = z
  .strictObject({
    type: z.literal("clue"),
    ...checkedBase,
    clues: z.array(z.strictObject({ id: contentIdSchema, title: text(80), text: text(500), sourceId: contentIdSchema.optional() })).min(2).max(6),
    /** How many clues must be examined before answering. Defaults to all. */
    minRevealed: z.number().int().positive().optional(),
    question: choiceQuestionSchema,
  })
  .superRefine((activity, ctx) => {
    if (activity.minRevealed && activity.minRevealed > activity.clues.length) {
      ctx.addIssue({ code: "custom", message: "minRevealed is more than the number of clues", path: ["minRevealed"] });
    }
  });

/** Build the Principle: arrange fragments into a statement the evidence supports. Unused fragments are distractors. */
export const buildPrincipleSchema = z
  .strictObject({
    type: z.literal("build-principle"),
    ...checkedBase,
    fragments: z.array(z.strictObject({ id: contentIdSchema, text: text(160) })).min(3).max(10),
    solution: z.array(contentIdSchema).min(2),
    /** Other orders that are equally correct. */
    alternatives: z.array(z.array(contentIdSchema).min(2)).default([]),
    /** The finished principle as one sentence, shown after completion. */
    statement: text(400),
  })
  .superRefine((activity, ctx) => {
    const ids = new Set(activity.fragments.map((fragment) => fragment.id));
    for (const order of [activity.solution, ...activity.alternatives]) {
      for (const id of order) if (!ids.has(id)) ctx.addIssue({ code: "custom", message: `Unknown fragment "${id}"`, path: ["solution"] });
      if (new Set(order).size !== order.length) ctx.addIssue({ code: "custom", message: "A fragment is used twice", path: ["solution"] });
    }
  });

/**
 * Compare Perspectives: decide whether each perspective is supported by the
 * sources, goes beyond them (an interpretation they don't settle), or is
 * contradicted by them.
 */
export const compareSchema = z.strictObject({
  type: z.literal("compare"),
  ...checkedBase,
  perspectives: z
    .array(
      z.strictObject({
        id: contentIdSchema,
        text: text(400),
        /** Who might say this, e.g. "A classmate" or "A common idea". Never attributes words to a real person. */
        voice: text(60).optional(),
        verdict: z.enum(VERDICTS),
        rationale: text(500),
      }),
    )
    .min(2)
    .max(6),
});

/** Scripture Connections: identify how two or more passages relate. */
export const scriptureConnectSchema = z.strictObject({
  type: z.literal("scripture-connect"),
  ...checkedBase,
  /** Scripture source ids, shown side by side. */
  passages: z.array(contentIdSchema).min(2).max(4),
  questions: z.array(choiceQuestionSchema).min(1).max(3),
});

/** Vocabulary Matching: match terms with their meanings (and, optionally, scriptural examples). */
export const vocabMatchSchema = z.strictObject({
  type: z.literal("vocab-match"),
  ...checkedBase,
  pairs: z
    .array(
      z.strictObject({
        id: contentIdSchema,
        term: text(60),
        meaning: text(240),
        example: z.strictObject({ text: text(300), sourceId: contentIdSchema }).optional(),
      }),
    )
    .min(2)
    .max(6),
  /** Plausible meanings that match no term. */
  extraMeanings: z.array(text(240)).max(3).default([]),
  /** "both" also asks the learner to match each term with its scriptural example (every pair needs one). */
  match: z.enum(["meaning", "example", "both"]).default("meaning"),
});

/** Sort: place each item in the right category, e.g. meekness vs. weakness, or stated vs. interpreted. */
export const sortSchema = z
  .strictObject({
    type: z.literal("sort"),
    ...checkedBase,
    categories: z.array(z.strictObject({ id: contentIdSchema, label: text(60), description: text(200).optional() })).min(2).max(4),
    items: z.array(z.strictObject({ id: contentIdSchema, text: text(240), category: contentIdSchema, why: text(400) })).min(3).max(10),
  })
  .superRefine((activity, ctx) => {
    const categories = new Set(activity.categories.map((category) => category.id));
    for (const item of activity.items) {
      if (!categories.has(item.category)) {
        ctx.addIssue({ code: "custom", message: `Item "${item.id}" uses unknown category "${item.category}"`, path: ["items"] });
      }
    }
  });

/**
 * Highlight: tap the phrases in a passage that answer the prompt. The chunks
 * of each verse, joined with single spaces, must equal that verse's text in
 * the source (checked by tests), so the passage can never drift from the original.
 */
export const highlightSchema = z
  .strictObject({
    type: z.literal("highlight"),
    ...checkedBase,
    /** A scripture source with verses. */
    passage: contentIdSchema,
    chunks: z.array(z.strictObject({ verse: z.number().int().positive(), text: text(400) })).min(2).max(40),
    /** Indices into chunks of the phrases that answer the prompt. */
    targets: z.array(z.number().int().nonnegative()).min(1),
    /** How many targets must be found. Defaults to all. */
    minTargets: z.number().int().positive().optional(),
  })
  .superRefine((activity, ctx) => {
    for (const index of activity.targets) {
      if (index >= activity.chunks.length) ctx.addIssue({ code: "custom", message: `Target ${index} is out of range`, path: ["targets"] });
    }
    if (activity.minTargets && activity.minTargets > activity.targets.length) {
      ctx.addIssue({ code: "custom", message: "minTargets is more than the number of targets", path: ["minTargets"] });
    }
  });

/** Optional written reflection. Never checked, scored, or required; continuing without writing is always allowed. */
export const reflectSchema = z.strictObject({
  type: z.literal("reflect"),
  id: contentIdSchema,
  prompt: text(400),
  sourceIds: z.array(contentIdSchema).default([]),
  /** Gentle questions to think about. */
  suggestions: z.array(text(240)).max(4).default([]),
});

export const activitySchema = z.discriminatedUnion("type", [
  evidenceConnectSchema,
  clueSchema,
  buildPrincipleSchema,
  compareSchema,
  scriptureConnectSchema,
  vocabMatchSchema,
  sortSchema,
  highlightSchema,
  reflectSchema,
]);
export type Activity = z.infer<typeof activitySchema>;
export type ActivityType = Activity["type"];
export type CheckedActivity = Exclude<Activity, { type: "reflect" }>;
export type ActivityOf<T extends ActivityType> = Extract<Activity, { type: T }>;

export const ACTIVITY_TYPES = [
  "evidence-connect",
  "clue",
  "build-principle",
  "compare",
  "scripture-connect",
  "vocab-match",
  "sort",
  "highlight",
  "reflect",
] as const satisfies readonly ActivityType[];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  "evidence-connect": "Evidence Connections",
  clue: "Follow the Clues",
  "build-principle": "Build the Principle",
  compare: "Compare Perspectives",
  "scripture-connect": "Scripture Connections",
  "vocab-match": "Vocabulary Matching",
  sort: "Sort It Out",
  highlight: "Find It in the Text",
  reflect: "Reflection",
};

// --- Investigations ---------------------------------------------------------

const activitiesByDifficultySchema = z
  .strictObject(Object.fromEntries(DIFFICULTIES.map((difficulty) => [difficulty, activitySchema.optional()])) as Record<
    Difficulty,
    z.ZodOptional<typeof activitySchema>
  >);

export const stepSchema = z
  .strictObject({
    id: contentIdSchema,
    title: text(100),
    phase: z.enum(PHASES),
    method: z.enum(LEARNING_METHODS).optional(),
    /** Short framing before the activity. */
    intro: text(700).optional(),
    /** Evidence featured in this step. */
    sourceIds: z.array(contentIdSchema).default([]),
    /** One activity per difficulty. Difficulty should change the kind of reasoning asked for. */
    activities: activitiesByDifficultySchema.default({}),
    /** Used at any difficulty without its own activity (typically a reflection). */
    activity: activitySchema.optional(),
    /** What this step brings out. Shown after completion, labeled as suggested by Gospel Labs. */
    insight: text(900),
    /** Concepts this step demonstrates (concept or vocabulary ids). */
    concepts: z.array(contentIdSchema).default([]),
    /** Relationships established by completing this step. */
    connections: z.array(connectionDefSchema).default([]),
    /** Side questions offered at this step. */
    branchIds: z.array(contentIdSchema).default([]),
    /** Quick sessions include only core steps. */
    depth: z.enum(["core", "deep"]).default("core"),
  })
  .superRefine((step, ctx) => {
    if (!step.activity && DIFFICULTIES.every((difficulty) => !step.activities[difficulty])) {
      ctx.addIssue({ code: "custom", message: "A step needs at least one activity", path: ["activities"] });
    }
  });
export type Step = z.infer<typeof stepSchema>;

export const branchSchema = z.strictObject({
  id: contentIdSchema,
  /** The related side question. */
  question: text(200),
  intro: text(700),
  steps: z.array(stepSchema).min(1).max(3),
  /** Shown when returning to the main investigation. */
  returnNote: text(300).optional(),
});
export type Branch = z.infer<typeof branchSchema>;

/**
 * Doctrinal review of a content item. Each note records an interpretive choice, a reliance on a speaker,
 * or a sensitive topic; `resolution` records how it was handled (reworded, qualified, cited, or withheld).
 */
export const reviewSchema = z.strictObject({
  status: z.enum(["verified", "needs-review"]),
  notes: z.array(z.strictObject({ where: text(120), note: text(600), resolution: text(600).optional() })).default([]),
});

export const investigationSchema = z.strictObject({
  id: contentIdSchema,
  status: z.enum(CONTENT_STATUSES),
  /** Raise when steps or activities change in a way that should reset progress. */
  contentVersion: z.number().int().positive(),
  title: text(80),
  /** The central question, as the learner sees it. */
  question: text(200),
  /** One line on why the question matters. */
  hook: text(240),
  theme: text(40),
  tags: z.array(contentIdSchema).default([]),
  primaryQuestion: z.strictObject({
    id: z.enum(PRIMARY_QUESTIONS),
    /** How this question relates to the primary question. */
    note: text(500),
  }),
  /**
   * Questions people commonly ask about this topic, written in general terms by Gospel Labs. Never
   * quotations from the learner survey: survey responses stay private (see scripts/import-learner-questions.mjs).
   */
  commonQuestions: z.array(text(200)).max(4).default([]),
  estimatedMinutes: z.strictObject({ quick: z.number().int().min(3).max(45), deep: z.number().int().min(10).max(90) }),
  intro: text(900),
  sources: z.array(sourceSchema).min(1),
  concepts: z.array(conceptSchema).default([]),
  steps: z.array(stepSchema).min(3).max(9),
  branches: z.array(branchSchema).max(4).default([]),
  discovery: z.strictObject({
    /** Summary of what the evidence shows. Shown in the Discovery Card, labeled as suggested by Gospel Labs. */
    summary: text(1200),
    keyIdeas: z.array(text(300)).min(2).max(6),
    /** How the discovery points to Jesus Christ. */
    christConnection: text(700),
    /** Questions worth carrying forward. */
    openQuestions: z.array(text(240)).max(4).default([]),
  }),
  /** Doctrinal review. Anything uncertain, disputed, or interpretive is flagged here for the project owner. */
  review: reviewSchema,
});
export type StudyInvestigation = z.infer<typeof investigationSchema>;

// --- Character of Christ ----------------------------------------------------

export const attributeSchema = z.strictObject({
  id: contentIdSchema,
  status: z.enum(CONTENT_STATUSES),
  name: text(40),
  /** One line, shown on the attribute card. */
  summary: text(200),
  /** An accurate definition drawn from the cited source. Quote only with “…”. */
  definition: z.strictObject({ text: text(700), sourceIds: z.array(contentIdSchema).min(1) }),
  vocabulary: z
    .array(
      z.strictObject({
        id: contentIdSchema,
        term: text(40),
        meaning: text(300),
        sourceIds: z.array(contentIdSchema).default([]),
      }),
    )
    .min(3)
    .max(8),
  /** Easily confused ideas, e.g. meekness vs. weakness. */
  contrasts: z
    .array(z.strictObject({ id: contentIdSchema, term: text(40), title: text(80), explanation: text(700), sourceIds: z.array(contentIdSchema).min(1) }))
    .max(3)
    .default([]),
  scriptures: z.array(z.strictObject({ sourceId: contentIdSchema, note: text(400) })).min(2).max(6),
  /** Accounts from the Savior's life that show the attribute. */
  saviorExamples: z.array(z.strictObject({ id: contentIdSchema, title: text(80), sourceId: contentIdSchema, note: text(500) })).min(2).max(5),
  relationships: z
    .array(z.strictObject({ attributeId: contentIdSchema, relation: z.enum(RELATIONS), note: text(400), sourceIds: z.array(contentIdSchema).min(1) }))
    .max(5)
    .default([]),
  activities: z.array(activitySchema).min(1).max(4),
  /** Optional, never required or evaluated. */
  reflection: z.array(text(240)).max(4).default([]),
  /**
   * A safety note shown prominently on the attribute's page, for attributes that could be misread as
   * requiring someone to stay in harm's way (forgiveness, long-suffering). Cites official help.
   */
  safety: z.strictObject({ text: text(700), sourceIds: z.array(contentIdSchema).min(1) }).optional(),
  sources: z.array(sourceSchema).min(1),
  review: reviewSchema,
});
export type ChristAttribute = z.infer<typeof attributeSchema>;

// --- Scripture Explorer ------------------------------------------------------

export const passageSchema = z.strictObject({
  id: contentIdSchema,
  status: z.enum(CONTENT_STATUSES),
  title: text(80),
  /** A scripture source with verses. */
  sourceId: contentIdSchema,
  context: z.strictObject({
    setting: text(500),
    speaker: text(120).optional(),
    audience: text(160).optional(),
  }),
  themes: z.array(z.strictObject({ conceptId: contentIdSchema, note: text(400), verses: z.array(z.number().int().positive()).default([]) })).min(2).max(6),
  /** Significant words and phrases. `phrase` must appear verbatim in the given verse (checked by tests). */
  keyPhrases: z
    .array(z.strictObject({ id: contentIdSchema, verse: z.number().int().positive(), phrase: text(160), meaning: text(500), sourceIds: z.array(contentIdSchema).default([]) }))
    .min(2)
    .max(8),
  related: z.array(z.strictObject({ sourceId: contentIdSchema, relation: z.enum(RELATIONS), note: text(400) })).min(2).max(6),
  /** Contextual questions with explained answers drawn from the sources. */
  questions: z.array(z.strictObject({ id: contentIdSchema, question: text(240), answer: text(700), sourceIds: z.array(contentIdSchema).min(1) })).max(4).default([]),
  activities: z.array(activitySchema).max(3).default([]),
  connections: z.array(connectionDefSchema).default([]),
  sources: z.array(sourceSchema).min(1),
  review: reviewSchema,
});
export type ExplorerPassage = z.infer<typeof passageSchema>;

// --- Connect with Christ ------------------------------------------------------

export const CONNECT_FORMATS = ["see", "understand", "reflect"] as const;
export type ConnectFormat = (typeof CONNECT_FORMATS)[number];

export const CONNECT_FORMAT_LABELS: Record<ConnectFormat, string> = {
  see: "See Christ",
  understand: "Understand Christ",
  reflect: "Reflect on Christ",
};

export const CONNECT_FORMAT_DESCRIPTIONS: Record<ConnectFormat, string> = {
  see: "Study a short account of the Savior and what it reveals about Him.",
  understand: "Explore a meaningful question about His teachings or character.",
  reflect: "Read a short scripture, and contemplate or pray if you wish.",
};

/** A quiet, roughly five-minute session. Nothing is scored, counted, or required. */
export const connectSessionSchema = z.strictObject({
  id: contentIdSchema,
  status: z.enum(CONTENT_STATUSES),
  format: z.enum(CONNECT_FORMATS),
  title: text(80),
  /** The scripture at the heart of the session (a source with verses). */
  sourceId: contentIdSchema,
  intro: text(500),
  /** See Christ: details worth noticing in the account. */
  notice: z.array(text(300)).max(5).default([]),
  /** Understand Christ: the question explored. */
  question: text(240).optional(),
  /** What the sources show, each with its evidence. Labeled as suggested by Gospel Labs. */
  insights: z.array(z.strictObject({ text: text(500), sourceIds: z.array(contentIdSchema).min(1) })).max(4).default([]),
  /** Optional things to ponder. */
  ponder: z.array(text(240)).max(3).default([]),
  /** An optional, gentle invitation to pray. Never asks the learner to report feelings. */
  prayer: text(300).optional(),
  sources: z.array(sourceSchema).min(1),
});
export type ConnectSession = z.infer<typeof connectSessionSchema>;
