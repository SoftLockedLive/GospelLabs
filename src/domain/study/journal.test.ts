import { describe, expect, it } from "vitest";
import { richInvestigation } from "../test-fixtures";
import { withLearnerWriting } from "./cards/common";
import {
  compileJournal,
  editJournalEntry,
  EMPTY_JOURNAL_FILTERS,
  filterJournal,
  hasActiveJournalFilters,
  JOURNAL_ENTRY_KIND_LABELS,
  JOURNAL_ENTRY_KINDS,
  JOURNAL_SOURCE_LABELS,
  JOURNAL_SOURCES,
  journalEntrySchema,
  journalGroup,
  journalLinkHref,
  MAX_JOURNAL_TEXT,
  newJournalEntry,
  ownCardNotes,
  placeLabel,
  type JournalEntry,
  type JournalItem,
  type JournalPlaces,
} from "./journal";
import {
  discoveryCardSchema,
  explorationSchema,
  personalConnectionSchema,
  studyProgressSchema,
  type DiscoveryCard,
  type Exploration,
  type StepState,
  type StudyProgress,
} from "./user-data";

const T = (day: number, hour = 12) => `2026-10-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00.000Z`;

const entry = (overrides: Partial<JournalEntry> & { id: string }): JournalEntry =>
  journalEntrySchema.parse({ createdAt: T(20), updatedAt: T(20), text: "A thought.", ...overrides });

const step = (overrides: Partial<StepState> = {}): StepState => ({
  status: "complete",
  difficulty: "medium",
  attempts: 1,
  hintsShown: 0,
  revealed: false,
  skipped: false,
  updatedAt: T(21),
  ...overrides,
});

const progress = (id: string, steps: Record<string, StepState>): StudyProgress =>
  studyProgressSchema.parse({
    id,
    contentVersion: 1,
    startedAt: T(21, 9),
    updatedAt: T(21),
    difficulty: "medium",
    length: "quick",
    position: { stepId: "notice" },
    steps,
  });

const card = (overrides: Partial<DiscoveryCard> & { id: string; origin: DiscoveryCard["origin"] }): DiscoveryCard =>
  discoveryCardSchema.parse({ createdAt: T(22), updatedAt: T(22), title: "A discovery", ...overrides });

const exploration = (overrides: Partial<Exploration> & Pick<Exploration, "kind" | "contentId">): Exploration =>
  explorationSchema.parse({ id: `${overrides.kind}:${overrides.contentId}`, firstAt: T(19), updatedAt: T(23), ...overrides });

/** Titles and step names as the content would give them, the way a page passes them down. */
const TITLES: Record<string, string> = {
  "investigation:one-by-one": "One by One",
  "attribute:charity": "Charity",
  "passage:alma-7": "Alma 7:11–13",
  "connect:his-invitation": "His invitation",
};
const STEPS: Record<string, string> = { notice: "Step 1", connect: "Step 2" };
const PLACES: JournalPlaces = {
  title: (kind, id) => TITLES[`${kind}:${id}`],
  step: (_investigationId, stepId, branchId) => (branchId ? "Side question" : STEPS[stepId]),
};

const byId = (items: readonly JournalItem[]) => Object.fromEntries(items.map((item) => [item.id, item]));
const texts = (items: readonly JournalItem[]) => items.map((item) => item.text);

