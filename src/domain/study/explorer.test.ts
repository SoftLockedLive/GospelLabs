import { describe, expect, it } from "vitest";
import { buildContentRegistry } from "./content-registry";
import {
  activityStates,
  activityVerses,
  addHighlight,
  bundlePassage,
  chapterLabel,
  demonstratedActivityIds,
  findPhrase,
  formatVerseList,
  highlightAt,
  newPassageExploration,
  passageExplorationId,
  rangeBetween,
  removeHighlight,
  summarizeExploration,
  tapWord,
  updateHighlight,
  validHighlights,
  verseWords,
  withActivityState,
  withHighlights,
  wordCount,
  wordRangeText,
} from "./explorer";
import { SAMPLE_PASSAGE } from "./explorer.test-fixtures";
import { ALMA_7_11_12, CORE_CONCEPTS_FIXTURE, EMPTY_CONTENT } from "./test-fixtures";
import { explorationSchema, type PassageHighlight } from "./user-data";

const VERSE_12 = ALMA_7_11_12.verses[1].text;
const NOW = "2026-10-26T12:00:00.000Z";
const LATER = "2026-10-26T13:00:00.000Z";

const highlight = (over: Partial<PassageHighlight> = {}): PassageHighlight => ({
  id: "h1",
  verse: 12,
  start: 0,
  end: 3,
  note: "",
  createdAt: NOW,
  ...over,
});

describe("verse words", () => {
  it("splits on whitespace and marks tokens without letters as unselectable", () => {
    const words = verseWords("¶ And he said, A certain man had two sons:");
    expect(words).toHaveLength(10);
    expect(words[0]).toEqual({ index: 0, text: "¶", selectable: false });
    expect(words[1]).toEqual({ index: 1, text: "And", selectable: true });
    expect(words[9].text).toBe("sons:");
    expect(verseWords("  ")).toEqual([]);
  });

  it("copies exact words back from a range", () => {
    expect(wordCount(VERSE_12)).toBe(VERSE_12.split(" ").length);
    expect(wordRangeText(VERSE_12, 0, 6)).toBe("And he will take upon him");
    expect(wordRangeText("Jesus wept.", 1, 2)).toBe("wept.");
  });
});

describe("word selection", () => {
  it("starts, extends, and trims a contiguous selection", () => {
    let selection = tapWord(null, 12, 4);
    expect(selection).toEqual({ verse: 12, start: 4, end: 5 });
    selection = tapWord(selection, 12, 7);
    expect(selection).toEqual({ verse: 12, start: 4, end: 8 });
    selection = tapWord(selection, 12, 2);
    expect(selection).toEqual({ verse: 12, start: 2, end: 8 });
    // Tapping an end trims it.
    expect(tapWord(selection, 12, 7)).toEqual({ verse: 12, start: 2, end: 7 });
    expect(tapWord(selection, 12, 2)).toEqual({ verse: 12, start: 3, end: 8 });
    // Tapping inside starts over at that word.
    expect(tapWord(selection, 12, 5)).toEqual({ verse: 12, start: 5, end: 6 });
  });

  it("clears a one-word selection when tapped again, and restarts in another verse", () => {
    expect(tapWord({ verse: 12, start: 3, end: 4 }, 12, 3)).toBeNull();
    expect(tapWord({ verse: 12, start: 3, end: 6 }, 11, 1)).toEqual({ verse: 11, start: 1, end: 2 });
  });

  it("builds a range from an anchor and focus in either direction", () => {
    expect(rangeBetween(11, 5, 2)).toEqual({ verse: 11, start: 2, end: 6 });
    expect(rangeBetween(11, 2, 2)).toEqual({ verse: 11, start: 2, end: 3 });
  });
});

