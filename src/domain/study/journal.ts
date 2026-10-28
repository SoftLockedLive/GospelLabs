/**
 * The Journal in the Notebook: the learner's free writing (journal entries),
 * and everything they have already written anywhere else in the app,
 * compiled into one feed, newest first, each item linked back to where it
 * was written.
 *
 * A JournalEntry is a fifth kind of study record (stored beside the others,
 * with the same conventions as src/domain/study/user-data.ts: a stable
 * random id, createdAt and updatedAt, a `dataVersion` stamp, and unknown
 * fields kept). Everything else in the feed is read-only here and edited at
 * its source.
 *
 * compileJournal is pure: titles of study content come from the caller
 * (JournalPlaces), so the domain never imports the content registry. Links
 * are built with the (pure) route helpers in src/lib/routes.ts.
 *
 * Each piece of writing appears once, at the place it was written. Some
 * writing is also copied into a Discovery Card when the card is saved (a
 * step's reflection under its step's title, the private note from a
 * Character of Christ or Connect with Christ page; see withLearnerWriting in
 * cards/common.ts and cards/connect.ts), and a Scripture Explorer card keeps
 * a copy of each highlight's note. So a card's notes are shown without those
 * copies (ownCardNotes), and a card's highlight note is left out when the
 * passage's own highlight on that verse already shows it.
 */
import { z } from "zod";
import type { Investigation, SectionId } from "../investigation";
import { COME_UNTO_CHRIST_PROMPTS } from "../reflection";
import { characterHref, connectHref, explorerHref, investigationHref, mapHref, notebookHref, studyInvestigationHref } from "@/lib/routes";
import { matchesTerms, normalizeText, ORIGIN_LABELS, searchTerms } from "./notebook";
import type { DiscoveryCard, DiscoveryOrigin, Exploration, PersonalConnection, StudyProgress } from "./user-data";

const idSchema = z.string().min(1);
const timestampSchema = z.iso.datetime();

// --- Journal entries -------------------------------------------------------------

export const JOURNAL_ENTRY_KINDS = ["thought", "tender-mercy", "question"] as const;
export type JournalEntryKind = (typeof JOURNAL_ENTRY_KINDS)[number];

export const JOURNAL_ENTRY_KIND_LABELS: Record<JournalEntryKind, string> = {
  thought: "A thought",
  "tender-mercy": "Tender mercy",
  question: "A question",
};

/** Places an entry can be linked to. A "card" link's contentId is the Discovery Card's id. */
export const JOURNAL_LINK_KINDS = ["investigation", "passage", "attribute", "connect", "card"] as const;
export type JournalLinkKind = (typeof JOURNAL_LINK_KINDS)[number];

export const JOURNAL_LINK_KIND_LABELS: Record<JournalLinkKind, string> = { ...ORIGIN_LABELS, card: "Discovery Card" };

/** Generous: a journal entry is never cut short, but a pasted book is refused. */
export const MAX_JOURNAL_TEXT = 20_000;

/**
 * Where a thought came up. `label` is how the place read when the entry was
 * written (see placeLabel), so the link still reads well if content changes
 * or is removed later. A step is an investigation link with its `stepId`
 * (and `branchId` for a step in a side question).
 */
export const journalLinkSchema = z
  .object({
    kind: z.enum(JOURNAL_LINK_KINDS),
    contentId: idSchema,
    label: z.string().trim().min(1),
    stepId: idSchema.optional(),
    branchId: idSchema.optional(),
  })
  // Unlike other nested objects, kept loose: a link is small, and a newer version may say more about the place.
  .loose();
export type JournalLink = z.infer<typeof journalLinkSchema>;

