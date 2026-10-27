/**
 * Dashboard suggestions: which guided investigation to offer next, and where
 * a learner is in the ones they've started. Pure functions over lightweight
 * content summaries and the learner's own records, so the dashboard never
 * needs the full content in the browser.
 *
 * Suggestions favor, in order:
 *   1. investigations not started yet (completed ones come after, to revisit);
 *   2. ones related to concepts in the learner's recent discoveries;
 *   3. ones that suit the chosen session length;
 * and vary the themes in the list. Nothing here measures how much or how well
 * someone studies: no counts, scores, or streaks influence a suggestion.
 */
import type { DiscoveryCard, StudyProgress } from "./user-data";
import { parseNodeRef, STUDY_LENGTH_MINUTES, type NodeRef, type PrimaryQuestion, type StudyLength } from "./vocabulary";

/** What the dashboard knows about an investigation (built on the server from the full content). */
export interface InvestigationSummary {
  id: string;
  title: string;
  question: string;
  hook: string;
  theme: string;
  primaryQuestion?: PrimaryQuestion;
  estimatedMinutes: { quick: number; deep: number };
  /** Main-path steps in order. `deep` steps are included only in deep sessions. */
  steps: readonly { id: string; deep: boolean }[];
  /** Number of side questions (branches) offered. */
  branches: number;
  /** Concept, vocabulary, and attribute nodes this investigation works with ("kind:id"). */
  related: readonly NodeRef[];
}

/** Node kinds that make two studies "related" (scripture refs are too specific to suggest by). */
const RELATED_KINDS = new Set(["concept", "vocabulary", "attribute"]);

const isRelatedRef = (ref: string) => {
  const parsed = parseNodeRef(ref);
  return parsed !== null && RELATED_KINDS.has(parsed.kind);
};

/** Steps in a session of the given length, in order. */
export function sessionSteps(investigation: Pick<InvestigationSummary, "steps">, length: StudyLength) {
  return length === "deep" ? investigation.steps : investigation.steps.filter((step) => !step.deep);
}

export const coreStepCount = (investigation: Pick<InvestigationSummary, "steps">) => sessionSteps(investigation, "quick").length;
export const deepStepCount = (investigation: Pick<InvestigationSummary, "steps">) => investigation.steps.filter((step) => step.deep).length;

export const minutesFor = (investigation: Pick<InvestigationSummary, "estimatedMinutes">, length: StudyLength) =>
  investigation.estimatedMinutes[length];

export interface StudyPositionSummary {
  /** 1-based step number on the session's path. */
  step: number;
  total: number;
  /** Steps on the path completed (or deliberately moved past). */
  completed: number;
  /** True while the learner is exploring a side question. */
  inBranch: boolean;
}

/**
 * Where the learner is: "step n of m" on the path for the session length they
 * chose. While in a side question, the step they'll return to. If the saved
 * position isn't on the path (content changed, or a deep step in a quick
 * session), the next path step after it.
 */
export function studyPosition(progress: StudyProgress, investigation: Pick<InvestigationSummary, "steps">): StudyPositionSummary {
  const path = sessionSteps(investigation, progress.length);
  const inBranch = progress.position.branchId !== undefined;
  const stepId = inBranch ? (progress.returnTo ?? progress.position.stepId) : progress.position.stepId;
  const completed = path.filter((step) => {
    const state = progress.steps[step.id];
    return state?.status === "complete" || state?.skipped === true;
  }).length;

  const last = Math.max(path.length - 1, 0);
  let index = path.findIndex((step) => step.id === stepId);
  if (index < 0) {
    const fullIndex = investigation.steps.findIndex((step) => step.id === stepId);
    if (fullIndex < 0) {
      // The step no longer exists: place the learner after the steps they've done.
      index = Math.min(completed, last);
    } else {
      const order = new Map(investigation.steps.map((step, i) => [step.id, i]));
      const next = path.findIndex((step) => (order.get(step.id) ?? 0) >= fullIndex);
      index = next < 0 ? last : next;
    }
  }
  return { step: path.length === 0 ? 0 : index + 1, total: path.length, completed, inBranch };
}

/** Investigations the learner has started and not finished, most recently studied first. */
export function inProgressInvestigations<T extends Pick<InvestigationSummary, "id">>(
  progress: readonly StudyProgress[],
  investigations: readonly T[],
): { investigation: T; progress: StudyProgress }[] {
  const byId = new Map(investigations.map((investigation) => [investigation.id, investigation]));
  return progress
    .filter((record) => !record.completedAt && byId.has(record.id))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .map((record) => ({ investigation: byId.get(record.id)!, progress: record }));
}

export type SuggestionReason =
  /** Shares a concept with a recent discovery; `label` names it. */
  | { kind: "related"; ref: NodeRef; label: string }
  /** Not started, and about the right size for the chosen session. */
  | { kind: "fits"; minutes: number }
  /** Not started. */
  | { kind: "new" }
  /** Completed before; worth revisiting (perhaps at another difficulty or length). */
  | { kind: "revisit" };

export interface Suggestion<T extends InvestigationSummary = InvestigationSummary> {
  investigation: T;
  reason: SuggestionReason;
}

export interface SuggestionInput<T extends InvestigationSummary> {
  investigations: readonly T[];
  progress: readonly StudyProgress[];
  /** The learner's Discovery Cards (any order). Only the most recent few are used. */
  discoveries: readonly Pick<DiscoveryCard, "createdAt" | "concepts" | "connections">[];
  length: StudyLength;
  /** How many to return. Defaults to 3. */
  limit?: number;
  /** Also leave these out (e.g. the one already offered as the primary action). */
  exclude?: readonly string[];
}