describe("highlights", () => {
  it("adds highlights in reading order", () => {
    const list = addHighlight([highlight({ id: "b", start: 10, end: 12 })], highlight({ id: "a", start: 1, end: 3 }));
    expect(list.map((h) => h.id)).toEqual(["a", "b"]);
  });

  it("keeps adjacent highlights separate", () => {
    const list = addHighlight([highlight({ id: "a", start: 0, end: 3 })], highlight({ id: "b", start: 3, end: 5 }));
    expect(list).toHaveLength(2);
  });

  it("merges overlapping highlights, keeping the earliest id and every note", () => {
    const existing = [
      highlight({ id: "a", start: 2, end: 5, note: "First", conceptId: "atonement", createdAt: NOW }),
      highlight({ id: "b", start: 8, end: 10, note: "Second", createdAt: LATER }),
      highlight({ id: "other-verse", verse: 11, start: 2, end: 9 }),
    ];
    const merged = addHighlight(existing, highlight({ id: "new", start: 4, end: 9, note: "Third", createdAt: LATER }));
    expect(merged).toHaveLength(2);
    const combined = merged.find((h) => h.verse === 12)!;
    expect(combined).toMatchObject({ id: "a", start: 2, end: 10, conceptId: "atonement", createdAt: NOW });
    expect(combined.note).toBe("First\n\nSecond\n\nThird");
  });

  it("lets the new highlight's theme win when merging", () => {
    const [merged] = addHighlight([highlight({ conceptId: "atonement" })], highlight({ id: "n", start: 1, end: 4, conceptId: "succor" }));
    expect(merged.conceptId).toBe("succor");
  });

  it("updates a theme and note, and can clear the theme", () => {
    const list = [highlight({ conceptId: "atonement", note: "old" })];
    expect(updateHighlight(list, "h1", { note: "new" })[0]).toMatchObject({ conceptId: "atonement", note: "new" });
    const cleared = updateHighlight(list, "h1", { conceptId: null })[0];
    expect(cleared.conceptId).toBeUndefined();
    expect("conceptId" in cleared).toBe(false);
    expect(updateHighlight(list, "h1", { conceptId: "succor" })[0].conceptId).toBe("succor");
  });

  it("removes and finds highlights", () => {
    const list = [highlight({ id: "a", start: 0, end: 3 }), highlight({ id: "b", start: 5, end: 6 })];
    expect(highlightAt(list, 12, 2)?.id).toBe("a");
    expect(highlightAt(list, 12, 3)).toBeUndefined();
    expect(highlightAt(list, 11, 0)).toBeUndefined();
    expect(removeHighlight(list, "a").map((h) => h.id)).toEqual(["b"]);
  });

  it("drops highlights that no longer fit the passage", () => {
    const valid = validHighlights(
      [highlight({ id: "ok" }), highlight({ id: "gone-verse", verse: 99 }), highlight({ id: "too-long", start: 0, end: 500 })],
      ALMA_7_11_12.verses,
    );
    expect(valid.map((h) => h.id)).toEqual(["ok"]);
  });
});

describe("key phrases", () => {
  it("finds a phrase's words, ignoring case and quote style", () => {
    expect(findPhrase(VERSE_12, "how to succor his people")).toEqual({ start: 47, end: 52 });
    expect(wordRangeText(VERSE_12, 47, 52)).toBe("how to succor his people");
    expect(findPhrase("Even as I have kept my Father’s commandments", "my father's COMMANDMENTS")).toEqual({ start: 5, end: 8 });
  });

  it("includes a whole word when the phrase starts inside it", () => {
    expect(findPhrase("say within yourselves—It must needs be", "It must needs be")).toEqual({ start: 2, end: 6 });
  });

  it("returns null when the phrase is absent", () => {
    expect(findPhrase(VERSE_12, "not in this verse")).toBeNull();
    expect(findPhrase(VERSE_12, "  ")).toBeNull();
  });

  it("locates every key phrase of the sample passage", () => {
    for (const phrase of SAMPLE_PASSAGE.keyPhrases) {
      const verse = ALMA_7_11_12.verses.find((v) => v.number === phrase.verse)!;
      const range = findPhrase(verse.text, phrase.phrase);
      expect(range, phrase.id).not.toBeNull();
      expect(wordRangeText(verse.text, range!.start, range!.end).toLowerCase()).toContain(phrase.phrase.toLowerCase());
    }
  });
});