describe("journal entries", () => {
  it("default to a thought, trim their text, and keep fields added by a newer version", () => {
    const parsed = journalEntrySchema.parse({
      id: "e1",
      createdAt: T(20),
      updatedAt: T(20),
      text: "  Someone smiled at me today.  ",
      mood: "calm",
      link: { kind: "card", contentId: "card-1", label: "One by One · Discovery Card", verse: 12 },
    });
    expect(parsed).toMatchObject({ kind: "thought", text: "Someone smiled at me today.", mood: "calm" });
    expect(parsed.link).toEqual({ kind: "card", contentId: "card-1", label: "One by One · Discovery Card", verse: 12 });
  });

  it("need words, a known kind, a timestamp, and a link that says where it goes", () => {
    const valid = { id: "e1", createdAt: T(20), updatedAt: T(20), text: "Hi" };
    expect(journalEntrySchema.safeParse(valid).success).toBe(true);
    for (const invalid of [
      { ...valid, text: "   " },
      { ...valid, text: "x".repeat(MAX_JOURNAL_TEXT + 1) },
      { ...valid, kind: "poem" },
      { ...valid, createdAt: "yesterday" },
      { ...valid, id: "" },
      { ...valid, link: { kind: "map", contentId: "x", label: "Map" } },
      { ...valid, link: { kind: "card", contentId: "card-1", label: " " } },
    ]) {
      expect(journalEntrySchema.safeParse(invalid).success).toBe(false);
    }
    expect(journalEntrySchema.safeParse({ ...valid, text: "x".repeat(MAX_JOURNAL_TEXT) }).success).toBe(true);
  });

  it("have a plain label for every kind", () => {
    expect(Object.keys(JOURNAL_ENTRY_KIND_LABELS)).toEqual([...JOURNAL_ENTRY_KINDS]);
    expect(JOURNAL_ENTRY_KIND_LABELS["tender-mercy"]).toBe("Tender mercy");
    expect(Object.keys(JOURNAL_SOURCE_LABELS)).toEqual([...JOURNAL_SOURCES]);
  });

  it("are created ready to save, and edited without losing what a newer version added", () => {
    const link = { kind: "attribute" as const, contentId: "charity", label: "Charity · Character of Christ" };
    const created = newJournalEntry({ id: "e1", now: new Date(T(20)), text: " First words ", kind: "question", link });
    expect(created).toEqual({ id: "e1", createdAt: T(20), updatedAt: T(20), kind: "question", text: "First words", link });
    expect(newJournalEntry({ id: "e2", now: new Date(T(20)), text: "No link" })).not.toHaveProperty("link");
    expect(journalEntrySchema.safeParse(created).success).toBe(true);

    const stored = { ...created, futureField: 1 } as JournalEntry;
    const edited = editJournalEntry(stored, { text: "Better words ", kind: undefined }, new Date(T(21)));
    expect(edited).toEqual({ ...stored, text: "Better words", updatedAt: T(21) });
    const unlinked = editJournalEntry(stored, { link: undefined }, new Date(T(21)));
    expect(unlinked).not.toHaveProperty("link");
    expect(unlinked).toMatchObject({ kind: "question", text: "First words", createdAt: T(20), futureField: 1 });
  });
});

describe("places", () => {
  it("read as a title, then the part of the app or the step", () => {
    expect(placeLabel("attribute", "Charity")).toBe("Charity · Character of Christ");
    expect(placeLabel("investigation", "One by One", "Step 2")).toBe("One by One · Step 2");
    expect(placeLabel("investigation", "One by One")).toBe("One by One · Investigation");
    expect(placeLabel("card", "One by One")).toBe("One by One · Discovery Card");
    expect(placeLabel("passage", " ")).toBe("Scripture Explorer");
    expect(placeLabel("investigation", undefined, "Step 2")).toBe("Investigation · Step 2");
  });

  it("link to the page where they are", () => {
    expect(journalLinkHref({ kind: "investigation", contentId: "one-by-one" })).toBe("/investigate/one-by-one");
    expect(journalLinkHref({ kind: "passage", contentId: "alma-7" })).toBe("/explore/alma-7");
    expect(journalLinkHref({ kind: "attribute", contentId: "charity" })).toBe("/character/charity");
    expect(journalLinkHref({ kind: "connect", contentId: "his-invitation" })).toBe("/connect?session=his-invitation");
    expect(journalLinkHref({ kind: "card", contentId: "card 1" })).toBe("/notebook?card=card%201");
  });
});