/** How many recent Discovery Cards inform relatedness. */
export const RECENT_DISCOVERY_WINDOW = 5;
/** Each older card counts a little less. */
const RECENCY_DECAY = 0.75;

const TIER_NOT_STARTED = 100;
const RELATED_WEIGHT = 10;
const FIT_WEIGHT = 3;
const SAME_THEME_PENALTY = 6;

/** Concepts in recent discoveries, weighted by recency, with the label the card recorded. */
export function recentConcepts(
  discoveries: SuggestionInput<InvestigationSummary>["discoveries"],
  window = RECENT_DISCOVERY_WINDOW,
): Map<NodeRef, { weight: number; label: string }> {
  const recent = [...discoveries].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, window);
  const concepts = new Map<NodeRef, { weight: number; label: string }>();
  recent.forEach((card, index) => {
    const weight = RECENCY_DECAY ** index;
    const nodes = [...card.concepts, ...card.connections.flatMap((connection) => [connection.from, connection.to])];
    const seen = new Set<string>();
    for (const node of nodes) {
      if (!isRelatedRef(node.ref) || seen.has(node.ref)) continue;
      seen.add(node.ref);
      const current = concepts.get(node.ref);
      concepts.set(node.ref, { weight: (current?.weight ?? 0) + weight, label: current?.label ?? node.label });
    }
  });
  return concepts;
}

/**
 * How well an investigation suits a session length, from 0 to 1. For a quick session, shorter is
 * better: across the quick range (STUDY_LENGTH_MINUTES) fit falls from 1 to 0.4, so with nothing
 * else to go on, the shortest investigation is suggested first.
 */
export function lengthFit(investigation: InvestigationSummary, length: StudyLength): number {
  if (length === "quick") {
    const [shortest, longest] = STUDY_LENGTH_MINUTES.quick;
    const position = (investigation.estimatedMinutes.quick - shortest) / Math.max(1, longest - shortest);
    return 1 - 0.6 * Math.min(1, Math.max(0, position));
  }
  // A deep session is most rewarding where there are deeper steps or side questions to take.
  return deepStepCount(investigation) + investigation.branches > 0 ? 1 : 0.4;
}

/**
 * Investigations to suggest, best first. In-progress investigations are left
 * out (the dashboard offers to continue them instead).
 */
export function suggestInvestigations<T extends InvestigationSummary>(input: SuggestionInput<T>): Suggestion<T>[] {
  const limit = input.limit ?? 3;
  const progressById = new Map(input.progress.map((record) => [record.id, record]));
  const excluded = new Set(input.exclude ?? []);
  const concepts = recentConcepts(input.discoveries);

  const candidates = input.investigations
    .map((investigation, order) => {
      const record = progressById.get(investigation.id);
      if (excluded.has(investigation.id) || (record && !record.completedAt)) return null;
      const notStarted = !record;
      let related = 0;
      let strongest: { ref: NodeRef; label: string; weight: number } | undefined;
      for (const ref of new Set(investigation.related)) {
        const concept = concepts.get(ref);
        if (!concept) continue;
        related += concept.weight;
        if (!strongest || concept.weight > strongest.weight) strongest = { ref, ...concept };
      }
      const fit = lengthFit(investigation, input.length);
      const score = (notStarted ? TIER_NOT_STARTED : 0) + related * RELATED_WEIGHT + fit * FIT_WEIGHT;
      const reason: SuggestionReason = strongest
        ? { kind: "related", ref: strongest.ref, label: strongest.label }
        : !notStarted
          ? { kind: "revisit" }
          : fit === 1
            ? { kind: "fits", minutes: minutesFor(investigation, input.length) }
            : { kind: "new" };
      return { investigation, score, order, reason };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null);

  // Greedy pick with a penalty for repeating a theme, so the list stays varied.
  const picked: typeof candidates = [];
  const themeCounts = new Map<string, number>();
  const remaining = [...candidates];
  while (picked.length < limit && remaining.length > 0) {
    let best = 0;
    let bestScore = -Infinity;
    remaining.forEach((candidate, index) => {
      const adjusted = candidate.score - (themeCounts.get(themeKey(candidate.investigation.theme)) ?? 0) * SAME_THEME_PENALTY;
      if (adjusted > bestScore || (adjusted === bestScore && candidate.order < remaining[best].order)) {
        best = index;
        bestScore = adjusted;
      }
    });
    const [choice] = remaining.splice(best, 1);
    picked.push(choice);
    const key = themeKey(choice.investigation.theme);
    themeCounts.set(key, (themeCounts.get(key) ?? 0) + 1);
  }
  return picked.map(({ investigation, reason }) => ({ investigation, reason }));
}

const themeKey = (theme: string) => theme.trim().toLowerCase();

/** A short, honest line explaining a suggestion. */
export function describeReason(reason: SuggestionReason, length: StudyLength): string {
  switch (reason.kind) {
    case "related":
      return `Builds on ${reason.label}, from your recent discoveries`;
    case "fits":
      return length === "quick" ? "A good fit for a quick study" : "Plenty here for a deep study";
    case "new":
      return "Something new to explore";
    case "revisit":
      return "Studied before · worth revisiting";
  }
}
