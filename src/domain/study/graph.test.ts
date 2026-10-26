import { describe, expect, it } from "vitest";
import { connectionKey } from "./cards/common";
import { buildDiscoveryGraph, cardMapRef, edgesOf, neighborsOf, nodesNewSince, originNodeRef, isDirectedEdge } from "./graph";
import { discoveryCardSchema, personalConnectionSchema, type DiscoveryCard, type PersonalConnection } from "./user-data";
import { PRIMARY_QUESTION_TEXT, type NodeRef } from "./vocabulary";

const ALMA = { id: "alma-7-11-12", label: "Alma 7:11–12", kind: "scripture", url: "https://www.churchofjesuschrist.org/study/scriptures/bofm/alma/7" } as const;
const JOHN = { id: "john-15-13-15", label: "John 15:13–15", kind: "scripture", url: "https://www.churchofjesuschrist.org/study/scriptures/nt/john/15" } as const;
const TALK = { id: "talk-succor", label: "“He Will Succor His People”", kind: "speaker", url: "https://www.churchofjesuschrist.org/study/general-conference" } as const;

function card(overrides: Partial<DiscoveryCard> & { id: string; createdAt: string }): DiscoveryCard {
  return discoveryCardSchema.parse({
    updatedAt: overrides.createdAt,
    origin: { kind: "investigation", contentId: "he-knows-how" },
    title: "He knows how to help",
    ...overrides,
  });
}

function personal(overrides: Partial<PersonalConnection> & { id: string }): PersonalConnection {
  return personalConnectionSchema.parse({
    createdAt: "2026-10-05T00:00:00.000Z",
    updatedAt: "2026-10-05T00:00:00.000Z",
    from: { ref: "concept:atonement", label: "Atonement" },
    to: { ref: "concept:friendship", label: "Friendship" },
    relation: "leads-to",
    note: "Because He understands, I can trust Him as a friend.",
    ...overrides,
  });
}

const investigationCard = card({
  id: "card-1",
  createdAt: "2026-10-01T10:00:00.000Z",
  origin: { kind: "investigation", contentId: "he-knows-how", primaryQuestion: "christ" },
  sources: [ALMA, TALK],
  concepts: [
    { ref: "concept:atonement", label: "Atonement", demonstrated: true },
    { ref: "vocabulary:succor", label: "Succor", demonstrated: false },
  ],
  connections: [
    {
      id: connectionKey("scripture:alma-7-11-12", "teaches", "concept:atonement"),
      from: { ref: "scripture:alma-7-11-12", label: "Alma 7:11–12" },
      to: { ref: "concept:atonement", label: "Atonement" },
      relation: "teaches",
      sourceIds: ["alma-7-11-12"],
      note: "Alma describes what the Savior would suffer.",
      provenance: "suggested",
    },
  ],
});

const passageCard = card({
  id: "card-2",
  createdAt: "2026-10-03T10:00:00.000Z",
  origin: { kind: "passage", contentId: "he-will-take-upon-him" },
  title: "He will take upon him",
  sources: [TALK, ALMA, JOHN],
  concepts: [{ ref: "concept:atonement", label: "The Atonement of Jesus Christ", demonstrated: false }],
  connections: [
    {
      id: connectionKey("scripture:alma-7-11-12", "teaches", "concept:atonement"),
      from: { ref: "scripture:alma-7-11-12", label: "Alma 7:11–12" },
      to: { ref: "concept:atonement", label: "The Atonement of Jesus Christ" },
      relation: "teaches",
      sourceIds: ["alma-7-11-12", "talk-succor"],
      note: "Verse 12 explains why.",
      provenance: "demonstrated",
    },
    {
      id: connectionKey("scripture:john-15-13-15", "relates-to", "scripture:alma-7-11-12"),
      from: { ref: "scripture:john-15-13-15", label: "John 15:13–15" },
      to: { ref: "scripture:alma-7-11-12", label: "Alma 7:11–12" },
      relation: "relates-to",
      sourceIds: ["john-15-13-15"],
      note: "Both show His love in action.",
      provenance: "suggested",
    },
  ],
});

