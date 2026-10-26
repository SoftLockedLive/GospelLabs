/**
 * Scripture Explorer: pure helpers for a passage and the learner's work on it.
 *
 *   - Verse text is split into words exactly as `passageHighlightSchema`
 *     describes (on whitespace), so a highlight is a verse plus a word range
 *     [start, end) and its text can always be copied back from the verse.
 *   - Word selection, and saving, merging, editing, and removing highlights.
 *   - Locating a key phrase's words in its verse.
 *   - The Exploration record: highlights, activity states, and completed activities.
 *   - Bundling what the explorer page needs from content (server side), so
 *     client components never load the whole registry.
 *
 * Nothing here touches React or storage.
 */
import { z } from "zod";
import { activitySourceIds, nodeLabel, type StudyContentRegistry } from "./content-registry";
import type { Activity, ExplorerPassage, Source } from "./content-schema";
import { explorationId, type Exploration, type PassageHighlight } from "./user-data";
import { nodeRef, type NodeRef } from "./vocabulary";

// --- Words ---------------------------------------------------------------------

export interface VerseWord {
  /** Position in the verse, counting every whitespace-separated token. */
  index: number;
  text: string;
  /** False for tokens with no letters or digits (such as "¶"), which aren't offered for selection. */
  selectable: boolean;
}

const HAS_LETTER = /[\p{L}\p{N}]/u;

/** The verse's words, split on whitespace (the indexing every passage highlight uses). */
export function verseWords(text: string): VerseWord[] {
  return (text.match(/\S+/g) ?? []).map((word, index) => ({ index, text: word, selectable: HAS_LETTER.test(word) }));
}

export const wordCount = (text: string) => (text.match(/\S+/g) ?? []).length;

/** The exact words [start, end) of a verse, joined with single spaces. */
export function wordRangeText(text: string, start: number, end: number): string {
  return (text.match(/\S+/g) ?? []).slice(start, end).join(" ");
}

// --- Selection -------------------------------------------------------------------

/** A contiguous run of words in one verse: [start, end). */
export interface WordRange {
  verse: number;
  start: number;
  end: number;
}

export const rangeLength = (range: WordRange) => range.end - range.start;

export const rangeIncludes = (range: WordRange | null | undefined, verse: number, index: number) =>
  !!range && range.verse === verse && index >= range.start && index < range.end;

/**
 * Tapping a word: starts a selection, extends it to include the word, or
 * trims it. Tapping the only selected word clears the selection; tapping the
 * first or last word of a longer selection removes that word; tapping inside
 * it starts over at that word. A word in another verse starts a new selection
 * (highlights stay within one verse).
 */
export function tapWord(selection: WordRange | null, verse: number, index: number): WordRange | null {
  if (!selection || selection.verse !== verse) return { verse, start: index, end: index + 1 };
  if (index < selection.start) return { ...selection, start: index };
  if (index >= selection.end) return { ...selection, end: index + 1 };
  if (rangeLength(selection) === 1) return null;
  if (index === selection.start) return { ...selection, start: index + 1 };
  if (index === selection.end - 1) return { ...selection, end: index };
  return { verse, start: index, end: index + 1 };
}

/** The selection from an anchor word to a focus word in the same verse (keyboard Shift+arrows). */
export function rangeBetween(verse: number, anchor: number, focus: number): WordRange {
  return { verse, start: Math.min(anchor, focus), end: Math.max(anchor, focus) + 1 };
}

// --- Highlights --------------------------------------------------------------------

export const overlaps = (a: Pick<WordRange, "verse" | "start" | "end">, b: Pick<WordRange, "verse" | "start" | "end">) =>
  a.verse === b.verse && a.start < b.end && b.start < a.end;

const byPosition = (a: PassageHighlight, b: PassageHighlight) => a.verse - b.verse || a.start - b.start || a.end - b.end;

export const sortHighlights = (highlights: readonly PassageHighlight[]) => [...highlights].sort(byPosition);

