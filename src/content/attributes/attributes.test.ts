/**
 * Checks specific to the Character of Christ content, beyond the schema and
 * registry checks in src/lib/study-content.test.ts.
 */
import { describe, expect, it } from "vitest";
import { check, checkerFor, emptyResponse } from "@/domain/study/activities";
import { buildContentRegistry } from "@/domain/study/content-registry";
import { pairKey } from "@/domain/study/character";
import rawConcepts from "../concepts.json";
import { ATTRIBUTE_FILES } from "./index";

// Attributes declare all their own sources, so they can be checked apart from the rest of the content.
const { registry, issues } = buildContentRegistry({
  concepts: rawConcepts,
  investigations: {},
  attributes: ATTRIBUTE_FILES,
  passages: {},
  connect: { sessions: [] },
});
const attributes = registry.attributes;

it("has no registry issues on its own", () => {
  expect(issues).toEqual([]);
});

describe.skipIf(attributes.length === 0)("Character of Christ attributes", () => {
  it.each(attributes.map((attribute) => [attribute.id, attribute] as const))("%s: every activity's answer key checks as correct", (_, attribute) => {
    for (const activity of attribute.activities) {
      const revealed = checkerFor(activity).reveal(activity);
      expect(check(activity, revealed).correct, `${activity.id}: revealed answer`).toBe(true);
      if (activity.type !== "reflect") expect(check(activity, emptyResponse(activity)).correct, `${activity.id}: empty answer`).toBe(false);
    }
  });

  it.each(attributes.map((attribute) => [attribute.id, attribute] as const))("%s: has a vocabulary match and a sort, with matched words from its vocabulary", (_, attribute) => {
    const types = attribute.activities.map((activity) => activity.type);
    expect(types).toContain("vocab-match");
    expect(types).toContain("sort");
    const vocabulary = new Set(attribute.vocabulary.map((word) => word.id));
    // Discovery Cards mark a word demonstrated by its pair id, so pair ids must be vocabulary ids.
    for (const activity of attribute.activities) {
      if (activity.type === "vocab-match") for (const pair of activity.pairs) expect(vocabulary, pair.id).toContain(pair.id);
    }
  });

  it("declares each relationship between two attributes only once", () => {
    const pairs = attributes.flatMap((attribute) => attribute.relationships.map((relationship) => pairKey(attribute.id, relationship.attributeId)));
    expect(pairs.length).toBe(new Set(pairs).size);
  });

  it("gives activities ids that are unique across all attributes", () => {
    const ids = attributes.flatMap((attribute) => attribute.activities.map((activity) => activity.id));
    expect(ids.length).toBe(new Set(ids).size);
  });

  it("keeps reflection optional and free of self-ratings", () => {
    for (const attribute of attributes) {
      for (const question of attribute.reflection) expect(question, attribute.id).not.toMatch(/\b(rate|score|scale of|how (christlike|righteous|worthy))\b/i);
    }
  });
});
