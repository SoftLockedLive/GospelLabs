/**
 * Discovery Card for a Character of Christ attribute. One card per attribute:
 * it is created when the learner finishes an activity (or chooses "Save to my
 * Notebook") and updated in place afterward, never duplicated.
 *
 * What the card records:
 *   - summary: the attribute's definition (content, shown as "Suggested by Gospel Labs");
 *   - concepts: the attribute itself, plus each vocabulary word the learner
 *     opened or matched. A word is "demonstrated" only when the learner matched
 *     it correctly themselves in a Vocabulary Matching activity (the pair id is
 *     the vocabulary id);
 *   - connections: the attribute's relationships with other attributes (both
 *     those it declares and those declared toward it) and the Savior's
 *     examples ("scripture:<id> illustrates attribute:<id>"), each with its
 *     sources. A connection is "demonstrated" only when the learner worked out
 *     an activity whose evidence includes one of the connection's sources;
 *     otherwise it is "suggested" (explained by Gospel Labs);
 *   - sources: the definition's sources, the evidence of finished activities,
 *     and every source a connection cites.
 *
 * Updating never loses anything: the learner's notes and highlights are kept,
 * and anything already demonstrated stays demonstrated.
 */
import { activitySourceIds } from "../content-registry";
import type { ChristAttribute, Source } from "../content-schema";
import type { AttributeLink } from "../character";
import type { CardConnection, CardSource, DiscoveryCard, Exploration } from "../user-data";
import { nodeRef, type NodeRef } from "../vocabulary";
import { cardConnection, dedupeConnections, labeledNode, snapshotSource, type LabelFor } from "./common";

/** How a finished activity ended. Only `demonstrated` matters to the card. */
export interface AttributeActivityOutcome {
  /** True when the learner worked out the answer themselves (not revealed or skipped). */
  demonstrated: boolean;
}

export interface AttributeCardInput {
  attribute: ChristAttribute;
  /** Relationships touching this attribute (attributeLinksFor), including those other attributes declare toward it. */
  links: readonly AttributeLink[];
  /** Every source the attribute and its links cite, keyed by id. */
  sources: Readonly<Record<string, Source>>;
  labelFor: LabelFor;
  /** What the learner has explored so far (opened words, finished activities). */
  exploration?: Pick<Exploration, "vocabulary" | "completedActivities">;
  /** How activities finished in this visit ended, by activity id. */
  outcomes?: Readonly<Record<string, AttributeActivityOutcome>>;
  /** The learner's existing card for this attribute, if any (findAttributeCard). */
  existing?: DiscoveryCard;
  /** A new random id (createId()), used only when there's no existing card. */
  id: string;
  now: Date;
}