describe("compileJournal", () => {
  it("gathers everything written, newest first, each linked back to where it was written", () => {
    const items = compileJournal({
      entries: [
        entry({ id: "e1", createdAt: T(25), updatedAt: T(26), kind: "tender-mercy", text: "My sister helped me." }),
        entry({ id: "e2", createdAt: T(18), link: { kind: "attribute", contentId: "charity", label: "Charity · Character of Christ" } }),
      ],
      progress: [progress("one-by-one", { notice: step({ reflection: " I noticed each person. ", updatedAt: T(21) }), connect: step() })],
      discoveries: [card({ id: "card-1", origin: { kind: "passage", contentId: "alma-7" }, title: "Alma 7:11–13", notes: "Mine." })],
      personalConnections: [
        personalConnectionSchema.parse({
          id: "pc-1",
          createdAt: T(17),
          updatedAt: T(24),
          from: { ref: "concept:atonement", label: "Atonement" },
          to: { ref: "concept:succor", label: "Succor" },
          relation: "relates-to",
          note: "These go together for me.",
        }),
      ],
      explorations: [exploration({ kind: "attribute", contentId: "charity", note: "Be patient first." })],
      places: PLACES,
    });

    expect(items.map(({ id, source, date, where, href, editable }) => ({ id, source, date, where, href, editable }))).toEqual([
      { id: "entry:e1", source: "entry", date: T(25), where: "Journal", href: undefined, editable: true },
      { id: "exploration-note:attribute:charity", source: "attribute-note", date: T(23), where: "Charity · Character of Christ", href: "/character/charity", editable: false },
      { id: "card-note:card-1", source: "card-note", date: T(22), where: "Alma 7:11–13 · Discovery Card", href: "/notebook?card=card-1", editable: false },
      { id: "reflection:one-by-one:notice", source: "reflection", date: T(21), where: "One by One · Step 1", href: "/investigate/one-by-one", editable: false },
      { id: "entry:e2", source: "entry", date: T(18), where: "Charity · Character of Christ", href: "/character/charity", editable: true },
      { id: "map-connection:pc-1", source: "map-connection", date: T(17), where: "Atonement → Succor · Discovery Map", href: "/map?node=concept%3Aatonement", editable: false },
    ]);
    expect(byId(items)["reflection:one-by-one:notice"]).toMatchObject({
      text: "I noticed each person.",
      link: { kind: "investigation", contentId: "one-by-one", stepId: "notice", label: "One by One · Step 1" },
    });
    expect(byId(items)["entry:e1"]).toMatchObject({ entry: { kind: "tender-mercy" }, text: "My sister helped me." });
    expect(items.map(journalGroup)).toEqual(["entries", "study", "study", "study", "entries", "study"]);
  });

  it("gives the same writing the same id every time, and orders writing from the same moment by id", () => {
    const input = {
      explorations: [
        exploration({ kind: "connect", contentId: "b", note: "Second." }),
        exploration({ kind: "connect", contentId: "a", note: "First." }),
      ],
    };
    const first = compileJournal(input);
    expect(first.map((item) => item.id)).toEqual(["exploration-note:connect:a", "exploration-note:connect:b"]);
    expect(compileJournal({ explorations: [...input.explorations].reverse() })).toEqual(first);
  });

  it("leaves out empty writing", () => {
    expect(
      compileJournal({
        progress: [progress("one-by-one", { notice: step({ reflection: "   " }), connect: step() })],
        discoveries: [card({ id: "c", origin: { kind: "investigation", contentId: "x" }, notes: "\n\n", highlights: [{ sourceId: "s", verse: 1, text: "w", note: " " }] })],
        explorations: [exploration({ kind: "passage", contentId: "alma-7", highlights: [{ id: "h", verse: 1, start: 0, end: 1, note: "", createdAt: T(20) }] })],
      }),
    ).toEqual([]);
  });

  it("names a step in a side question, and falls back when content can't name a place", () => {
    const items = compileJournal({
      progress: [progress("removed-study", { "friends/why-friends": step({ reflection: "Branch thought." }), notice: step({ reflection: "Main thought." }) })],
      discoveries: [card({ id: "c", origin: { kind: "attribute", contentId: "hope" }, title: "Hope" })],
      explorations: [
        exploration({ kind: "attribute", contentId: "hope", note: "Named by its card." }),
        exploration({ kind: "passage", contentId: "gone", note: "Named by nothing." }),
      ],
    });
    expect(Object.fromEntries(items.map((item) => [item.text, item.where]))).toEqual({
      "Branch thought.": "Investigation · Side question",
      "Main thought.": "Investigation · Reflection",
      "Named by its card.": "Hope · Character of Christ",
      "Named by nothing.": "Scripture Explorer",
    });
    expect(byId(items)["reflection:removed-study:friends/why-friends"].link).toMatchObject({ stepId: "why-friends", branchId: "friends" });
  });

  it("includes the notes and reflections in 1.x research notebooks, not the research itself", () => {
    const notebook = { ...richInvestigation("r"), analysisNotes: "The sources agree.", reflectionNotes: "  I felt calm.  " };
    const items = compileJournal({ investigations: [notebook] });
    expect(items.map(({ id, text, title, where, href }) => ({ id, text, title, where, href }))).toEqual([
      // All written at the fixture's last change (or stamped then), so they come in id order.
      { id: "research:r:analysis", text: "The sources agree.", title: undefined, where: "Investigation r · Analysis notes", href: "/investigations/view?id=r&section=analysis" },
      {
        id: "research:r:christ:learned-about-christ",
        text: "He invites rather than compels.",
        title: "What have you learned about Jesus Christ?",
        where: "Investigation r · Come unto Christ",
        href: "/investigations/view?id=r&section=conclusion",
      },
      { id: "research:r:insight:hl-1", text: "Both passages tie faith to hope.", title: "Faith looks forward", where: "Investigation r · Saved insight", href: "/investigations/view?id=r&section=conclusion" },
      { id: "research:r:reflections", text: "I felt calm.", title: undefined, where: "Investigation r · Reflections", href: "/investigations/view?id=r&section=conclusion" },
      {
        id: "research:r:trail:forgiveness-before-the-atonement:mark-2-sins-forgiven",
        text: "Verse 10.",
        title: expect.any(String),
        where: expect.stringMatching(/^Investigation r · /),
        href: "/investigations/view?id=r&section=research",
      },
    ]);
    expect(texts(items)).not.toContain("My own conclusion.");
    expect(items.every((item) => item.source === "research-note" && !item.editable && !item.link)).toBe(true);
  });
});

