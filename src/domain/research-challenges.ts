/**
 * Research challenges: short, optional prompts that suggest a way to look
 * closer while studying any question, curated or custom.
 *
 * Definitions live in src/data/research-challenges.json (see
 * docs/RESEARCH_CHALLENGES.md). The user's responses are stored on the
 * investigation. Responses are never graded, scored, or required.
 */
import { z } from "zod";

export const RESEARCH_CHALLENGES_VERSION = 1;

export const CHALLENGE_TYPES = ["observe", "connect", "compare", "question", "apply"] as const;
export type ChallengeType = (typeof CHALLENGE_TYPES)[number];

export const CHALLENGE_TYPE_INFO: Record<ChallengeType, { label: string; description: string }> = {
  observe: { label: "Observe", description: "Find something meaningful or surprising in a scripture." },
  connect: { label: "Connect", description: "Identify relationships between scriptures or principles." },
  compare: { label: "Compare", description: "Compare two sources and notice similarities or differences." },
  question: { label: "Question", description: "Record a new question raised during study." },
  apply: { label: "Apply", description: "Identify a principle that could help someone follow Jesus Christ." },
};

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const nonEmpty = (max: number) => z.string().trim().min(1, { error: "Must not be empty" }).max(max);

export const researchChallengeSchema = z.strictObject({
  /** Stable identifier. Saved responses refer to it, so never change or reuse one. */
  id: z
    .string()
    .regex(ID_PATTERN, { error: "Use lowercase letters, numbers, and single hyphens (e.g. observe-repeated-words)" })
    .max(64),
  type: z.enum(CHALLENGE_TYPES),
  title: nonEmpty(60),
  /** What to do. Must work for any question, and must not presume a conclusion. */
  prompt: nonEmpty(300),
  /** Optional practical hint on how to go about it. */
  tip: nonEmpty(300).optional(),
});

export type ResearchChallenge = z.output<typeof researchChallengeSchema>;

const envelopeSchema = z.object({
  version: z.literal(RESEARCH_CHALLENGES_VERSION, { error: `version must be ${RESEARCH_CHALLENGES_VERSION}` }),
  challenges: z.array(z.unknown(), { error: "challenges must be an array" }),
});

export interface ResearchChallengesParseResult {
  /** Entries that passed validation. Invalid and duplicate entries are excluded. */
  challenges: ResearchChallenge[];
  /** One readable line per problem, e.g. `challenges[3] (observe-x) → prompt: Must not be empty`. */
  issues: string[];
}

export function parseResearchChallenges(raw: unknown): ResearchChallengesParseResult {
  const envelope = envelopeSchema.safeParse(raw);
  if (!envelope.success) return { challenges: [], issues: envelope.error.issues.map((issue) => issue.message) };

  const challenges: ResearchChallenge[] = [];
  const issues: string[] = [];
  const seen = new Set<string>();

  envelope.data.challenges.forEach((entry, index) => {
    const rawId = (entry as { id?: unknown } | null)?.id;
    const where = `challenges[${index}]${typeof rawId === "string" ? ` (${rawId})` : ""}`;
    const result = researchChallengeSchema.safeParse(entry);
    if (!result.success) {
      for (const issue of result.error.issues) {
        issues.push(`${where}${issue.path.length ? ` → ${issue.path.join(".")}` : ""}: ${issue.message}`);
      }
      return;
    }
    if (seen.has(result.data.id)) {
      issues.push(`${where}: duplicate id`);
      return;
    }
    seen.add(result.data.id);
    challenges.push(result.data);
  });

  return { challenges, issues };
}

interface ChooseOptions {
  /** Limit to one type, or null for any type. */
  type: ChallengeType | null;
  /** Ids of challenges that already have a response. Others are offered first. */
  answered: ReadonlySet<string>;
  /** The challenge shown now. It is never chosen again while another is available. */
  currentId?: string;
  /** Returns a number in [0, 1). Injectable for testing; defaults to Math.random. */
  random?: () => number;
}

/**
 * Picks the next challenge: one without a response if possible, otherwise
 * any other challenge of the requested type. Returns the current challenge
 * only when it is the sole match, and undefined when nothing matches.
 */
export function chooseChallenge(
  challenges: readonly ResearchChallenge[],
  { type, answered, currentId, random = Math.random }: ChooseOptions,
): ResearchChallenge | undefined {
  const pool = type ? challenges.filter((challenge) => challenge.type === type) : challenges;
  const others = pool.filter((challenge) => challenge.id !== currentId);
  const unanswered = others.filter((challenge) => !answered.has(challenge.id));
  const candidates = unanswered.length > 0 ? unanswered : others;
  if (candidates.length === 0) return pool.find((challenge) => challenge.id === currentId);
  return candidates[Math.min(Math.floor(random() * candidates.length), candidates.length - 1)];
}

/** A fixed number in [0, 1) derived from `seed` (FNV-1a), so an investigation opens on the same challenge each time. */
export function seededFraction(seed: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) / 2 ** 32;
}