/** Free writing in the Journal. Never evaluated, summarized, or shared. */
export const journalEntrySchema = z
  .object({
    id: idSchema,
    dataVersion: z.number().int().positive().optional(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
    kind: z.enum(JOURNAL_ENTRY_KINDS).default("thought"),
    /** An entry always has words: clearing them is deleting the entry. */
    text: z.string().trim().min(1).max(MAX_JOURNAL_TEXT),
    link: journalLinkSchema.optional(),
  })
  .loose();
export type JournalEntry = z.infer<typeof journalEntrySchema>;

export interface JournalEntryInput {
  text: string;
  kind?: JournalEntryKind;
  link?: JournalLink;
}

/** A new entry, ready to save (the repository validates it). */
export function newJournalEntry({ id, now, text, kind = "thought", link }: JournalEntryInput & { id: string; now: Date }): JournalEntry {
  const at = now.toISOString();
  return { id, createdAt: at, updatedAt: at, kind, text: text.trim(), ...(link ? { link } : {}) };
}

/**
 * The entry with the learner's changes. `link: undefined` removes the link. Fields written by a newer
 * version of the app are kept.
 */
export function editJournalEntry(entry: JournalEntry, changes: Partial<JournalEntryInput>, now: Date): JournalEntry {
  const { link: _link, ...rest } = entry;
  void _link;
  const link = "link" in changes ? changes.link : entry.link;
  return {
    ...rest,
    kind: changes.kind ?? entry.kind,
    text: (changes.text ?? entry.text).trim(),
    updatedAt: now.toISOString(),
    ...(link ? { link } : {}),
  };
}

// --- Places ------------------------------------------------------------------------

/**
 * Titles of study content, looked up by the caller (from the content
 * registry, or from maps passed down to the page). A missing answer is fine:
 * the title saved on a Discovery Card from the same place is used, and
 * otherwise the part of the app alone ("Character of Christ").
 */
export interface JournalPlaces {
  /** An investigation's title, an attribute's name, a passage's or Connect with Christ session's title. */
  title?: (kind: DiscoveryOrigin, contentId: string) => string | undefined;
  /** How a step reads after its investigation's title, e.g. "Step 2" or the step's title. */
  step?: (investigationId: string, stepId: string, branchId?: string) => string | undefined;
}

/**
 * How a place reads in the Journal: its title, then which part of the app it
 * is in, or for a step, the step. "Charity · Character of Christ",
 * "One by One · Step 2", "He knows how to help · Discovery Card". Without a
 * title, the part of the app alone. Use it for a new entry's link label too.
 */
export function placeLabel(kind: JournalLinkKind, title: string | undefined, step?: string): string {
  const area = JOURNAL_LINK_KIND_LABELS[kind];
  const detail = kind === "investigation" && step ? step : area;
  if (title?.trim()) return `${title.trim()} · ${detail}`;
  return detail === area ? area : `${area} · ${detail}`;
}

/** The page a link points to. Steps open their investigation (there is no page for one step). */
export function journalLinkHref(link: Pick<JournalLink, "kind" | "contentId">): string {
  switch (link.kind) {
    case "investigation":
      return studyInvestigationHref(link.contentId);
    case "passage":
      return explorerHref(link.contentId);
    case "attribute":
      return characterHref(link.contentId);
    case "connect":
      return connectHref(link.contentId);
    case "card":
      return notebookHref(link.contentId);
  }
}

// --- The compiled Journal ----------------------------------------------------------------

/** Where an item's text was written. Only "entry" is written (and edited) in the Journal itself. */
export const JOURNAL_SOURCES = [
  "entry",
  "reflection",
  "card-note",
  "card-highlight",
  "attribute-note",
  "passage-note",
  "connect-note",
  "passage-highlight",
  "map-connection",
  "research-note",
] as const;
export type JournalSource = (typeof JOURNAL_SOURCES)[number];

export const JOURNAL_SOURCE_LABELS: Record<JournalSource, string> = {
  entry: "Journal entry",
  reflection: "Reflection",
  "card-note": "Discovery Card note",
  "card-highlight": "Highlight note",
  "attribute-note": "Character of Christ note",
  "passage-note": "Scripture Explorer note",
  "connect-note": "Connect with Christ note",
  "passage-highlight": "Highlight note",
  "map-connection": "Map connection",
  "research-note": "Research notebook",
};

export const JOURNAL_GROUPS = ["entries", "study"] as const;
export type JournalGroup = (typeof JOURNAL_GROUPS)[number];

export const JOURNAL_GROUP_LABELS: Record<JournalGroup, string> = { entries: "Entries", study: "From your study" };

interface JournalItemBase {
  /** The same writing has the same id every time the Journal is compiled, e.g. "card-note:<cardId>". */
  id: string;
  source: JournalSource;
  text: string;
  /**
   * A heading the text has where it was written: the title of a 1.x saved
   * insight, or the question a Come unto Christ answer or a discovery-trail
   * note responds to.
   */
  title?: string;
  /**
   * The best time stored for this text. Entries, Map connections, and 1.x saved insights (records made
   * for the writing) are dated when they were made; highlights when they were made (they store nothing
   * later); everything else by the last change to the record that holds it.
   */
  date: string;
  /** Where it was written, e.g. "One by One · Step 2", "Charity · Character of Christ". */
  where: string;
  /**
   * The place as a journal link, for writing a new entry about it. Absent for places an entry can't
   * link to (Map connections, 1.x research notebooks) and for entries without a link.
   */
  link?: JournalLink;
}

export interface JournalEntryItem extends JournalItemBase {
  source: "entry";
  entry: JournalEntry;
  /** Where the thought came up, if the entry is linked. */
  href?: string;
  editable: true;
}

export interface StudyWritingItem extends JournalItemBase {
  source: Exclude<JournalSource, "entry">;
  /** Where to edit it. */
  href: string;
  editable: false;
}

export type JournalItem = JournalEntryItem | StudyWritingItem;

export const journalGroup = (item: Pick<JournalItem, "source">): JournalGroup => (item.source === "entry" ? "entries" : "study");

export interface CompileJournalInput {
  entries?: readonly JournalEntry[];
  progress?: readonly StudyProgress[];
  discoveries?: readonly DiscoveryCard[];
  personalConnections?: readonly PersonalConnection[];
  explorations?: readonly Exploration[];
  /** 1.x research notebooks. */
  investigations?: readonly Investigation[];
  places?: JournalPlaces;
}

/** Something written at its own place, which a Discovery Card's notes may hold a copy of. */
export interface CopiedWriting {
  text: string;
  /** Copied under a heading line (a reflection under its step's title). */
  headed?: boolean;
}

const ENDING = /[.!?…]+$/;

const isLineStart = (text: string, at: number) => at === 0 || text[at - 1] === "\n";
const isLineEnd = (text: string, at: number) => at === text.length || text[at] === "\n";

/**
 * Removes each whole-line copy of `text` from `notes`. For headed writing,
 * the heading line directly above a copy goes too, when it starts its
 * paragraph (the shape withLearnerWriting writes).
 */
function removeCopies(notes: string, text: string, headed: boolean): string {
  let result = notes;
  let from = 0;
  for (let at = result.indexOf(text); at >= 0; at = result.indexOf(text, from)) {
    const end = at + text.length;
    if (!isLineStart(result, at) || !isLineEnd(result, end)) {
      from = at + 1;
      continue;
    }
    let start = at;
    if (headed && at >= 2 && result[at - 2] !== "\n") {
      const lineStart = result.lastIndexOf("\n", at - 2) + 1;
      if (lineStart <= 1 || result[lineStart - 2] === "\n") start = lineStart;
    }
    result = result.slice(0, start) + result.slice(end);
    from = start;
  }
  return result;
}

/**
 * An older copy of writing that has grown since the card was saved: the
 * paragraph (without its heading line, and ignoring its ending punctuation)
 * is at least 10 characters and starts a line of the writing as it is now.
 * The same test withLearnerWriting uses to replace a grown copy.
 */
function isEarlierCopy(paragraph: string, { text, headed }: CopiedWriting): boolean {
  const lines = paragraph.split("\n");
  const bodies = headed && lines.length > 1 ? [paragraph, lines.slice(1).join("\n")] : [paragraph];
  return bodies.some((body) => {
    const words = body.trim().replace(ENDING, "");
    return words.length >= 10 && (text.startsWith(words) || text.includes(`\n${words}`));
  });
}

/**
 * The learner's own part of a card's notes: the notes without copies of
 * writing the Journal already shows at its own place (exact copies, and
 * older copies of writing that has grown since). Paragraphs are kept in
 * order; the stored notes are never changed.
 */
export function ownCardNotes(notes: string, writing: readonly CopiedWriting[]): string {
  const sources = writing.map(({ text, headed = false }) => ({ text: text.trim(), headed })).filter(({ text }) => text);
  let rest = notes;
  for (const { text, headed } of sources) rest = removeCopies(rest, text, headed);
  return rest
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph && !sources.some((source) => isEarlierCopy(paragraph, source)))
    .join("\n\n");
}