describe("nothing appears twice", () => {
  const reflections = { notice: "I noticed each person.", connect: "Each person mattered, and that matters to me." };
  const oneByOne = progress("one-by-one", {
    notice: step({ reflection: reflections.notice }),
    connect: step({ reflection: reflections.connect }),
  });
  // Exactly what the investigation's card builder writes into the notes (cards/investigation.ts).
  const copied = withLearnerWriting("My own words first.", [
    { heading: "Notice the pattern", text: reflections.notice },
    { heading: "Bring it together", text: reflections.connect },
  ]);
  const investigationCard = (notes: string) => card({ id: "card-1", origin: { kind: "investigation", contentId: "one-by-one" }, title: "One by One", notes });

  it("shows a reflection copied into its Discovery Card once, at its step, and the learner's own notes on the card", () => {
    const items = compileJournal({ progress: [oneByOne], discoveries: [investigationCard(copied)], places: PLACES });
    expect(texts(items).sort()).toEqual(["Each person mattered, and that matters to me.", "I noticed each person.", "My own words first."]);
    expect(byId(items)["card-note:card-1"].text).toBe("My own words first.");
  });

  it("adds nothing for a card whose notes are only copies", () => {
    const onlyCopies = withLearnerWriting("", [{ heading: "Notice the pattern", text: reflections.notice }]);
    const items = compileJournal({ progress: [oneByOne], discoveries: [investigationCard(onlyCopies)] });
    expect(items.map((item) => item.source)).toEqual(["reflection", "reflection"]);
  });

  it("leaves out a card's older copy of a reflection that has grown since", () => {
    const grown = progress("one-by-one", { notice: step({ reflection: `${reflections.notice} Even the ones nobody saw.` }) });
    const items = compileJournal({ progress: [grown], discoveries: [investigationCard(copied)] });
    expect(byId(items)["card-note:card-1"].text).toBe(`My own words first.\n\nBring it together\n${reflections.connect}`);
    expect(texts(items)).toContain(`${reflections.notice} Even the ones nobody saw.`);
  });

  it("keeps a copy the learner rewrote on the card, and their own words around a short reflection", () => {
    const short = progress("one-by-one", { notice: step({ reflection: "Yes" }) });
    const items = compileJournal({
      progress: [short],
      discoveries: [investigationCard("Yes, I think so.\n\nNotice the pattern\nYes, and more.")],
    });
    expect(byId(items)["card-note:card-1"].text).toBe("Yes, I think so.\n\nNotice the pattern\nYes, and more.");
  });

  it("removes multi-paragraph copies, and copies from a step whose title has changed since", () => {
    const long = "First part.\n\nSecond part.";
    const record = progress("one-by-one", { notice: step({ reflection: long }) });
    const notes = withLearnerWriting("Mine.", [{ heading: "An old step title", text: long }]);
    expect(compileJournal({ progress: [record], discoveries: [investigationCard(notes)] }).map((item) => item.text)).toEqual([
      "Mine.",
      long,
    ]);
  });

  it("shows a private note copied to a Character of Christ or Connect with Christ card once, on its page", () => {
    const note = "Be patient first, then kind.";
    const items = compileJournal({
      explorations: [exploration({ kind: "attribute", contentId: "charity", note }), exploration({ kind: "connect", contentId: "his-invitation", note: "Pray tonight." })],
      discoveries: [
        card({ id: "a", origin: { kind: "attribute", contentId: "charity" }, title: "Charity", notes: withLearnerWriting("", [{ text: note }]) }),
        card({ id: "c", origin: { kind: "connect", contentId: "his-invitation" }, title: "His invitation", notes: "Pray tonight." }),
        // Saved before the note grew: the older copy isn't repeated either.
        card({ id: "old", origin: { kind: "attribute", contentId: "charity" }, title: "Charity", notes: "Be patient first." }),
      ],
      places: PLACES,
    });
    expect(items.map((item) => [item.source, item.text])).toEqual([
      ["attribute-note", note],
      ["connect-note", "Pray tonight."],
    ]);
  });

  it("shows a Scripture Explorer highlight note once, from the passage, and keeps the card's own", () => {
    const items = compileJournal({
      explorations: [
        exploration({
          kind: "passage",
          contentId: "alma-7",
          highlights: [{ id: "h1", verse: 12, start: 0, end: 6, note: "Purpose, and comfort.", createdAt: T(21) }],
        }),
      ],
      discoveries: [
        card({
          id: "p",
          origin: { kind: "passage", contentId: "alma-7" },
          title: "Alma 7:11–13",
          highlights: [
            { sourceId: "alma-7-11-13", verse: 12, text: "the first words", note: "Purpose, and comfort." },
            // Removed from the passage since the card was saved: the card holds the only copy.
            { sourceId: "alma-7-11-13", verse: 11, text: "the other words", note: "Keep this one." },
          ],
        }),
      ],
      places: PLACES,
    });
    expect(items.map(({ id, text, where }) => ({ id, text, where }))).toEqual([
      { id: "card-highlight:p:1", text: "Keep this one.", where: "Alma 7:11–13 · Verse 11" },
      { id: "passage-highlight:passage:alma-7:h1", text: "Purpose, and comfort.", where: "Alma 7:11–13 · Verse 12" },
    ]);
  });

  it("compares only writing from the card's own place", () => {
    const other = progress("another-study", { notice: step({ reflection: reflections.notice }) });
    const notes = withLearnerWriting("", [{ heading: "Notice the pattern", text: reflections.notice }]);
    const items = compileJournal({ progress: [other], discoveries: [investigationCard(notes)] });
    expect(items.map((item) => item.source).sort()).toEqual(["card-note", "reflection"]);
  });
});

