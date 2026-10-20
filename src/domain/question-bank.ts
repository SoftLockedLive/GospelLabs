/**
 * Curated question bank: schema, validation, and error reporting.
 *
 * The data lives in src/data/question-bank.json. The JSON Schema next to it
 * (question-bank.schema.json) is generated from these Zod schemas so editors
 * can offer autocompletion; see docs/QUESTION_BANK.md.
 */
import { z } from "zod";

export const QUESTION_BANK_VERSION = 1;

export const DIFFICULTIES = ["introductory", "intermediate", "advanced"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  introductory: "Introductory",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const REFERENCE_TYPES = ["scripture", "gospel-topics", "general-conference", "manual", "other"] as const;
export type ReferenceType = (typeof REFERENCE_TYPES)[number];

export const REFERENCE_TYPE_LABELS: Record<ReferenceType, string> = {
  scripture: "Scripture",
  "gospel-topics": "Gospel Topics",
  "general-conference": "General Conference",
  manual: "Manual",
  other: "Other",
};

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const nonEmpty = (max: number) => z.string().trim().min(1, { error: "Must not be empty" }).max(max);

export const suggestedReferenceSchema = z
  .strictObject({
    label: nonEmpty(120).meta({
      description: 'How the reference is shown, e.g. "Alma 7:11–13" or "Gospel Topics: Prayer".',
    }),
    type: z.enum(REFERENCE_TYPES).meta({ description: "Kind of source." }),
    url: z
      .url({
        protocol: /^https$/,
        hostname: /^www\.churchofjesuschrist\.org$/,
        error: "Must be an https://www.churchofjesuschrist.org link",
      })
      .optional()
      .meta({
        description:
          "Optional link to the official Church website. Run `npm run verify:references` after adding or changing links.",
        // Surfaces the host rule in editors; Zod enforces it at runtime.
        pattern: "^https://www\\.churchofjesuschrist\\.org/",
      }),
  })
  .meta({ description: "A starting point for study. Not evidence, and not a conclusion." });

export const curatedQuestionSchema = z.strictObject({
  id: z
    .string()
    .regex(ID_PATTERN, { error: "Use lowercase letters, numbers, and single hyphens (e.g. meaning-of-the-sabbath)" })
    .max(64)
    .meta({ description: "Stable, unique identifier. Never change it once published; investigations link to it." }),
  question: nonEmpty(300).meta({ description: "The question, phrased openly without implying an answer." }),
  category: nonEmpty(60).meta({
    description: "Topic used for filtering. Reuse an existing category where one fits; new ones appear automatically.",
  }),
  difficulty: z.enum(DIFFICULTIES).meta({ description: "Rough depth of study required." }),
  tags: z.array(nonEmpty(40)).max(12).meta({ description: "Short keywords that help search. May be empty." }),
  suggestedReferences: z.array(suggestedReferenceSchema).max(12).default([]),
  prompts: z
    .array(nonEmpty(300))
    .max(8)
    .default([])
    .meta({ description: "Open-ended questions that guide study without presuming a conclusion." }),
  submittedBy: nonEmpty(80).optional().meta({ description: "Optional attribution for whoever suggested the question." }),
});

export type CuratedQuestion = z.output<typeof curatedQuestionSchema>;
export type SuggestedReference = z.output<typeof suggestedReferenceSchema>;

/** Full file shape; used to generate the documented JSON Schema. */
export const questionBankFileSchema = z.strictObject({
  $schema: z.string().optional(),
  version: z.literal(QUESTION_BANK_VERSION).meta({ description: "Format version of this file." }),
  questions: z.array(curatedQuestionSchema),
});

/** Envelope only, so each entry can be validated and reported individually. */
const envelopeSchema = z.object({
  version: z.literal(QUESTION_BANK_VERSION, { error: `version must be ${QUESTION_BANK_VERSION}` }),
  questions: z.array(z.unknown(), { error: "questions must be an array" }),
});

export interface QuestionBankIssue {
  /** Position in the questions array, when the issue belongs to one entry. */
  index?: number;
  /** The entry's id, when it has a readable one. */
  id?: string;
  /** Dotted path within the entry (or file) to the invalid value. */
  path: string;
  message: string;
}

export interface QuestionBankParseResult {
  /** Entries that passed validation. Invalid and duplicate entries are excluded. */
  questions: CuratedQuestion[];
  issues: QuestionBankIssue[];
}

function formatPath(path: readonly PropertyKey[]): string {
  return path.map((segment) => (typeof segment === "number" ? `[${segment}]` : `.${String(segment)}`)).join("").replace(/^\./, "");
}

export function parseQuestionBank(raw: unknown): QuestionBankParseResult {
  const envelope = envelopeSchema.safeParse(raw);
  if (!envelope.success) {
    return {
      questions: [],
      issues: envelope.error.issues.map((issue) => ({ path: formatPath(issue.path), message: issue.message })),
    };
  }

  const questions: CuratedQuestion[] = [];
  const issues: QuestionBankIssue[] = [];
  const firstIndexById = new Map<string, number>();

  envelope.data.questions.forEach((entry, index) => {
    const rawId = (entry as { id?: unknown } | null)?.id;
    const id = typeof rawId === "string" ? rawId : undefined;
    const result = curatedQuestionSchema.safeParse(entry);

    if (!result.success) {
      for (const issue of result.error.issues) {
        issues.push({ index, id, path: formatPath(issue.path), message: issue.message });
      }
      return;
    }

    const firstIndex = firstIndexById.get(result.data.id);
    if (firstIndex !== undefined) {
      issues.push({
        index,
        id,
        path: "id",
        message: `Duplicate id "${result.data.id}" (already used by questions[${firstIndex}])`,
      });
      return;
    }

    firstIndexById.set(result.data.id, index);
    questions.push(result.data);
  });

  return { questions, issues };
}

/** One readable line per issue, e.g. `questions[3] (born-again) → difficulty: Invalid option…`. */
export function formatQuestionBankIssues(issues: readonly QuestionBankIssue[]): string {
  return issues
    .map((issue) => {
      const where =
        issue.index === undefined
          ? issue.path || "(file)"
          : `questions[${issue.index}]${issue.id ? ` (${issue.id})` : ""}${issue.path ? ` → ${issue.path}` : ""}`;
      return `  • ${where}: ${issue.message}`;
    })
    .join("\n");
}