describe("originNodeRef", () => {
  it("uses the content node for investigations and attributes", () => {
    expect(originNodeRef(investigationCard)).toBe("investigation:he-knows-how");
    expect(originNodeRef(card({ id: "a", createdAt: "2026-10-01T00:00:00.000Z", origin: { kind: "attribute", contentId: "charity" } }))).toBe(
      "attribute:charity",
    );
  });

  it("uses the first scripture source for passages and Connect sessions", () => {
    expect(originNodeRef(passageCard)).toBe("scripture:alma-7-11-12");
    const session = card({ id: "s", createdAt: "2026-10-01T00:00:00.000Z", origin: { kind: "connect", contentId: "see-1" }, sources: [JOHN] });
    expect(originNodeRef(session)).toBe("scripture:john-15-13-15");
  });

  it("returns null when a passage or session has no scripture source", () => {
    const session = card({ id: "s", createdAt: "2026-10-01T00:00:00.000Z", origin: { kind: "connect", contentId: "see-1" }, sources: [TALK] });
    expect(originNodeRef(session)).toBeNull();
    expect(cardMapRef(session)).toBeNull();
  });

  it("rejects content ids that aren't valid node ids", () => {
    expect(originNodeRef(card({ id: "x", createdAt: "2026-10-01T00:00:00.000Z", origin: { kind: "investigation", contentId: "Bad Id" } }))).toBeNull();
  });

  it("falls back to the first concept for the card's Map link", () => {
    const session = card({
      id: "s",
      createdAt: "2026-10-01T00:00:00.000Z",
      origin: { kind: "connect", contentId: "see-1" },
      concepts: [{ ref: "concept:grace", label: "Grace", demonstrated: true }],
    });
    expect(cardMapRef(session)).toBe("concept:grace");
  });
});