describe("ownCardNotes", () => {
  it("never changes the learner's own paragraphs", () => {
    expect(ownCardNotes("One.\n\nTwo.", [])).toBe("One.\n\nTwo.");
    expect(ownCardNotes("One.\nTwo.", [{ text: "Two." }])).toBe("One.");
    expect(ownCardNotes("Step\nOne.", [{ text: "One." }])).toBe("Step");
    expect(ownCardNotes("Step\nOne.", [{ text: "One.", headed: true }])).toBe("");
    expect(ownCardNotes("Before\nStep\nOne.", [{ text: "One.", headed: true }])).toBe("Before\nStep");
  });
});

describe("filtering the Journal", () => {
  const items = compileJournal({
    entries: [
      entry({ id: "tm", kind: "tender-mercy", text: "A neighbor brought dinner." }),
      entry({ id: "q", kind: "question", text: "Why did they wait so long?", createdAt: T(19) }),
    ],
    explorations: [exploration({ kind: "attribute", contentId: "charity", note: "Patience with my brother." })],
    places: PLACES,
  });

  it("by group and by kind of entry", () => {
    expect(filterJournal(items, { ...EMPTY_JOURNAL_FILTERS, group: "entries" }).map((item) => item.id)).toEqual(["entry:tm", "entry:q"]);
    expect(filterJournal(items, { ...EMPTY_JOURNAL_FILTERS, group: "study" }).map((item) => item.id)).toEqual(["exploration-note:attribute:charity"]);
    expect(filterJournal(items, { ...EMPTY_JOURNAL_FILTERS, entryKind: "tender-mercy" }).map((item) => item.id)).toEqual(["entry:tm"]);
    expect(filterJournal(items, EMPTY_JOURNAL_FILTERS)).toEqual(items);
  });

  it("by words in the text, where it was written, or the kind of entry, ignoring case and accents", () => {
    const search = (query: string) => filterJournal(items, { ...EMPTY_JOURNAL_FILTERS, query }).map((item) => item.id);
    expect(search("NEIGHBOR")).toEqual(["entry:tm"]);
    expect(search("CHARÍTY")).toEqual(["exploration-note:attribute:charity"]);
    expect(search("tender mercy")).toEqual(["entry:tm"]);
    expect(search("why wait")).toEqual(["entry:q"]);
    expect(search("why dinner")).toEqual([]);
  });

  it("knows when anything narrows the list", () => {
    expect(hasActiveJournalFilters(EMPTY_JOURNAL_FILTERS)).toBe(false);
    expect(hasActiveJournalFilters({ ...EMPTY_JOURNAL_FILTERS, query: " " })).toBe(false);
    expect(hasActiveJournalFilters({ ...EMPTY_JOURNAL_FILTERS, group: "study" })).toBe(true);
  });
});