/** "branchId/stepId" or "stepId" (see stepKey): content ids never contain a slash. */
function parseStepKey(key: string): { stepId: string; branchId?: string } {
  const slash = key.indexOf("/");
  return slash > 0 ? { branchId: key.slice(0, slash), stepId: key.slice(slash + 1) } : { stepId: key };
}

const clean = (value: string | undefined) => (value?.trim() ? value.trim() : undefined);

const time = (iso: string) => {
  const value = Date.parse(iso);
  return Number.isFinite(value) ? value : -Infinity;
};

/** Newest first; the same moment in id order, so the feed never reshuffles. */
const byNewest = (a: JournalItem, b: JournalItem) => time(b.date) - time(a.date) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

const EXPLORATION_SOURCES = { attribute: "attribute-note", passage: "passage-note", connect: "connect-note" } as const;

/**
 * Everything the learner has written, newest first: their journal entries,
 * and from their study, step reflections, Discovery Card notes and highlight
 * notes, private notes on Character of Christ, Scripture Explorer, and
 * Connect with Christ pages, Scripture Explorer highlight notes, Map
 * connections, and in 1.x research notebooks, Come unto Christ answers,
 * other reflections, analysis notes, discovery-trail notes, and saved
 * insights. Empty text is left out, and nothing appears twice (see the top
 * of this file).
 */
