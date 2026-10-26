/**
 * The Discovery Card saved from Scripture Explorer ("Save to Notebook &
 * Map"). There is one card per passage: saving again updates it in place
 * (same id, createdAt, and personal notes) instead of creating another.
 *
 *   - summary: the passage's setting, written by Gospel Labs (shown as suggested);
 *   - sources: the passage, its related scriptures, and the evidence behind its connections;
 *   - concepts: the passage's themes, `demonstrated` when the learner tagged a
 *     highlight with the theme or worked out (didn't reveal) an activity on
 *     the theme's verses;
 *   - connections: the passage's Map connections, "demonstrated" when the
 *     learner worked out an activity that examines all of a connection's
 *     evidence, or tagged a highlight with the theme a passage connection
 *     points to; otherwise "suggested";
 *   - highlights: each highlight's words copied from the verse, with its theme and note.
 */
import { activitySourceIds } from "../content-registry";
import type { ConnectionDef, ExplorerPassage, Source } from "../content-schema";
import { activityVerses, demonstratedActivityIds, validHighlights, wordRangeText } from "../explorer";
import type { CardHighlight, DiscoveryCard, Exploration } from "../user-data";
import { nodeRef, type NodeRef } from "../vocabulary";
import { cardConnection, dedupeConnections, labeledNode, snapshotSource, type LabelFor } from "./common";

export interface PassageCardInput {
  passage: ExplorerPassage;
  /** Sources by id; must include every source the passage declares. */
  sources: Readonly<Record<string, Source>>;
  exploration: Exploration | undefined;
  labelFor: LabelFor;
  /** The Map ref of a theme id (concept, vocabulary, or attribute). */
  themeRef: (conceptId: string) => NodeRef;
  /** Id for a new card. Ignored when `existing` is given. */
  id: string;
  now: string;
  /** The card saved earlier from this passage, to update in place. */
  existing?: DiscoveryCard;
}

/** The card already saved from this passage, if any (the most recently updated one). */
export function findPassageCard<T extends Pick<DiscoveryCard, "origin" | "updatedAt">>(cards: readonly T[], passageId: string): T | undefined {
  return cards
    .filter((card) => card.origin.kind === "passage" && card.origin.contentId === passageId)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
}

/** Activities of this passage the learner worked out themselves. */
function workedOut(passage: ExplorerPassage, exploration: Exploration | undefined) {
  const ids = new Set(demonstratedActivityIds(exploration));
  return passage.activities.filter((activity) => ids.has(activity.id));
}

/** Theme ids the learner demonstrated: tagged on a highlight, or covered by a worked-out activity. */
export function demonstratedThemes(passage: ExplorerPassage, source: Source | undefined, exploration: Exploration | undefined): Set<string> {
  const demonstrated = new Set<string>();
  for (const highlight of exploration?.highlights ?? []) if (highlight.conceptId) demonstrated.add(highlight.conceptId);
  const verseNumbers = source?.verses?.map((verse) => verse.number) ?? [];
  const covered = new Set(workedOut(passage, exploration).flatMap((activity) => activityVerses(activity, passage, verseNumbers)));
  for (const theme of passage.themes) {
    const verses = theme.verses.length ? theme.verses : verseNumbers;
    if (verses.some((verse) => covered.has(verse))) demonstrated.add(theme.conceptId);
  }
  return demonstrated;
}

/** Whether the learner demonstrated a connection (see the module comment). */
export function connectionDemonstrated(
  connection: ConnectionDef,
  passage: ExplorerPassage,
  exploration: Exploration | undefined,
  themeRef: (conceptId: string) => NodeRef,
): boolean {
  const examinedAll = workedOut(passage, exploration).some((activity) => {
    const ids = new Set(activitySourceIds(activity));
    return connection.sourceIds.every((id) => ids.has(id));
  });
  if (examinedAll) return true;
  if (connection.from !== nodeRef("scripture", passage.sourceId)) return false;
  return (exploration?.highlights ?? []).some((highlight) => highlight.conceptId && themeRef(highlight.conceptId) === connection.to);
}

export function buildPassageCard(input: PassageCardInput): DiscoveryCard {
  const { passage, sources, exploration, labelFor, themeRef, now, existing } = input;
  const source = sources[passage.sourceId];

  const sourceIds = new Set<string>([
    passage.sourceId,
    ...passage.related.map((related) => related.sourceId),
    ...passage.connections.flatMap((connection) => connection.sourceIds),
  ]);

  const demonstrated = demonstratedThemes(passage, source, exploration);
  const concepts = passage.themes.map((theme) => ({
    ...labeledNode(themeRef(theme.conceptId), labelFor),
    demonstrated: demonstrated.has(theme.conceptId),
  }));

  const connections = dedupeConnections(
    passage.connections.map((connection) =>
      cardConnection(connection, labelFor, connectionDemonstrated(connection, passage, exploration, themeRef) ? "demonstrated" : "suggested"),
    ),
  );

  const highlights: CardHighlight[] = [];
  for (const highlight of validHighlights(exploration?.highlights ?? [], source?.verses ?? [])) {
    const verse = source?.verses?.find((v) => v.number === highlight.verse);
    if (!verse) continue;
    highlights.push({
      sourceId: passage.sourceId,
      verse: highlight.verse,
      text: wordRangeText(verse.text, highlight.start, highlight.end),
      ...(highlight.conceptId ? { conceptId: highlight.conceptId } : {}),
      note: highlight.note,
    });
  }

  const built: DiscoveryCard = {
    id: existing?.id ?? input.id,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    origin: { kind: "passage", contentId: passage.id },
    title: passage.title,
    summary: passage.context.setting,
    sources: [...sourceIds].map((id) => sources[id]).filter((s): s is Source => !!s).map(snapshotSource),
    concepts,
    connections,
    highlights,
    notes: existing?.notes ?? "",
  };
  // Fields written by a newer version of the app are kept.
  return existing ? { ...existing, ...built } : built;
}
