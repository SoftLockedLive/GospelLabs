/**
 * The Discovery Card created when a guided investigation is completed. It
 * records what the learner actually studied, with provenance:
 *
 *   - sources: everything cited by the steps they finished (step evidence,
 *     activity evidence, and connection evidence), snapshotted;
 *   - concepts: the concepts of finished steps, `demonstrated` when at least
 *     one such step was worked out (not revealed);
 *   - connections: each finished step's Map connections, "demonstrated" if
 *     worked out and "suggested" if the answer was revealed.
 *
 * Skipped steps ("Continue anyway") contribute nothing: the learner didn't
 * study them. Branch steps the learner finished count like main-path steps.
 *
 * What the learner wrote in reflections goes into the card's notes (each
 * under its step's title), so their own words are kept with the card, as in
 * Connect with Christ (see withLearnerWriting: nothing they wrote in the
 * notes is lost, and nothing is repeated).
 *
 * Re-completing an investigation updates its existing card (same id,
 * createdAt, notes, highlights) instead of creating another, and discoveries
 * accumulate: what this completion found comes first (fresh snapshots), and
 * what only earlier completions found stays (a side question explored the
 * first time, say). Anything demonstrated before stays demonstrated, even if
 * its answer was shown this time.
 */
import { activitySourceIds, resolveActivity } from "../content-registry";
import type { Source, Step, StudyInvestigation } from "../content-schema";
import { stepKey, type CardConnection, type DiscoveryCard, type StepState, type StudyProgress } from "../user-data";
import { nodeRef, type NodeRef } from "../vocabulary";
import { cardConnection, dedupeConnections, labeledNode, snapshotSource, withLearnerWriting, type LabelFor, type LearnerWriting } from "./common";

export interface InvestigationCardInput {
  investigation: StudyInvestigation;
  progress: StudyProgress;
  /** Sources by id; must include every source the investigation cites. */
  sources: Readonly<Record<string, Source>>;
  labelFor: LabelFor;
  /**
   * The Map ref of a concept id (concept or vocabulary). Defaults to the
   * investigation's inline concepts, else "concept:<id>". The player passes
   * refs computed from the content registry (engine/bundle.ts).
   */
  conceptRef?: (conceptId: string) => NodeRef;
  /** Id for a new card. Ignored when `existing` is given. */
  id: string;
  now: string;
  /** The card from an earlier completion, to update in place. */
  existing?: DiscoveryCard;
}

interface FinishedStep {
  step: Step;
  state: StepState;
  demonstrated: boolean;
}

/** Steps completed (worked out or revealed), main path first, then branches, in content order. */
function finishedSteps(investigation: StudyInvestigation, progress: StudyProgress): FinishedStep[] {
  const entries: { step: Step; key: string }[] = [
    ...investigation.steps.map((step) => ({ step, key: stepKey(step.id) })),
    ...investigation.branches.flatMap((branch) => branch.steps.map((step) => ({ step, key: stepKey(step.id, branch.id) }))),
  ];
  const finished: FinishedStep[] = [];
  for (const { step, key } of entries) {
    const state = progress.steps[key];
    if (state?.status !== "complete" || state.skipped) continue;
    finished.push({ step, state, demonstrated: !state.revealed });
  }
  return finished;
}

/** Each reflection the learner wrote, in content order, under the title of its step. */
function reflections(investigation: StudyInvestigation, progress: StudyProgress): LearnerWriting[] {
  const steps = [
    ...investigation.steps.map((step) => ({ step, key: stepKey(step.id) })),
    ...investigation.branches.flatMap((branch) => branch.steps.map((step) => ({ step, key: stepKey(step.id, branch.id) }))),
  ];
  return steps.flatMap(({ step, key }) => {
    const text = progress.steps[key]?.reflection?.trim();
    return text ? [{ heading: step.title, text }] : [];
  });
}

export function buildInvestigationCard(input: InvestigationCardInput): DiscoveryCard {
  const { investigation, progress, sources, labelFor, now, existing } = input;
  const inline = new Map(investigation.concepts.map((concept) => [concept.id, concept.kind]));
  const refFor = input.conceptRef ?? ((id: string) => nodeRef(inline.get(id) ?? "concept", id));
  const finished = finishedSteps(investigation, progress);

  const sourceIds = new Set<string>();
  const concepts = new Map<NodeRef, boolean>();
  const connections: CardConnection[] = [];
  for (const { step, state, demonstrated } of finished) {
    const { activity } = resolveActivity(step, state.difficulty);
    for (const id of [...step.sourceIds, ...activitySourceIds(activity), ...step.connections.flatMap((c) => c.sourceIds)]) sourceIds.add(id);
    for (const id of step.concepts) {
      const ref = refFor(id);
      concepts.set(ref, (concepts.get(ref) ?? false) || demonstrated);
    }
    for (const def of step.connections) connections.push(cardConnection(def, labelFor, demonstrated ? "demonstrated" : "suggested"));
  }

  // Discoveries accumulate: what only earlier completions found is kept, after this completion's.
  const earlier = { sources: existing?.sources ?? [], concepts: existing?.concepts ?? [], connections: existing?.connections ?? [] };
  const studiedSources = [...sourceIds].map((id) => sources[id]).filter((source): source is Source => !!source).map(snapshotSource);
  const studiedIds = new Set(studiedSources.map((source) => source.id));
  const demonstratedBefore = new Set(earlier.concepts.filter((concept) => concept.demonstrated).map((concept) => concept.ref));

  const built: DiscoveryCard = {
    id: existing?.id ?? input.id,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    origin: {
      kind: "investigation",
      contentId: investigation.id,
      contentVersion: investigation.contentVersion,
      difficulty: progress.difficulty,
      primaryQuestion: investigation.primaryQuestion.id,
    },
    title: investigation.title,
    question: investigation.question,
    summary: investigation.discovery.summary,
    sources: [...studiedSources, ...earlier.sources.filter((source) => !studiedIds.has(source.id))],
    concepts: [
      ...[...concepts].map(([ref, demonstrated]) => ({ ...labeledNode(ref, labelFor), demonstrated: demonstrated || demonstratedBefore.has(ref) })),
      ...earlier.concepts.filter((concept) => !concepts.has(concept.ref)),
    ],
    // This completion's copies first; a demonstrated copy (from either) wins over a suggested one.
    connections: dedupeConnections([...connections, ...earlier.connections]),
    highlights: existing?.highlights ?? [],
    notes: withLearnerWriting(existing?.notes ?? "", reflections(investigation, progress)),
  };
  // Fields written by a newer version of the app are kept.
  return existing ? { ...existing, ...built } : built;
}