export function compileJournal(input: CompileJournalInput): JournalItem[] {
  const { entries = [], progress = [], discoveries = [], personalConnections = [], explorations = [], investigations = [], places = {} } = input;

  // A card saves its place's title, so it names the place when the caller can't (content removed since).
  const cardTitles = new Map<string, string>();
  for (const card of [...discoveries].sort((a, b) => time(a.updatedAt) - time(b.updatedAt))) {
    cardTitles.set(`${card.origin.kind}:${card.origin.contentId}`, card.title);
  }
  const titleOf = (kind: DiscoveryOrigin, contentId: string) =>
    clean(places.title?.(kind, contentId)) ?? clean(cardTitles.get(`${kind}:${contentId}`));

  const items: JournalItem[] = [];
  // Writing shown at its own place, by place ("kind:contentId"): what a Discovery Card saved there may copy.
  const shownAt = new Map<string, CopiedWriting[]>();
  // Scripture Explorer highlight notes shown, by "passageId:verse".
  const highlightNotes = new Map<string, CopiedWriting[]>();
  const remember = (map: Map<string, CopiedWriting[]>, key: string, writing: CopiedWriting) =>
    map.set(key, [...(map.get(key) ?? []), writing]);

  for (const entry of entries) {
    const text = entry.text.trim();
    if (!text) continue;
    items.push({
      id: `entry:${entry.id}`,
      source: "entry",
      text,
      date: entry.createdAt,
      where: entry.link?.label ?? "Journal",
      ...(entry.link ? { link: entry.link, href: journalLinkHref(entry.link) } : {}),
      entry,
      editable: true,
    });
  }

  for (const record of progress) {
    for (const [key, state] of Object.entries(record.steps)) {
      const text = state.reflection?.trim();
      if (!text) continue;
      remember(shownAt, `investigation:${record.id}`, { text, headed: true });
      const { stepId, branchId } = parseStepKey(key);
      const step = clean(places.step?.(record.id, stepId, branchId)) ?? (branchId ? "Side question" : "Reflection");
      const where = placeLabel("investigation", titleOf("investigation", record.id), step);
      items.push({
        id: `reflection:${record.id}:${key}`,
        source: "reflection",
        text,
        date: state.updatedAt,
        where,
        link: { kind: "investigation", contentId: record.id, label: where, stepId, ...(branchId ? { branchId } : {}) },
        href: studyInvestigationHref(record.id),
        editable: false,
      });
    }
  }

  // Private notes and highlight notes from Character of Christ, Scripture Explorer, and Connect with Christ.
  for (const exploration of explorations) {
    const { kind, contentId } = exploration;
    const title = titleOf(kind, contentId);
    const link: JournalLink = { kind, contentId, label: placeLabel(kind, title) };
    const href = journalLinkHref(link);
    const note = exploration.note.trim();
    if (note) {
      remember(shownAt, `${kind}:${contentId}`, { text: note });
      items.push({
        id: `exploration-note:${exploration.id}`,
        source: EXPLORATION_SOURCES[kind],
        text: note,
        date: exploration.updatedAt,
        where: link.label,
        link,
        href,
        editable: false,
      });
    }
    if (kind !== "passage") continue;
    for (const highlight of exploration.highlights) {
      const text = highlight.note.trim();
      if (!text) continue;
      remember(highlightNotes, `${contentId}:${highlight.verse}`, { text });
      items.push({
        id: `passage-highlight:${exploration.id}:${highlight.id}`,
        source: "passage-highlight",
        text,
        date: highlight.createdAt,
        where: `${title ?? ORIGIN_LABELS.passage} · Verse ${highlight.verse}`,
        link,
        href,
        editable: false,
      });
    }
  }

  // Discovery Cards: only the learner's own part of the notes, and highlight notes not already shown.
  for (const card of discoveries) {
    const link: JournalLink = { kind: "card", contentId: card.id, label: placeLabel("card", card.title) };
    const href = journalLinkHref(link);
    const notes = ownCardNotes(card.notes, shownAt.get(`${card.origin.kind}:${card.origin.contentId}`) ?? []);
    if (notes) {
      items.push({ id: `card-note:${card.id}`, source: "card-note", text: notes, date: card.updatedAt, where: link.label, link, href, editable: false });
    }
    card.highlights.forEach((highlight, index) => {
      const shown = card.origin.kind === "passage" ? (highlightNotes.get(`${card.origin.contentId}:${highlight.verse}`) ?? []) : [];
      const text = ownCardNotes(highlight.note, shown);
      if (!text) return;
      items.push({
        id: `card-highlight:${card.id}:${index}`,
        source: "card-highlight",
        text,
        date: card.updatedAt,
        where: `${card.title} · Verse ${highlight.verse}`,
        link,
        href,
        editable: false,
      });
    });
  }

  for (const connection of personalConnections) {
    const text = connection.note.trim();
    if (!text) continue;
    items.push({
      id: `map-connection:${connection.id}`,
      source: "map-connection",
      text,
      date: connection.createdAt,
      where: `${connection.from.label} → ${connection.to.label} · Discovery Map`,
      href: mapHref(connection.from.ref),
      editable: false,
    });
  }

  for (const investigation of investigations) items.push(...researchItems(investigation));

  return items.sort(byNewest);
}

