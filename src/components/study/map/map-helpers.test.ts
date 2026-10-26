import { describe, expect, it } from "vitest";
import { connectionKey } from "@/domain/study/cards/common";
import { buildDiscoveryGraph } from "@/domain/study/graph";
import { discoveryCardSchema, personalConnectionSchema } from "@/domain/study/user-data";
import { edgeSentence, edgeSentenceText, nodeAccessibleName, orderedEdges } from "./describe";
import { labelWidth, wrapLabel } from "./labels";
import { collisionRadius, computeMapLayout, layoutKey } from "./map-layout";

const card = discoveryCardSchema.parse({
  id: "card-1",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  origin: { kind: "investigation", contentId: "he-knows-how", primaryQuestion: "christ" },
  title: "He knows how to help",
  sources: [{ id: "alma-7-11-12", label: "Alma 7:11–12", kind: "scripture" }],
  concepts: [{ ref: "concept:atonement", label: "Atonement", demonstrated: true }],
  connections: [
    {
      id: connectionKey("scripture:alma-7-11-12", "teaches", "concept:atonement"),
      from: { ref: "scripture:alma-7-11-12", label: "Alma 7:11–12" },
      to: { ref: "concept:atonement", label: "Atonement" },
      relation: "teaches",
      sourceIds: ["alma-7-11-12"],
      note: "",
      provenance: "demonstrated",
    },
  ],
});

const mine = personalConnectionSchema.parse({
  id: "pc-1",
  createdAt: "2026-10-02T00:00:00.000Z",
  updatedAt: "2026-10-02T00:00:00.000Z",
  from: { ref: "concept:atonement", label: "Atonement" },
  to: { ref: "question:primary-christ", label: "Is Jesus Christ the Son of God?" },
  relation: "answers",
  note: "His suffering shows who He is.",
});

describe("wrapLabel", () => {
  it("keeps short labels on one line", () => {
    expect(wrapLabel("Atonement")).toEqual(["Atonement"]);
  });

  it("wraps at word boundaries into at most two lines", () => {
    expect(wrapLabel("The Atonement of Jesus Christ")).toEqual(["The Atonement of", "Jesus Christ"]);
  });

  it("ends a cut label with an ellipsis", () => {
    const lines = wrapLabel("Is Jesus Christ the Son of God, the Savior of the world?");
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith("…")).toBe(true);
    expect(lines.every((line) => line.length <= 18)).toBe(true);
  });

  it("shortens a cut label at a word boundary, never mid-word", () => {
    // The second line, "Atonement of Jesus", is exactly a line long, and more follows.
    expect(wrapLabel("The way of the Atonement of Jesus Christ")).toEqual(["The way of the", "Atonement of…"]);
  });

  it("breaks a single very long word", () => {
    const lines = wrapLabel("Antidisestablishmentarianism");
    expect(lines.every((line) => line.length <= 18)).toBe(true);
  });

  it("measures the widest line", () => {
    expect(labelWidth(["ab", "abcd"])).toBeGreaterThan(labelWidth(["abc"]));
    expect(labelWidth([])).toBe(0);
  });
});

describe("map layout", () => {
  it("gives long labels more room", () => {
    expect(collisionRadius(11, ["The Atonement of", "Jesus Christ"])).toBeGreaterThan(collisionRadius(11, ["Faith"]));
  });

  it("positions every node and reuses the layout when only non-structural data changes", () => {
    const graph = buildDiscoveryGraph([card], [mine]);
    const layout = computeMapLayout(graph);
    expect([...layout.positions.keys()].sort()).toEqual(graph.nodes.map((node) => node.ref).sort());
    const withNotes = buildDiscoveryGraph([{ ...card, notes: "A note" }], [mine]);
    expect(layoutKey(withNotes)).toBe(layoutKey(graph));
    expect(computeMapLayout(withNotes)).toBe(layout);
    const without = buildDiscoveryGraph([card], []);
    expect(layoutKey(without)).not.toBe(layoutKey(graph));
  });
});

describe("describe", () => {
  const graph = buildDiscoveryGraph([card], [mine]);

  it("reads relationships from → to, and explored links as 'explored in'", () => {
    const teaches = graph.edgeById.get(connectionKey("scripture:alma-7-11-12", "teaches", "concept:atonement"));
    if (!teaches) throw new Error("missing edge");
    expect(edgeSentenceText(graph, teaches)).toBe("Alma 7:11–12 teaches Atonement");
    const explored = graph.edges.find((edge) => edge.kind === "explored");
    if (!explored) throw new Error("missing explored edge");
    expect(edgeSentence(explored)).toEqual({ subject: "concept:atonement", phrase: "explored in", object: "investigation:he-knows-how" });
  });

  it("orders a node's edges: yours, then connections, then explored", () => {
    const atonement = graph.nodeByRef.get("concept:atonement");
    if (!atonement) throw new Error("missing node");
    expect(orderedEdges(graph, atonement).map((edge) => edge.kind)).toEqual(["personal", "connection", "explored"]);
  });

  it("names nodes for assistive technology", () => {
    const atonement = graph.nodeByRef.get("concept:atonement");
    if (!atonement) throw new Error("missing node");
    expect(nodeAccessibleName(atonement, { isNew: true, selected: true })).toBe(
      "Gospel concept: Atonement. 3 connections. New since your last visit. Selected.",
    );
  });
});