export function attributeDiscoveryCard(input: AttributeCardInput): DiscoveryCard {
  const { attribute, links, sources, labelFor, exploration, outcomes = {}, existing, id, now } = input;
  const at = now.toISOString();
  const attributeRef = nodeRef("attribute", attribute.id);

  const finished = new Set([...(exploration?.completedActivities ?? []), ...Object.keys(outcomes)]);
  const finishedActivities = attribute.activities.filter((activity) => finished.has(activity.id));
  const demonstratedActivities = attribute.activities.filter((activity) => outcomes[activity.id]?.demonstrated);
  const demonstratedEvidence = new Set(demonstratedActivities.flatMap(activitySourceIds));

  const previouslyDemonstrated = new Set([
    ...(existing?.concepts ?? []).filter((concept) => concept.demonstrated).map((concept) => concept.ref),
    ...(existing?.connections ?? []).filter((connection) => connection.provenance === "demonstrated").map((connection) => connection.id),
  ]);

  // --- Concepts -----------------------------------------------------------------

  const vocabularyIds = new Set(attribute.vocabulary.map((word) => word.id));
  const matched = new Set<string>();
  const matchedCorrectly = new Set<string>();
  for (const activity of finishedActivities) {
    if (activity.type !== "vocab-match") continue;
    for (const pair of activity.pairs) {
      if (!vocabularyIds.has(pair.id)) continue;
      matched.add(pair.id);
      if (outcomes[activity.id]?.demonstrated) matchedCorrectly.add(pair.id);
    }
  }
  const previousWords = new Set((existing?.concepts ?? []).map((concept) => concept.ref));
  const opened = new Set(exploration?.vocabulary ?? []);
  const words = attribute.vocabulary.filter(
    (word) => opened.has(word.id) || matched.has(word.id) || previousWords.has(nodeRef("vocabulary", word.id)),
  );

  const attributeDemonstrated = demonstratedActivities.length > 0 || previouslyDemonstrated.has(attributeRef);
  const concepts = [
    { ...labeledNode(attributeRef, labelFor), demonstrated: attributeDemonstrated },
    ...words.map((word) => {
      const ref = nodeRef("vocabulary", word.id);
      return { ...labeledNode(ref, labelFor), demonstrated: matchedCorrectly.has(word.id) || previouslyDemonstrated.has(ref) };
    }),
  ];

  // --- Connections -----------------------------------------------------------

  const provenanceFor = (connectionSources: readonly string[]): CardConnection["provenance"] =>
    connectionSources.some((sourceId) => demonstratedEvidence.has(sourceId)) ? "demonstrated" : "suggested";
  const keepDemonstrated = (connection: CardConnection): CardConnection =>
    previouslyDemonstrated.has(connection.id) ? { ...connection, provenance: "demonstrated" } : connection;

  const relationshipConnections = links.map((link) =>
    cardConnection(
      { from: nodeRef("attribute", link.from), to: nodeRef("attribute", link.to), relation: link.relation, sourceIds: link.sourceIds, note: link.note },
      labelFor,
      provenanceFor(link.sourceIds),
    ),
  );
  const exampleConnections = attribute.saviorExamples.map((example) =>
    cardConnection(
      { from: nodeRef("scripture", example.sourceId), to: attributeRef, relation: "illustrates", sourceIds: [example.sourceId], note: example.note },
      labelFor,
      provenanceFor([example.sourceId]),
    ),
  );
  const connections = dedupeConnections([...relationshipConnections, ...exampleConnections].map(keepDemonstrated));

  // --- Sources -----------------------------------------------------------------

  const sourceIds = [
    ...attribute.definition.sourceIds,
    ...finishedActivities.flatMap(activitySourceIds),
    ...connections.flatMap((connection) => connection.sourceIds),
    ...(existing?.sources ?? []).map((source) => source.id),
  ];
  const cardSources: CardSource[] = [];
  const seen = new Set<string>();
  for (const sourceId of sourceIds) {
    if (seen.has(sourceId)) continue;
    seen.add(sourceId);
    const source = sources[sourceId];
    if (source) cardSources.push(snapshotSource(source));
    else {
      const kept = existing?.sources.find((snapshot) => snapshot.id === sourceId);
      if (kept) cardSources.push(kept);
    }
  }

  return {
    // Unknown fields written by a newer version are kept.
    ...existing,
    id: existing?.id ?? id,
    createdAt: existing?.createdAt ?? at,
    updatedAt: at,
    origin: { ...existing?.origin, kind: "attribute", contentId: attribute.id },
    title: attribute.name,
    summary: attribute.definition.text,
    sources: cardSources,
    concepts,
    connections,
    highlights: existing?.highlights ?? [],
    notes: existing?.notes ?? "",
  };
}

/** The learner's card for an attribute, if any (the most recently updated, should there somehow be several). */
export function findAttributeCard<T extends Pick<DiscoveryCard, "origin" | "updatedAt">>(cards: readonly T[], attributeId: string): T | undefined {
  return cards
    .filter((card) => card.origin.kind === "attribute" && card.origin.contentId === attributeId)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
}

/** Every Map node an attribute's card can name, so pages can compute labels on the server. */
export function attributeCardNodeRefs(attribute: Pick<ChristAttribute, "id" | "vocabulary" | "saviorExamples">, links: readonly AttributeLink[]): NodeRef[] {
  const refs = new Set<NodeRef>([nodeRef("attribute", attribute.id)]);
  for (const word of attribute.vocabulary) refs.add(nodeRef("vocabulary", word.id));
  for (const example of attribute.saviorExamples) refs.add(nodeRef("scripture", example.sourceId));
  for (const link of links) {
    refs.add(nodeRef("attribute", link.from));
    refs.add(nodeRef("attribute", link.to));
  }
  return [...refs];
}