/**
 * Highlights that still fit the passage: the verse exists and the range lies
 * within its words. (Content can change after a highlight was saved.)
 */
export function validHighlights(highlights: readonly PassageHighlight[], verses: readonly { number: number; text: string }[]): PassageHighlight[] {
  const counts = new Map(verses.map((verse) => [verse.number, wordCount(verse.text)]));
  return sortHighlights(highlights.filter((h) => h.start >= 0 && h.end > h.start && h.end <= (counts.get(h.verse) ?? 0)));
}

const joinNotes = (notes: readonly string[]) => [...new Set(notes.map((note) => note.trim()).filter(Boolean))].join("\n\n");

/**
 * Adds a highlight. Any saved highlights it overlaps are merged into one that
 * covers them all: it keeps the earliest id and creation time, the new theme
 * (or an existing one if the new highlight has none), and every distinct note.
 */
export function addHighlight(highlights: readonly PassageHighlight[], incoming: PassageHighlight): PassageHighlight[] {
  const overlapping = sortHighlights(highlights.filter((h) => overlaps(h, incoming)));
  if (!overlapping.length) return sortHighlights([...highlights, incoming]);
  const first = overlapping[0];
  const earliest = [...overlapping, incoming].reduce((a, b) => (Date.parse(b.createdAt) < Date.parse(a.createdAt) ? b : a));
  const conceptId = incoming.conceptId ?? overlapping.find((h) => h.conceptId)?.conceptId;
  const merged: PassageHighlight = {
    id: first.id,
    verse: incoming.verse,
    start: Math.min(incoming.start, ...overlapping.map((h) => h.start)),
    end: Math.max(incoming.end, ...overlapping.map((h) => h.end)),
    ...(conceptId ? { conceptId } : {}),
    note: joinNotes([...overlapping.map((h) => h.note), incoming.note]),
    createdAt: earliest.createdAt,
  };
  return sortHighlights([...highlights.filter((h) => !overlapping.includes(h)), merged]);
}

/** Changes a highlight's theme and/or note. A `conceptId` of null removes the theme. */
export function updateHighlight(
  highlights: readonly PassageHighlight[],
  id: string,
  patch: { conceptId?: string | null; note?: string },
): PassageHighlight[] {
  return highlights.map((h) => {
    if (h.id !== id) return h;
    const { conceptId: _old, ...rest } = h;
    void _old;
    const conceptId = patch.conceptId === undefined ? h.conceptId : (patch.conceptId ?? undefined);
    return { ...rest, ...(conceptId ? { conceptId } : {}), note: patch.note ?? h.note };
  });
}

export const removeHighlight = (highlights: readonly PassageHighlight[], id: string) => highlights.filter((h) => h.id !== id);

/** The saved highlight covering a word, if any. */
export const highlightAt = (highlights: readonly PassageHighlight[], verse: number, index: number) =>
  highlights.find((h) => rangeIncludes(h, verse, index));

// --- Key phrases --------------------------------------------------------------------

/** Lowercase with straight quotes. Every replacement is one character for one, so offsets are preserved. */
const fold = (text: string) => text.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"');

/**
 * The words of a verse that contain a phrase (case- and quote-insensitive),
 * or null if the phrase isn't there. A phrase that starts or ends inside a
 * word (e.g. after an em dash) includes that whole word.
 */
export function findPhrase(verseText: string, phrase: string): { start: number; end: number } | null {
  const words = verseText.match(/\S+/g) ?? [];
  const joined = fold(words.join(" "));
  const needle = fold(phrase.trim().replace(/\s+/g, " "));
  if (!needle) return null;
  const at = joined.indexOf(needle);
  if (at < 0) return null;
  let offset = 0;
  let start = -1;
  let end = -1;
  for (let i = 0; i < words.length; i++) {
    const wordEnd = offset + words[i].length;
    if (start < 0 && at < wordEnd) start = i;
    if (at + needle.length <= wordEnd) {
      end = i + 1;
      break;
    }
    offset = wordEnd + 1;
  }
  return start >= 0 && end > start ? { start, end } : null;
}