interface ResearchPart {
  /** Identifies the part within its notebook, for the item's id. */
  part: string;
  text: string;
  title?: string;
  date: string;
  /** The part, as the notebook names it ("Analysis notes"). */
  label: string;
  section: SectionId;
}

/**
 * The notes and reflections in a 1.x research notebook: what its pages call
 * notes or reflections (Come unto Christ answers, other reflections,
 * analysis notes, discovery-trail notes) and saved insights. Its research
 * itself (the question, hypotheses, evidence, claims, conclusion) is left out.
 * These parts store no time of their own except trail notes and insights, so
 * the others are dated by the notebook's last change.
 */
function researchItems(investigation: Investigation): StudyWritingItem[] {
  const notebook = investigation.title.trim() || investigation.question.trim() || "Untitled notebook";
  const prompts = new Map(COME_UNTO_CHRIST_PROMPTS.map((prompt) => [prompt.id, prompt.question]));
  const parts: ResearchPart[] = [
    // Answers to prompts this version doesn't know (from a newer one) are the learner's words too.
    ...Object.entries(investigation.christReflection).map(([promptId, answer]) => ({
      part: `christ:${promptId}`,
      text: answer,
      title: prompts.get(promptId),
      date: investigation.updatedAt,
      label: "Come unto Christ",
      section: "conclusion" as const,
    })),
    { part: "reflections", text: investigation.reflectionNotes, date: investigation.updatedAt, label: "Reflections", section: "conclusion" },
    { part: "analysis", text: investigation.analysisNotes, date: investigation.updatedAt, label: "Analysis notes", section: "analysis" },
    ...investigation.trailProgress.flatMap((trail) =>
      trail.steps.map((step) => ({
        part: `trail:${trail.trailId}:${step.stepId}`,
        text: step.discoveries,
        title: step.question,
        date: step.updatedAt,
        label: step.title.trim() || "Discovery trail",
        section: "research" as const,
      })),
    ),
    ...investigation.discoveryHighlights.map((highlight) => ({
      part: `insight:${highlight.id}`,
      // An insight saved with only a title is all title.
      ...(highlight.insight.trim() ? { text: highlight.insight, title: highlight.title } : { text: highlight.title }),
      date: highlight.createdAt,
      label: "Saved insight",
      section: "conclusion" as const,
    })),
  ];
  return parts.flatMap(({ part, text, title, date, label, section }): StudyWritingItem[] =>
    text.trim()
      ? [
          {
            id: `research:${investigation.id}:${part}`,
            source: "research-note",
            text: text.trim(),
            ...(title?.trim() ? { title: title.trim() } : {}),
            date,
            where: `${notebook} · ${label}`,
            href: investigationHref(investigation.id, section),
            editable: false,
          },
        ]
      : [],
  );
}