describe("buildDiscoveryGraph", () => {
  it("is empty without cards or connections", () => {
    const graph = buildDiscoveryGraph([], []);
    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
  });

  it("creates nodes for concepts, connection ends, origins, and the primary question", () => {
    const graph = buildDiscoveryGraph([investigationCard]);
    expect(graph.nodes.map((node) => node.ref).sort()).toEqual(
      ["concept:atonement", "investigation:he-knows-how", "question:primary-christ", "scripture:alma-7-11-12", "vocabulary:succor"].sort(),
    );
    expect(graph.nodeByRef.get("question:primary-christ")?.label).toBe(PRIMARY_QUESTION_TEXT.christ);
    expect(graph.nodeByRef.get("investigation:he-knows-how")?.label).toBe("He knows how to help");
    expect(graph.nodeByRef.get("investigation:he-knows-how")?.origins).toEqual([{ kind: "investigation", contentId: "he-knows-how" }]);
  });

  it("never invents a node or edge: a card with nothing in it contributes only its origin", () => {
    const graph = buildDiscoveryGraph([card({ id: "bare", createdAt: "2026-10-01T00:00:00.000Z" })]);
    expect(graph.nodes.map((node) => node.ref)).toEqual(["investigation:he-knows-how"]);
    expect(graph.edges).toEqual([]);
  });

  it("links an investigation to its primary question with the card as evidence, suggested by Gospel Labs", () => {
    const graph = buildDiscoveryGraph([investigationCard]);
    const edge = graph.edgeById.get(connectionKey("investigation:he-knows-how", "rests-on", "question:primary-christ"));
    expect(edge).toMatchObject({ kind: "connection", relation: "rests-on", style: "suggested" });
    expect(edge?.evidence.map((entry) => entry.cardId)).toEqual(["card-1"]);
  });

  it("adds structural explored links from the origin to each concept", () => {
    const graph = buildDiscoveryGraph([investigationCard]);
    const explored = graph.edges.filter((edge) => edge.kind === "explored");
    expect(explored.map((edge) => [edge.from, edge.to])).toEqual([
      ["investigation:he-knows-how", "concept:atonement"],
      ["investigation:he-knows-how", "vocabulary:succor"],
    ]);
    expect(explored.every((edge) => edge.style === "explored" && edge.relation === null)).toBe(true);
  });

  it("skips an explored link where a card connection already joins the same nodes", () => {
    const graph = buildDiscoveryGraph([passageCard]);
    // The passage's origin is Alma 7, which the card already connects to Atonement.
    expect(graph.edges.some((edge) => edge.kind === "explored" && edge.to === "concept:atonement")).toBe(false);
  });

  it("merges a connection across cards, listing each card's evidence, demonstrated if any is", () => {
    const graph = buildDiscoveryGraph([passageCard, investigationCard]);
    const edge = graph.edgeById.get(connectionKey("scripture:alma-7-11-12", "teaches", "concept:atonement"));
    expect(edge?.style).toBe("demonstrated");
    expect(edge?.evidence.map((entry) => [entry.cardId, entry.provenance])).toEqual([
      ["card-1", "suggested"],
      ["card-2", "demonstrated"],
    ]);
    expect(edge?.evidence[1].sources.map((source) => source.id)).toEqual(["alma-7-11-12", "talk-succor"]);
    expect(graph.edges.filter((e) => e.from === "scripture:alma-7-11-12" && e.to === "concept:atonement")).toHaveLength(1);
  });

  it("joins a symmetric relation recorded in the other direction to the same edge", () => {
    const reversed = card({
      id: "card-3",
      createdAt: "2026-10-04T00:00:00.000Z",
      origin: { kind: "attribute", contentId: "charity" },
      sources: [JOHN, ALMA],
      connections: [
        {
          id: connectionKey("scripture:alma-7-11-12", "relates-to", "scripture:john-15-13-15"),
          from: { ref: "scripture:alma-7-11-12", label: "Alma 7:11–12" },
          to: { ref: "scripture:john-15-13-15", label: "John 15:13–15" },
          relation: "relates-to",
          sourceIds: ["alma-7-11-12"],
          note: "Love that acts.",
          provenance: "demonstrated",
        },
      ],
    });
    const graph = buildDiscoveryGraph([passageCard, reversed]);
    const related = graph.edges.filter((edge) => edge.relation === "relates-to");
    expect(related).toHaveLength(1);
    expect(related[0].evidence.map((entry) => entry.cardId)).toEqual(["card-2", "card-3"]);
    expect(related[0].style).toBe("demonstrated");
    expect(isDirectedEdge(related[0])).toBe(false);
  });

  it("records the cards each node appears in and when it first appeared", () => {
    const graph = buildDiscoveryGraph([passageCard, investigationCard]);
    const atonement = graph.nodeByRef.get("concept:atonement");
    expect(atonement?.cardIds).toEqual(["card-1", "card-2"]);
    expect(atonement?.firstSeenAt).toBe("2026-10-01T10:00:00.000Z");
    expect(graph.nodeByRef.get("scripture:john-15-13-15")?.firstSeenAt).toBe("2026-10-03T10:00:00.000Z");
  });

  it("uses the most recent card's label for a node", () => {
    const graph = buildDiscoveryGraph([investigationCard, passageCard]);
    expect(graph.nodeByRef.get("concept:atonement")?.label).toBe("The Atonement of Jesus Christ");
  });

  it("marks nodes the learner demonstrated", () => {
    const graph = buildDiscoveryGraph([investigationCard]);
    expect(graph.nodeByRef.get("concept:atonement")?.discovered).toBe(true);
    expect(graph.nodeByRef.get("vocabulary:succor")?.discovered).toBe(false);
  });

  it("keeps the passage origin and a scripture node's source snapshot", () => {
    const graph = buildDiscoveryGraph([passageCard]);
    const alma = graph.nodeByRef.get("scripture:alma-7-11-12");
    expect(alma?.origins).toEqual([{ kind: "passage", contentId: "he-will-take-upon-him" }]);
    expect(alma?.source?.url).toBe(ALMA.url);
    expect(alma?.cardIds).toEqual(["card-2"]);
  });

  it("adds personal connections as user edges, never merged with card connections", () => {
    const mine = personal({ id: "pc-1", from: { ref: "scripture:alma-7-11-12", label: "Alma 7:11–12" }, to: { ref: "concept:atonement", label: "Atonement" }, relation: "teaches" });
    const graph = buildDiscoveryGraph([investigationCard], [mine]);
    const edges = graph.edges.filter((edge) => edge.from === "scripture:alma-7-11-12" && edge.to === "concept:atonement");
    expect(edges.map((edge) => edge.style).sort()).toEqual(["suggested", "user"]);
    const user = graph.edgeById.get("personal|pc-1");
    expect(user).toMatchObject({ kind: "personal", relation: "teaches", style: "user", evidence: [] });
    expect(user?.personal?.note).toBe(mine.note);
  });

  it("keeps a personal connection whose cards were deleted, using its own labels", () => {
    const graph = buildDiscoveryGraph([], [personal({ id: "pc-2" })]);
    expect(graph.nodes.map((node) => [node.ref, node.label, node.cardIds.length])).toEqual([
      ["concept:atonement", "Atonement", 0],
      ["concept:friendship", "Friendship", 0],
    ]);
    expect(graph.nodeByRef.get("concept:atonement")?.firstSeenAt).toBe("2026-10-05T00:00:00.000Z");
  });

  it("doesn't let a personal connection change a card node's label or first appearance", () => {
    const early = personal({ id: "pc-3", createdAt: "2026-09-01T00:00:00.000Z", from: { ref: "concept:atonement", label: "atonement (mine)" } });
    const graph = buildDiscoveryGraph([investigationCard], [early]);
    const atonement = graph.nodeByRef.get("concept:atonement");
    expect(atonement?.label).toBe("Atonement");
    expect(atonement?.firstSeenAt).toBe("2026-10-01T10:00:00.000Z");
  });

  it("is independent of input order", () => {
    const a = buildDiscoveryGraph([investigationCard, passageCard], [personal({ id: "pc-1" }), personal({ id: "pc-2" })]);
    const b = buildDiscoveryGraph([passageCard, investigationCard], [personal({ id: "pc-2" }), personal({ id: "pc-1" })]);
    expect(b.nodes).toEqual(a.nodes);
    expect(b.edges).toEqual(a.edges);
  });

  it("sorts nodes by kind, then label", () => {
    const graph = buildDiscoveryGraph([investigationCard]);
    expect(graph.nodes.map((node) => node.kind)).toEqual(["scripture", "concept", "question", "vocabulary", "investigation"]);
  });

  it("indexes each node's edges and neighbors", () => {
    const graph = buildDiscoveryGraph([investigationCard]);
    const ref: NodeRef = "concept:atonement";
    expect(edgesOf(graph, ref).map((edge) => edge.kind).sort()).toEqual(["connection", "explored"]);
    expect([...neighborsOf(graph, ref)].sort()).toEqual(["investigation:he-knows-how", "scripture:alma-7-11-12"]);
  });
});

describe("nodesNewSince", () => {
  const graph = buildDiscoveryGraph([investigationCard, passageCard]);

  it("marks nothing new on a first visit", () => {
    expect(nodesNewSince(graph, undefined).size).toBe(0);
  });

  it("marks nodes that first appeared after the last visit", () => {
    expect([...nodesNewSince(graph, "2026-10-02T00:00:00.000Z")]).toEqual(["scripture:john-15-13-15"]);
  });
});