// --- Exploration ----------------------------------------------------------------------

/** An activity's saved state, as the activity renderer reports it. */
export const storedActivityStateSchema = z
  .object({
    attempts: z.number().int().nonnegative().default(0),
    hintsShown: z.number().int().nonnegative().default(0),
    revealed: z.boolean().default(false),
    completed: z.boolean().default(false),
    response: z.unknown().optional(),
    reflection: z.string().optional(),
  })
  .loose();
export type StoredActivityState = z.infer<typeof storedActivityStateSchema>;

/** The stored `activityStates` object exactly as it is, entries this version can't read included. */
function storedActivityStates(exploration: Exploration | undefined): Record<string, unknown> {
  const raw = (exploration as { activityStates?: unknown } | undefined)?.activityStates;
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

/**
 * Activity states live in the Exploration's `activityStates` field. The
 * Exploration schema keeps unknown fields (it is a loose object), so the
 * field survives every read and write; it is parsed defensively here.
 * Entries that don't parse are skipped, never removed (see withActivityState).
 */
export function activityStates(exploration: Exploration | undefined): Record<string, StoredActivityState> {
  const states: Record<string, StoredActivityState> = {};
  for (const [id, value] of Object.entries(storedActivityStates(exploration))) {
    const parsed = storedActivityStateSchema.safeParse(value);
    if (parsed.success) states[id] = parsed.data;
  }
  return states;
}

export const passageExplorationId = (passageId: string) => explorationId("passage", passageId);

export function newPassageExploration(passageId: string, now: string): Exploration {
  return {
    id: passageExplorationId(passageId),
    kind: "passage",
    contentId: passageId,
    firstAt: now,
    updatedAt: now,
    completedActivities: [],
    vocabulary: [],
    highlights: [],
    note: "",
  };
}

export const withHighlights = (exploration: Exploration, highlights: readonly PassageHighlight[], now: string): Exploration => ({
  ...exploration,
  highlights: sortHighlights(highlights),
  updatedAt: now,
});

/**
 * Saves an activity's state; a completed activity is also listed in completedActivities. Only that
 * activity's entry is replaced: every other entry is kept exactly as stored, including ones this version
 * can't read (a damaged entry, or one from a newer version), so saving one activity never erases another.
 */
export function withActivityState(exploration: Exploration, activityId: string, state: StoredActivityState, now: string): Exploration {
  const completed = state.completed
    ? [...new Set([...exploration.completedActivities, activityId])]
    : exploration.completedActivities;
  return {
    ...exploration,
    activityStates: { ...storedActivityStates(exploration), [activityId]: state },
    completedActivities: completed,
    updatedAt: now,
  };
}

/** Completed activities the learner worked out themselves (not revealed). */
export function demonstratedActivityIds(exploration: Exploration | undefined): string[] {
  if (!exploration) return [];
  const states = activityStates(exploration);
  return exploration.completedActivities.filter((id) => !states[id]?.revealed);
}

export interface ExplorationSummary {
  /** Opened and saved at least once. */
  explored: boolean;
  highlights: number;
  activitiesCompleted: number;
}

/** What the learner has done with a passage. Pass the passage's activity ids to count only current activities. */
export function summarizeExploration(exploration: Exploration | undefined, activityIds?: readonly string[]): ExplorationSummary {
  if (!exploration) return { explored: false, highlights: 0, activitiesCompleted: 0 };
  const current = activityIds ? new Set(activityIds) : null;
  return {
    explored: true,
    highlights: exploration.highlights.length,
    activitiesCompleted: exploration.completedActivities.filter((id) => !current || current.has(id)).length,
  };
}

// --- Themes and activities ---------------------------------------------------------------

/**
 * The verses an activity works with in this passage: for a highlight
 * activity on the passage, the verses of its answers; for any other activity
 * that cites the passage, every verse; otherwise none.
 */
export function activityVerses(activity: Activity, passage: ExplorerPassage, verseNumbers: readonly number[]): number[] {
  if (activity.type === "highlight") {
    if (activity.passage !== passage.sourceId) return [];
    return [...new Set(activity.targets.map((index) => activity.chunks[index]?.verse).filter((v): v is number => v !== undefined))];
  }
  return activitySourceIds(activity).includes(passage.sourceId) ? [...verseNumbers] : [];
}

// --- Bundle (server side) ---------------------------------------------------------------------

export interface ExplorerTheme {
  conceptId: string;
  ref: NodeRef;
  label: string;
  description: string;
}

export interface PassageBundle {
  passage: ExplorerPassage;
  /** Every source the passage refers to, by id. */
  sources: Record<string, Source>;
  /** Readable labels for every Map node the passage's connections and themes use. */
  labels: Record<string, string>;
  /** The passage's themes with their Map refs, labels, and descriptions. */
  themes: Record<string, ExplorerTheme>;
}

type ThemeRegistry = Pick<StudyContentRegistry, "concepts" | "attributes">;

/** The Map ref for a theme id: a core concept or vocabulary term keeps its kind; otherwise an attribute or concept. */
export function themeRef(registry: ThemeRegistry, id: string): NodeRef {
  const concept = registry.concepts.get(id);
  if (concept) return nodeRef(concept.kind, id);
  return nodeRef(registry.attributes.some((attribute) => attribute.id === id) ? "attribute" : "concept", id);
}

export function bundlePassage(registry: StudyContentRegistry, passage: ExplorerPassage): PassageBundle {
  const sources: Record<string, Source> = {};
  for (const source of passage.sources) sources[source.id] = registry.sources.get(source.id) ?? source;

  const themes: Record<string, ExplorerTheme> = {};
  for (const { conceptId } of passage.themes) {
    const ref = themeRef(registry, conceptId);
    const concept = registry.concepts.get(conceptId);
    const attribute = registry.attributes.find((a) => a.id === conceptId);
    themes[conceptId] = {
      conceptId,
      ref,
      label: concept?.label ?? attribute?.name ?? nodeLabel(registry, ref),
      description: concept?.description ?? attribute?.summary ?? "",
    };
  }

  const labels: Record<string, string> = {};
  for (const connection of passage.connections) {
    labels[connection.from] = nodeLabel(registry, connection.from);
    labels[connection.to] = nodeLabel(registry, connection.to);
  }
  for (const theme of Object.values(themes)) labels[theme.ref] = theme.label;
  labels[nodeRef("scripture", passage.sourceId)] = sources[passage.sourceId]?.label ?? passage.sourceId;

  // Review notes are for the project owner, not learners; they stay out of the page.
  const forLearners: ExplorerPassage = { ...passage, review: { status: passage.review.status, notes: [] } };
  return { passage: forLearners, sources, labels, themes };
}

/** The chapter a scripture label belongs to: "Alma 7:11–13" → "Alma 7". */
export const chapterLabel = (label: string) => label.replace(/:[^:]*$/, "");

/** Verse numbers as readers write them: [12] → "Verse 12", [9, 11, 12, 13] → "Verses 9, 11–13". */
export function formatVerseList(verses: readonly number[]): string {
  const sorted = [...new Set(verses)].sort((a, b) => a - b);
  if (!sorted.length) return "";
  const runs: string[] = [];
  let start = sorted[0];
  let previous = sorted[0];
  for (const verse of [...sorted.slice(1), Number.NaN]) {
    if (verse === previous + 1) {
      previous = verse;
      continue;
    }
    runs.push(start === previous ? String(start) : `${start}–${previous}`);
    start = previous = verse;
  }
  return `${sorted.length === 1 ? "Verse" : "Verses"} ${runs.join(", ")}`;
}
