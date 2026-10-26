/**
 * Pure helpers for the Character of Christ Builder: how attributes relate to
 * one another (for the overview's relationship view and each attribute's
 * "Related attributes"), and the small, honest record of what a learner has
 * explored (`Exploration`). Explorations count material studied—words
 * opened, activities finished—never righteousness, progress toward a goal,
 * or how Christlike anyone is.
 */
import type { ChristAttribute } from "./content-schema";
import { explorationId, type Exploration } from "./user-data";
import type { Relation } from "./vocabulary";

/** A relationship between two attributes, as declared in content (reading from `from` to `to`). */
export interface AttributeLink {
  from: string;
  to: string;
  relation: Relation;
  note: string;
  sourceIds: string[];
}

type LinkSource = Pick<ChristAttribute, "id" | "relationships">;

/** Every relationship declared by any attribute, in content order. */
export function allAttributeLinks(attributes: readonly LinkSource[]): AttributeLink[] {
  return attributes.flatMap((attribute) =>
    attribute.relationships.map((relationship) => ({
      from: attribute.id,
      to: relationship.attributeId,
      relation: relationship.relation,
      note: relationship.note,
      sourceIds: [...relationship.sourceIds],
    })),
  );
}

/**
 * Relationships that touch one attribute: those it declares, then those other
 * attributes declare toward it. Content declares each pair once, so both
 * attribute pages can show it without repeating it in two files.
 */
export function attributeLinksFor(attributes: readonly LinkSource[], attributeId: string): AttributeLink[] {
  const links = allAttributeLinks(attributes);
  return [...links.filter((link) => link.from === attributeId), ...links.filter((link) => link.to === attributeId && link.from !== attributeId)];
}

/** The attribute on the other end of a link. */
export const otherEnd = (link: AttributeLink, attributeId: string) => (link.from === attributeId ? link.to : link.from);

/** One line between two attributes in the relationship view; several declared links between the same pair share it. */
export interface AttributeEdge {
  /** "a|b" with the ids sorted, so the pair is identified the same way from either end. */
  id: string;
  a: string;
  b: string;
  links: AttributeLink[];
}

export const pairKey = (x: string, y: string) => (x < y ? `${x}|${y}` : `${y}|${x}`);

/** The undirected edges between attributes. Links to attributes that aren't in the list are left out. */
export function attributeEdges(attributes: readonly LinkSource[]): AttributeEdge[] {
  const known = new Set(attributes.map((attribute) => attribute.id));
  const edges = new Map<string, AttributeEdge>();
  for (const link of allAttributeLinks(attributes)) {
    if (!known.has(link.from) || !known.has(link.to) || link.from === link.to) continue;
    const id = pairKey(link.from, link.to);
    const [a, b] = id.split("|");
    const edge = edges.get(id) ?? { id, a, b, links: [] };
    edge.links.push(link);
    edges.set(id, edge);
  }
  return [...edges.values()];
}

/** How many other attributes each attribute is connected with. */
export function connectionCounts(edges: readonly AttributeEdge[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const edge of edges) {
    counts[edge.a] = (counts[edge.a] ?? 0) + 1;
    counts[edge.b] = (counts[edge.b] ?? 0) + 1;
  }
  return counts;
}

/** Points evenly spaced on a circle, starting at the top and going clockwise. */
export function circleLayout(ids: readonly string[], center: { x: number; y: number }, radius: number): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  ids.forEach((id, index) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / Math.max(ids.length, 1);
    positions[id] = {
      x: Math.round((center.x + radius * Math.cos(angle)) * 10) / 10,
      y: Math.round((center.y + radius * Math.sin(angle)) * 10) / 10,
    };
  });
  return positions;
}

// --- Explorations --------------------------------------------------------------

export const attributeExplorationId = (attributeId: string) => explorationId("attribute", attributeId);

/** A first-visit record: nothing explored yet. */
export function newAttributeExploration(attributeId: string, now: Date): Exploration {
  const at = now.toISOString();
  return {
    id: attributeExplorationId(attributeId),
    kind: "attribute",
    contentId: attributeId,
    firstAt: at,
    updatedAt: at,
    completedActivities: [],
    vocabulary: [],
    highlights: [],
    note: "",
  };
}

const addOnce = (list: readonly string[], value: string) => (list.includes(value) ? [...list] : [...list, value]);

/** Records that a vocabulary word was opened. Opening it again changes nothing. */
export const withVocabulary = (exploration: Exploration, vocabularyId: string): Exploration => ({
  ...exploration,
  vocabulary: addOnce(exploration.vocabulary, vocabularyId),
});

/** Records that an activity was finished (worked out, revealed, or skipped—the record doesn't say which). */
export const withCompletedActivity = (exploration: Exploration, activityId: string): Exploration => ({
  ...exploration,
  completedActivities: addOnce(exploration.completedActivities, activityId),
});

export const withNote = (exploration: Exploration, note: string): Exploration => ({ ...exploration, note });

/**
 * A gentle description of what was explored, e.g. "Explored · 4 words · 1 activity".
 * Counts only what exists for this attribute; never a fraction, total, or goal.
 * Null when the attribute hasn't been opened.
 */
export function explorationSummary(exploration: Pick<Exploration, "vocabulary" | "completedActivities"> | undefined): string | null {
  if (!exploration) return null;
  const parts = ["Explored"];
  const words = exploration.vocabulary.length;
  const activities = exploration.completedActivities.length;
  if (words > 0) parts.push(`${words} ${words === 1 ? "word" : "words"}`);
  if (activities > 0) parts.push(`${activities} ${activities === 1 ? "activity" : "activities"}`);
  return parts.join(" · ");
}
