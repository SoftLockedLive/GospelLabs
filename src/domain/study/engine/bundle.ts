/**
 * Everything the investigation player needs from content, gathered on the
 * server so the client never loads the whole registry: the investigation,
 * every source it cites anywhere, a readable label for every Discovery Map
 * node it can create, and its concepts with their Map refs and descriptions.
 * The result is plain JSON, safe to pass as props to a client component.
 */
import { activitySourceIds, nodeLabel, stepActivities, type StudyContentRegistry } from "../content-registry";
import type { Source, Step, StudyInvestigation } from "../content-schema";
import { nodeRef, primaryQuestionRef, type NodeRef } from "../vocabulary";

export interface BundledConcept {
  ref: NodeRef;
  label: string;
  description: string;
}

export interface InvestigationBundle {
  investigation: StudyInvestigation;
  /** Every source the investigation refers to, by id. */
  sources: Record<string, Source>;
  /** Labels for every node ref used by connections and concepts, plus the investigation's own question nodes. */
  labels: Record<string, string>;
  /** Concept and vocabulary ids used by steps → Map ref, label, and description. */
  concepts: Record<string, BundledConcept>;
}

const allSteps = (investigation: StudyInvestigation): Step[] => [
  ...investigation.steps,
  ...investigation.branches.flatMap((branch) => branch.steps),
];

/** The Map ref for a concept id: core and inline concepts keep their kind; attribute vocabulary is vocabulary. */
export function conceptRef(registry: Pick<StudyContentRegistry, "concepts" | "attributeVocabulary">, id: string): NodeRef {
  const concept = registry.concepts.get(id);
  if (concept) return nodeRef(concept.kind, id);
  return nodeRef(registry.attributeVocabulary.has(id) ? "vocabulary" : "concept", id);
}

export function bundleInvestigation(registry: StudyContentRegistry, investigation: StudyInvestigation): InvestigationBundle {
  const steps = allSteps(investigation);

  const sourceIds = new Set(investigation.sources.map((source) => source.id));
  for (const step of steps) {
    for (const id of step.sourceIds) sourceIds.add(id);
    for (const activity of stepActivities(step)) for (const id of activitySourceIds(activity)) sourceIds.add(id);
    for (const connection of step.connections) for (const id of connection.sourceIds) sourceIds.add(id);
  }
  const sources: Record<string, Source> = {};
  for (const id of sourceIds) {
    const source = registry.sources.get(id) ?? investigation.sources.find((s) => s.id === id);
    if (source) sources[id] = source;
  }

  const concepts: Record<string, BundledConcept> = {};
  for (const id of new Set(steps.flatMap((step) => step.concepts))) {
    const ref = conceptRef(registry, id);
    const concept = registry.concepts.get(id) ?? investigation.concepts.find((c) => c.id === id);
    const vocabulary = registry.attributeVocabulary.get(id);
    concepts[id] = {
      ref,
      label: concept?.label ?? vocabulary?.term ?? nodeLabel(registry, ref),
      description: concept?.description ?? vocabulary?.meaning ?? "",
    };
  }

  const refs = new Set<NodeRef>([nodeRef("question", investigation.id), primaryQuestionRef(investigation.primaryQuestion.id)]);
  for (const step of steps) for (const connection of step.connections) refs.add(connection.from).add(connection.to);
  const labels: Record<string, string> = {};
  for (const ref of refs) labels[ref] = nodeLabel(registry, ref);
  for (const concept of Object.values(concepts)) labels[concept.ref] = concept.label;

  // Review notes are for the project owner, not learners; they stay out of the page.
  const forLearners: StudyInvestigation = { ...investigation, review: { status: investigation.review.status, notes: [] } };
  return { investigation: forLearners, sources, labels, concepts };
}

/** A LabelFor function over a bundle's labels, falling back to the id part of the ref. */
export const labelsLookup = (labels: Readonly<Record<string, string>>) => (ref: NodeRef) => labels[ref] ?? ref.slice(ref.indexOf(":") + 1);
