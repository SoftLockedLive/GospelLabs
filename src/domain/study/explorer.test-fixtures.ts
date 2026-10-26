/**
 * A small, schema-valid Scripture Explorer passage for tests (Alma 7:11–12,
 * verse text from the shared fixtures). Never shipped to learners.
 */
import { passageSchema, type ExplorerPassage } from "./content-schema";
import { ALMA_7_11_12 } from "./test-fixtures";

export const SAMPLE_PASSAGE: ExplorerPassage = passageSchema.parse({
  id: "sample-passage",
  status: "ready",
  title: "He knows how to help",
  sourceId: "alma-7-11-12",
  context: { setting: "Alma spoke to the people in Gideon.", speaker: "Alma", audience: "The people in Gideon" },
  themes: [
    { conceptId: "atonement", note: "What He would take upon Him.", verses: [11, 12] },
    { conceptId: "succor", note: "Why: to know how to succor.", verses: [12] },
  ],
  keyPhrases: [
    { id: "succor", verse: 12, phrase: "how to succor his people", meaning: "To run to help.", sourceIds: [] },
    { id: "pains", verse: 11, phrase: "the pains and the sicknesses", meaning: "More than sin.", sourceIds: [] },
  ],
  related: [
    { sourceId: "john-15-13-15", relation: "relates-to", note: "Another witness of His love." },
    { sourceId: "alma-7-11-12", relation: "supports", note: "Itself, for the test." },
  ],
  activities: [
    {
      type: "highlight",
      id: "find-why",
      prompt: "Tap the purpose.",
      sourceIds: ["alma-7-11-12"],
      hints: ["Look for ‘that.’"],
      explanation: "Verse 12 gives the purpose.",
      passage: "alma-7-11-12",
      chunks: [
        { verse: 12, text: "And he will take upon him death," },
        { verse: 12, text: "that he may loose the bands of death which bind his people;" },
        { verse: 12, text: "and he will take upon him their infirmities," },
        { verse: 12, text: "that his bowels may be filled with mercy, according to the flesh," },
        { verse: 12, text: "that he may know according to the flesh how to succor his people according to their infirmities." },
      ],
      targets: [4],
    },
    {
      type: "sort",
      id: "sort-verses",
      prompt: "Sort by verse.",
      sourceIds: ["alma-7-11-12", "john-15-13-15"],
      hints: ["Read both verses."],
      explanation: "Verse 11 and verse 12.",
      categories: [
        { id: "v11", label: "Verse 11" },
        { id: "v12", label: "Verse 12" },
      ],
      items: [
        { id: "a", text: "Temptations", category: "v11", why: "Verse 11." },
        { id: "b", text: "Death", category: "v12", why: "Verse 12." },
        { id: "c", text: "Infirmities", category: "v12", why: "Verse 12." },
      ],
    },
  ],
  connections: [
    { from: "scripture:alma-7-11-12", to: "concept:atonement", relation: "teaches", sourceIds: ["alma-7-11-12"], note: "Alma describes His suffering." },
    {
      from: "scripture:john-15-13-15",
      to: "vocabulary:succor",
      relation: "relates-to",
      sourceIds: ["john-15-13-15", "alma-7-11-12"],
      note: "Both passages speak of His help.",
    },
  ],
  sources: [ALMA_7_11_12],
  review: { status: "verified", notes: [] },
});
