/**
 * Discovery trails: optional, question-specific sequences of study steps for
 * curated questions. A trail walks through particular passages, separating
 * what each passage states from questions of interpretation, and gives the
 * user a place to record what they find in each step.
 *
 * Definitions live in src/data/discovery-trails.json (see
 * docs/DISCOVERY_TRAILS.md). The user's notes and progress are stored on the
 * investigation. Steps can be explored in any order; nothing is locked.
 */
import { z } from "zod";
import { SECTION_IDS } from "./investigation";
import { suggestedReferenceSchema } from "./question-bank";

export const DISCOVERY_TRAILS_VERSION = 1;

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slug = z
  .string()
  .regex(ID_PATTERN, { error: "Use lowercase letters, numbers, and single hyphens (e.g. mark-2-forgiveness)" })
  .max(64);
const nonEmpty = (max: number) => z.string().trim().min(1, { error: "Must not be empty" }).max(max);

export const trailConnectionSchema = z.strictObject({
  /** Another step in the same trail. */
  stepId: slug,
  /** Why the steps relate, phrased as something to compare or notice. */
  note: nonEmpty(300),
});

export const trailStepSchema = z.strictObject({
  /** Stable identifier. Saved notes refer to it, so never change or reuse one. */
  id: slug,
  title: nonEmpty(80),
  /** The guiding question for this step. */
  question: nonEmpty(300),
  /** Passages to read. Same rules as question-bank references; run `npm run verify:references`. */
  references: z.array(suggestedReferenceSchema).max(6).default([]),
  /** What the passages state directly, with verse numbers. Quotations must be exact. */
  stated: z.array(nonEmpty(400)).max(8).default([]),
  /** Questions the text leaves open. Phrased as questions, never as answers. */
  interpretation: z.array(nonEmpty(400)).max(8).default([]),
  /** Optional personal reflection prompts. */
  reflection: z.array(nonEmpty(300)).max(4).default([]),
  connections: z.array(trailConnectionSchema).max(4).default([]),
  /** A workspace section where this step's thinking naturally continues, offered as a link. */
  recordIn: z.enum(SECTION_IDS).optional(),
});

export const discoveryTrailSchema = z
  .strictObject({
    id: slug,
    /** The curated question this trail belongs to. One trail per question. */
    questionId: slug,
    title: nonEmpty(120),
    introduction: nonEmpty(600).optional(),
    steps: z.array(trailStepSchema).min(2).max(12),
  })
  .superRefine((trail, ctx) => {
    const ids = new Set<string>();
    trail.steps.forEach((step, index) => {
      if (ids.has(step.id)) ctx.addIssue({ code: "custom", path: ["steps", index, "id"], message: "duplicate step id" });
      ids.add(step.id);
    });
    trail.steps.forEach((step, index) => {
      step.connections.forEach((connection, connectionIndex) => {
        const path = ["steps", index, "connections", connectionIndex, "stepId"];
        if (connection.stepId === step.id) ctx.addIssue({ code: "custom", path, message: "a step can't connect to itself" });
        else if (!ids.has(connection.stepId)) ctx.addIssue({ code: "custom", path, message: `no step "${connection.stepId}"` });
      });
    });
  });

export type DiscoveryTrail = z.output<typeof discoveryTrailSchema>;
export type TrailStep = z.output<typeof trailStepSchema>;

const envelopeSchema = z.object({
  version: z.literal(DISCOVERY_TRAILS_VERSION, { error: `version must be ${DISCOVERY_TRAILS_VERSION}` }),
  trails: z.array(z.unknown(), { error: "trails must be an array" }),
});

export interface DiscoveryTrailsParseResult {
  /** Trails that passed validation. Invalid and duplicate entries are excluded. */
  trails: DiscoveryTrail[];
  /** One readable line per problem, e.g. `trails[0] (x) → steps.2.question: Must not be empty`. */
  issues: string[];
}

/** Validates the trails file. Pass the question bank's ids to also check that each trail's question exists. */
export function parseDiscoveryTrails(
  raw: unknown,
  { questionIds }: { questionIds?: ReadonlySet<string> } = {},
): DiscoveryTrailsParseResult {
  const envelope = envelopeSchema.safeParse(raw);
  if (!envelope.success) return { trails: [], issues: envelope.error.issues.map((issue) => issue.message) };

  const trails: DiscoveryTrail[] = [];
  const issues: string[] = [];
  const trailIds = new Set<string>();
  const questionsWithTrails = new Set<string>();

  envelope.data.trails.forEach((entry, index) => {
    const rawId = (entry as { id?: unknown } | null)?.id;
    const where = `trails[${index}]${typeof rawId === "string" ? ` (${rawId})` : ""}`;
    const result = discoveryTrailSchema.safeParse(entry);
    if (!result.success) {
      for (const issue of result.error.issues) {
        issues.push(`${where}${issue.path.length ? ` → ${issue.path.join(".")}` : ""}: ${issue.message}`);
      }
      return;
    }
    const trail = result.data;
    if (trailIds.has(trail.id)) return void issues.push(`${where}: duplicate id`);
    if (questionsWithTrails.has(trail.questionId)) {
      return void issues.push(`${where}: question "${trail.questionId}" already has a trail`);
    }
    if (questionIds && !questionIds.has(trail.questionId)) {
      return void issues.push(`${where} → questionId: no question "${trail.questionId}" in the question bank`);
    }
    trailIds.add(trail.id);
    questionsWithTrails.add(trail.questionId);
    trails.push(trail);
  });

  return { trails, issues };
}

/** Exact quotations in a trail's text: anything inside curly double quotes. */
export function quotationsIn(text: string): string[] {
  return [...text.matchAll(/“([^”]+)”/g)].map((match) => match[1]);
}