describe("exploration records", () => {
  it("creates a valid exploration keyed by passage", () => {
    const exploration = newPassageExploration("sample-passage", NOW);
    expect(exploration.id).toBe("passage:sample-passage");
    expect(passageExplorationId("sample-passage")).toBe(exploration.id);
    expect(explorationSchema.safeParse(exploration).success).toBe(true);
    expect(summarizeExploration(undefined)).toEqual({ explored: false, highlights: 0, activitiesCompleted: 0 });
  });

  it("stores highlights in order and stamps the update", () => {
    const exploration = withHighlights(newPassageExploration("p", NOW), [highlight({ id: "b", start: 9, end: 10 }), highlight({ id: "a" })], LATER);
    expect(exploration.highlights.map((h) => h.id)).toEqual(["a", "b"]);
    expect(exploration.updatedAt).toBe(LATER);
  });

  it("records activity states that survive validation, and lists completed activities once", () => {
    let exploration = newPassageExploration("p", NOW);
    exploration = withActivityState(exploration, "find-why", { attempts: 1, hintsShown: 0, revealed: false, completed: false, response: { selected: [1] } }, NOW);
    expect(exploration.completedActivities).toEqual([]);
    exploration = withActivityState(exploration, "find-why", { attempts: 2, hintsShown: 1, revealed: false, completed: true }, LATER);
    exploration = withActivityState(exploration, "find-why", { attempts: 2, hintsShown: 1, revealed: false, completed: true }, LATER);
    exploration = withActivityState(exploration, "sort-verses", { attempts: 3, hintsShown: 2, revealed: true, completed: true }, LATER);
    expect(exploration.completedActivities).toEqual(["find-why", "sort-verses"]);

    // The loose Exploration schema keeps the extra field through a save and load.
    const stored = explorationSchema.parse(JSON.parse(JSON.stringify(exploration)));
    expect(activityStates(stored)["find-why"]).toMatchObject({ attempts: 2, completed: true });
    expect(demonstratedActivityIds(stored)).toEqual(["find-why"]);
    expect(summarizeExploration(stored, SAMPLE_PASSAGE.activities.map((a) => a.id))).toEqual({ explored: true, highlights: 0, activitiesCompleted: 2 });
    expect(summarizeExploration(stored, ["find-why"]).activitiesCompleted).toBe(1);
  });

  it("ignores malformed stored activity states", () => {
    const exploration = { ...newPassageExploration("p", NOW), activityStates: { bad: "nope", good: { completed: true } } };
    expect(Object.keys(activityStates(exploration))).toEqual(["good"]);
    expect(activityStates({ ...newPassageExploration("p", NOW), activityStates: [1, 2] })).toEqual({});
  });

  it("saving one activity keeps every other stored entry exactly as it was, including ones it can't read", () => {
    const fromNewer = { attempts: "several", newField: { kept: true } };
    const stored = {
      ...newPassageExploration("p", NOW),
      activityStates: { bad: "nope", newer: fromNewer, good: { completed: true }, "find-why": { attempts: 1, completed: false } },
    };
    const saved = withActivityState(stored, "find-why", { attempts: 2, hintsShown: 0, revealed: false, completed: true }, LATER);
    expect((saved as { activityStates?: unknown }).activityStates).toEqual({
      bad: "nope",
      newer: fromNewer,
      good: { completed: true },
      "find-why": { attempts: 2, hintsShown: 0, revealed: false, completed: true },
    });
    // The record still validates, and the unreadable entries are still skipped on read.
    expect(Object.keys(activityStates(explorationSchema.parse(saved))).sort()).toEqual(["find-why", "good"]);
  });
});

describe("activity verses", () => {
  it("uses a highlight activity's answer verses and every verse otherwise", () => {
    const [highlightActivity, sortActivity] = SAMPLE_PASSAGE.activities;
    expect(activityVerses(highlightActivity, SAMPLE_PASSAGE, [11, 12])).toEqual([12]);
    expect(activityVerses(sortActivity, SAMPLE_PASSAGE, [11, 12])).toEqual([11, 12]);
    const elsewhere = { ...sortActivity, sourceIds: ["john-15-13-15"] };
    expect(activityVerses(elsewhere, SAMPLE_PASSAGE, [11, 12])).toEqual([]);
  });
});

describe("bundlePassage", () => {
  it("collects sources, theme refs, and labels for the client", () => {
    const { registry } = buildContentRegistry({ ...EMPTY_CONTENT, concepts: CORE_CONCEPTS_FIXTURE });
    const bundle = bundlePassage(registry, SAMPLE_PASSAGE);
    expect(Object.keys(bundle.sources)).toEqual(["alma-7-11-12"]);
    expect(bundle.themes.atonement).toMatchObject({ ref: "concept:atonement", label: "Atonement of Jesus Christ" });
    expect(bundle.themes.succor.ref).toBe("vocabulary:succor");
    expect(bundle.labels["scripture:alma-7-11-12"]).toBe("Alma 7:11–12");
    expect(bundle.labels["concept:atonement"]).toBe("Atonement of Jesus Christ");
  });

  it("leaves review notes out of the learner's page", () => {
    const { registry } = buildContentRegistry({ ...EMPTY_CONTENT, concepts: CORE_CONCEPTS_FIXTURE });
    const withNotes = { ...SAMPLE_PASSAGE, review: { status: "needs-review" as const, notes: [{ where: "context", note: "Check this." }] } };
    expect(bundlePassage(registry, withNotes).passage.review).toEqual({ status: "needs-review", notes: [] });
  });

  it("formats verse lists", () => {
    expect(formatVerseList([12])).toBe("Verse 12");
    expect(formatVerseList([13, 11, 12])).toBe("Verses 11–13");
    expect(formatVerseList([9, 11, 12, 13, 15])).toBe("Verses 9, 11–13, 15");
    expect(formatVerseList([])).toBe("");
  });

  it("names a scripture's chapter", () => {
    expect(chapterLabel("Alma 7:11–13")).toBe("Alma 7");
    expect(chapterLabel("Doctrine and Covenants 62:1")).toBe("Doctrine and Covenants 62");
    expect(chapterLabel("Alma 7")).toBe("Alma 7");
  });
});