// --- Filter and search ---------------------------------------------------------------

export interface JournalFilters {
  query: string;
  group: JournalGroup | null;
  /** Only journal entries of this kind. */
  entryKind: JournalEntryKind | null;
}

export const EMPTY_JOURNAL_FILTERS: JournalFilters = { query: "", group: null, entryKind: null };

export const hasActiveJournalFilters = (filters: JournalFilters) =>
  filters.query.trim() !== "" || filters.group !== null || filters.entryKind !== null;

/** Everything about an item a learner might search for. */
export function journalSearchText(item: JournalItem): string {
  return normalizeText(
    [item.text, item.title ?? "", item.where, item.source === "entry" ? JOURNAL_ENTRY_KIND_LABELS[item.entry.kind] : ""].join("\n"),
  );
}

/** The items that match, in the order given. Every search word must match somewhere. */
export function filterJournal(items: readonly JournalItem[], filters: JournalFilters): JournalItem[] {
  const terms = searchTerms(filters.query);
  return items.filter(
    (item) =>
      (!filters.group || journalGroup(item) === filters.group) &&
      (!filters.entryKind || (item.source === "entry" && item.entry.kind === filters.entryKind)) &&
      (terms.length === 0 || matchesTerms(journalSearchText(item), terms)),
  );
}
