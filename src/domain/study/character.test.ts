import { describe, expect, it } from "vitest";
import {
  allAttributeLinks,
  attributeEdges,
  attributeExplorationId,
  attributeLinksFor,
  circleLayout,
  connectionCounts,
  explorationSummary,
  newAttributeExploration,
  otherEnd,
  pairKey,
  withCompletedActivity,
  withNote,
  withVocabulary,
} from "./character";
import { explorationSchema } from "./user-data";

const link = (attributeId: string, sourceId = "s1") => ({
  attributeId,
  relation: "relates-to" as const,
  note: `Relates to ${attributeId}.`,
  sourceIds: [sourceId],
});

const ATTRIBUTES = [
  { id: "charity", relationships: [link("long-suffering"), link("mercy")] },
  { id: "meekness", relationships: [link("charity", "s2"), link("unknown")] },
  { id: "long-suffering", relationships: [link("charity", "s3")] },
  { id: "mercy", relationships: [] },
];

describe("attribute relationships", () => {
  it("lists every declared relationship, reading from the declaring attribute", () => {
    expect(allAttributeLinks(ATTRIBUTES).map((l) => `${l.from}>${l.to}`)).toEqual([
      "charity>long-suffering",
      "charity>mercy",
      "meekness>charity",
      "meekness>unknown",
      "long-suffering>charity",
    ]);
  });

  it("includes relationships declared toward an attribute, after its own", () => {
    const links = attributeLinksFor(ATTRIBUTES, "charity");
    expect(links.map((l) => `${l.from}>${l.to}`)).toEqual([
      "charity>long-suffering",
      "charity>mercy",
      "meekness>charity",
      "long-suffering>charity",
    ]);
    expect(links.map((l) => otherEnd(l, "charity"))).toEqual(["long-suffering", "mercy", "meekness", "long-suffering"]);
  });

  it("joins links between the same pair into one undirected edge and skips unknown attributes", () => {
    const edges = attributeEdges(ATTRIBUTES);
    expect(edges.map((edge) => edge.id)).toEqual(["charity|long-suffering", "charity|mercy", "charity|meekness"]);
    const pair = edges.find((edge) => edge.id === pairKey("long-suffering", "charity"));
    expect(pair?.links.map((l) => l.sourceIds[0])).toEqual(["s1", "s3"]);
    expect(connectionCounts(edges)).toEqual({ charity: 3, "long-suffering": 1, mercy: 1, meekness: 1 });
  });

  it("identifies a pair the same way from either end", () => {
    expect(pairKey("mercy", "charity")).toBe(pairKey("charity", "mercy"));
  });
});

describe("circleLayout", () => {
  it("places the first point at the top and spaces the rest evenly clockwise", () => {
    const positions = circleLayout(["a", "b", "c", "d"], { x: 100, y: 100 }, 50);
    expect(positions.a).toEqual({ x: 100, y: 50 });
    expect(positions.b).toEqual({ x: 150, y: 100 });
    expect(positions.c).toEqual({ x: 100, y: 150 });
    expect(positions.d).toEqual({ x: 50, y: 100 });
  });
});

describe("attribute explorations", () => {
  const now = new Date("2026-10-26T12:00:00.000Z");

  it("starts as a valid, empty record keyed by kind and content id", () => {
    const exploration = newAttributeExploration("meekness", now);
    expect(exploration.id).toBe("attribute:meekness");
    expect(attributeExplorationId("meekness")).toBe("attribute:meekness");
    expect(explorationSchema.parse(exploration)).toEqual(exploration);
    expect(exploration.firstAt).toBe(now.toISOString());
  });

  it("records each word and activity once", () => {
    let exploration = newAttributeExploration("meekness", now);
    exploration = withVocabulary(withVocabulary(exploration, "meekness-gentle"), "meekness-gentle");
    exploration = withCompletedActivity(withCompletedActivity(exploration, "meekness-vocab"), "meekness-vocab");
    expect(exploration.vocabulary).toEqual(["meekness-gentle"]);
    expect(exploration.completedActivities).toEqual(["meekness-vocab"]);
    expect(withNote(exploration, "A thought").note).toBe("A thought");
  });

  it("describes what was explored without totals or goals", () => {
    expect(explorationSummary(undefined)).toBeNull();
    expect(explorationSummary({ vocabulary: [], completedActivities: [] })).toBe("Explored");
    expect(explorationSummary({ vocabulary: ["a"], completedActivities: [] })).toBe("Explored · 1 word");
    expect(explorationSummary({ vocabulary: ["a", "b", "c", "d"], completedActivities: ["x", "y"] })).toBe("Explored · 4 words · 2 activities");
    expect(explorationSummary({ vocabulary: [], completedActivities: ["x"] })).toBe("Explored · 1 activity");
  });
});
