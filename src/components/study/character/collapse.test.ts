import { describe, expect, it } from "vitest";
import { listAttributes } from "@/lib/study-content";
import { isSafetyNote } from "./collapse";

/**
 * On phones, the long lists on an attribute page start collapsed, but safety
 * notes never do. These are the items in today's content that tell a learner
 * an attribute never asks them to put up with abuse or harm.
 */
const KNOWN_SAFETY_ITEMS = [
  "forgiveness contrast forgiveness-not-condoning",
  "forgiveness contrast forgiveness-not-returning-to-harm",
  "long-suffering contrast long-suffering-not-tolerating-abuse",
  "long-suffering example long-suffering-he-suffereth-it",
  "patience example patience-reviled-not-again",
  "humility word Submit",
];

function flaggedItems() {
  return listAttributes().flatMap((attribute) => [
    ...attribute.contrasts
      .filter((contrast) => isSafetyNote(`${contrast.title} ${contrast.explanation}`, contrast.sourceIds))
      .map((contrast) => `${attribute.id} contrast ${contrast.id}`),
    ...attribute.saviorExamples.filter((example) => isSafetyNote(`${example.title} ${example.note}`)).map((example) => `${attribute.id} example ${example.id}`),
    ...attribute.scriptures.filter((item) => isSafetyNote(item.note)).map((item) => `${attribute.id} scripture ${item.sourceId}`),
    ...attribute.vocabulary.filter((word) => isSafetyNote(word.meaning, word.sourceIds)).map((word) => `${attribute.id} word ${word.term}`),
  ]);
}

describe("safety notes on attribute pages", () => {
  it("recognizes a note that cites the Church's abuse help or speaks of abuse or harm", () => {
    expect(isSafetyNote("Bearing patiently is different from enduring mistreatment.")).toBe(true);
    expect(isSafetyNote("If someone is hurting you, telling a trusted adult is right.")).toBe(true);
    expect(isSafetyNote("Forgiving does not require staying in harm’s way.")).toBe(true);
    expect(isSafetyNote("A plain note.", ["gospel-topics-abuse"])).toBe(true);
    expect(isSafetyNote("A plain note.", ["church-abuse-help"])).toBe(true);
    expect(isSafetyNote("Charity suffereth long, and is kind.", ["moroni-7-44-48"])).toBe(false);
  });

  it("keeps every safety note in today's content visible", () => {
    expect(flaggedItems()).toEqual(expect.arrayContaining(KNOWN_SAFETY_ITEMS));
  });
});
