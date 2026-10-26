/**
 * The Discovery Map, computed from the learner's Discovery Cards and Personal
 * Connections. Nothing here is prepopulated: a node exists only because a card
 * (or a connection the learner made) names it, and every edge carries the
 * evidence it came from. The Notebook reads the same cards, so the Map and the
 * Notebook always agree.
 *
 * Nodes
 *   - every labeled node in a card's `concepts` and `connections`;
 *   - each card's origin node (see originNodeRef):
 *       investigation → "investigation:<contentId>"
 *       attribute     → "attribute:<contentId>"
 *       passage       → "scripture:<id>" of the card's first scripture source,
 *                       so studying Alma 7 in Scripture Explorer and citing
 *                       Alma 7 in an investigation meet at one node
 *       connect       → the session's scripture source, likewise (none if absent);
 *   - "question:primary-<x>" when an investigation card records the primary
 *     question it rests on;
 *   - endpoints of personal connections whose cards were later deleted, so
 *     the learner's own connections are never silently hidden.
 *
 * Edges
 *   - "connection": card connections, merged across cards by connection id
 *     (a symmetric relation recorded in the other direction joins the same
 *     edge). Each lists its evidence; it is demonstrated if any evidence is.
 *     An investigation's primary question adds "investigation rests on
 *     question", suggested by Gospel Labs, with the card as its evidence.
 *   - "explored": structural links from a card's origin node to the concepts
 *     the card explored. Not a doctrinal relation; drawn faintly.
 *   - "personal": the learner's own connections ("Your interpretation").
 */
import { connectionKey } from "./cards/common";
import type { CardConnection, CardSource, DiscoveryCard, DiscoveryOrigin, PersonalConnection } from "./user-data";
import {
  isNodeRef,
  isSymmetricRelation,
  NODE_KINDS,
  parseNodeRef,
  PRIMARY_QUESTION_TEXT,
  primaryQuestionRef,
  type NodeKind,
  type NodeRef,
  type Relation,
} from "./vocabulary";

export type GraphEdgeKind = "connection" | "explored" | "personal";
/** How an edge is drawn and labeled: by who established it. */
export type GraphEdgeStyle = "demonstrated" | "suggested" | "user" | "explored";

export interface GraphOrigin {
  kind: DiscoveryOrigin;
  contentId: string;
}

export interface GraphNode {
  ref: NodeRef;
  kind: NodeKind;
  id: string;
  label: string;
  /** Cards the node appears in, oldest first. */
  cardIds: string[];
  /** When it first appeared: the earliest card's createdAt (or personal connection's, if only those name it). */
  firstSeenAt: string;
  /** The learner worked it out somewhere: a concept they demonstrated, or an end of a relationship they found. */
  discovered: boolean;
  /** Investigations, passages, attributes, or sessions whose cards start from this node. */
  origins: GraphOrigin[];
  /** Scripture nodes: the cited source, so the panel can link to the original. */
  source?: CardSource;
  /** Ids of the edges that touch this node. */
  edgeIds: string[];
}

/** One card's support for an edge. */
export interface EdgeEvidence {
  cardId: string;
  sourceIds: string[];
  /** The card's snapshots of those sources (any the card didn't snapshot are left out). */
  sources: CardSource[];
  note: string;
  provenance: "demonstrated" | "suggested";
}

export interface GraphEdge {
  id: string;
  kind: GraphEdgeKind;
  from: NodeRef;
  to: NodeRef;
  /** The relationship, read from → to. Null for structural "explored" links. */
  relation: Relation | null;
  style: GraphEdgeStyle;
  /** Card evidence, oldest card first. Empty for personal connections. */
  evidence: EdgeEvidence[];
  /** The learner's connection, for personal edges. */
  personal?: PersonalConnection;
}

export interface DiscoveryGraph {
  /** Sorted by kind (NODE_KINDS order), then label. */
  nodes: GraphNode[];
  /** Sorted by id. */
  edges: GraphEdge[];
  nodeByRef: ReadonlyMap<NodeRef, GraphNode>;
  edgeById: ReadonlyMap<string, GraphEdge>;
}

// --- Origins -------------------------------------------------------------------

/** The scripture source a passage or Connect card centers on: its first scripture source. */
function originScripture(card: DiscoveryCard): CardSource | undefined {
  return card.sources.find((source) => source.kind === "scripture" && isNodeRef(`scripture:${source.id}`));
}

/** The Map node a card starts from, or null if it has none (e.g. a Connect session with no scripture source). */
export function originNodeRef(card: DiscoveryCard): NodeRef | null {
  const { kind, contentId } = card.origin;
  let ref: string | null = null;
  if (kind === "investigation") ref = `investigation:${contentId}`;
  else if (kind === "attribute") ref = `attribute:${contentId}`;
  else {
    const source = originScripture(card);
    ref = source ? `scripture:${source.id}` : null;
  }
  return ref && isNodeRef(ref) ? ref : null;
}

/** The node to show for a card on the Map: its origin, else its first concept or connection end. */
export function cardMapRef(card: DiscoveryCard): NodeRef | null {
  return originNodeRef(card) ?? card.concepts[0]?.ref ?? card.connections[0]?.from.ref ?? null;
}

// --- Building --------------------------------------------------------------------

/** How much a label source is trusted: content labels beat card titles, which beat personal-connection snapshots. */
const LABEL_PRIORITY = { personal: 0, derived: 1, labeled: 2, fixed: 3 } as const;

interface NodeDraft {
  ref: NodeRef;
  kind: NodeKind;
  id: string;
  label: string;
  labelPriority: number;
  cardIds: Set<string>;
  firstSeen: number;
  discovered: boolean;
  origins: Map<string, GraphOrigin>;
  source?: CardSource;
}

interface EdgeDraft {
  id: string;
  kind: GraphEdgeKind;
  from: NodeRef;
  to: NodeRef;
  relation: Relation | null;
  evidence: Map<string, EdgeEvidence>;
  personal?: PersonalConnection;
}

const time = (iso: string) => {
  const value = Date.parse(iso);
  return Number.isFinite(value) ? value : 0;
};

const byCreated = (a: { createdAt: string; id: string }, b: { createdAt: string; id: string }) =>
  time(a.createdAt) - time(b.createdAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

const KIND_INDEX = new Map<NodeKind, number>(NODE_KINDS.map((kind, index) => [kind, index]));

export function compareNodes(a: Pick<GraphNode, "kind" | "label" | "ref">, b: Pick<GraphNode, "kind" | "label" | "ref">): number {
  return (
    (KIND_INDEX.get(a.kind) ?? 0) - (KIND_INDEX.get(b.kind) ?? 0) ||
    a.label.localeCompare(b.label, "en", { sensitivity: "base" }) ||
    (a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : 0)
  );
}

export function buildDiscoveryGraph(cards: readonly DiscoveryCard[], personalConnections: readonly PersonalConnection[] = []): DiscoveryGraph {
  const nodes = new Map<NodeRef, NodeDraft>();
  const edges = new Map<string, EdgeDraft>();

  function touchNode(ref: NodeRef, label: string, priority: number, seenAt: number, cardId?: string): NodeDraft | null {
    const parsed = parseNodeRef(ref);
    if (!parsed) return null;
    let node = nodes.get(ref);
    if (!node) {
      node = {
        ref,
        kind: parsed.kind,
        id: parsed.id,
        label,
        labelPriority: priority,
        cardIds: new Set(),
        firstSeen: seenAt,
        discovered: false,
        origins: new Map(),
      };
      nodes.set(ref, node);
    } else {
      // Cards are visited oldest first, so a later label of equal standing is the more current snapshot.
      if (priority >= node.labelPriority && label.trim()) {
        node.label = label;
        node.labelPriority = priority;
      }
      // A node's first appearance is its earliest card; personal connections count only for nodes no card names.
      if (cardId || node.cardIds.size === 0) node.firstSeen = Math.min(node.firstSeen, seenAt);
    }
    if (cardId) node.cardIds.add(cardId);
    return node;
  }

  function addEvidence(edge: EdgeDraft, evidence: EdgeEvidence) {
    const existing = edge.evidence.get(evidence.cardId);
    if (!existing) edge.evidence.set(evidence.cardId, evidence);
    else if (existing.provenance === "suggested" && evidence.provenance === "demonstrated") edge.evidence.set(evidence.cardId, evidence);
  }

  function connectionEdge(id: string, from: NodeRef, to: NodeRef, relation: Relation): EdgeDraft {
    let key = id;
    if (!edges.has(key) && isSymmetricRelation(relation)) {
      const reversed = connectionKey(to, relation, from);
      if (edges.get(reversed)?.kind === "connection") key = reversed;
    }
    let edge = edges.get(key);
    if (!edge) {
      edge = { id: key, kind: "connection", from, to, relation, evidence: new Map() };
      edges.set(key, edge);
    }
    return edge;
  }

  const ordered = [...cards].sort(byCreated);

  for (const card of ordered) {
    const seenAt = time(card.createdAt);
    const sourcesById = new Map(card.sources.map((source) => [source.id, source]));
    const evidenceFor = (connection: Pick<CardConnection, "sourceIds" | "note" | "provenance">): EdgeEvidence => ({
      cardId: card.id,
      sourceIds: [...connection.sourceIds],
      sources: connection.sourceIds.flatMap((id) => sourcesById.get(id) ?? []),
      note: connection.note,
      provenance: connection.provenance,
    });

    // Origin node
    const originRef = originNodeRef(card);
    if (originRef) {
      const scripture = card.origin.kind === "passage" || card.origin.kind === "connect" ? originScripture(card) : undefined;
      const node = touchNode(originRef, scripture?.label ?? card.title, LABEL_PRIORITY.derived, seenAt, card.id);
      node?.origins.set(`${card.origin.kind}:${card.origin.contentId}`, { kind: card.origin.kind, contentId: card.origin.contentId });
    }

    // Concepts
    for (const concept of card.concepts) {
      const node = touchNode(concept.ref, concept.label, LABEL_PRIORITY.labeled, seenAt, card.id);
      if (node && concept.demonstrated) node.discovered = true;
    }

    // Connections
    for (const connection of card.connections) {
      if (connection.from.ref === connection.to.ref) continue;
      const from = touchNode(connection.from.ref, connection.from.label, LABEL_PRIORITY.labeled, seenAt, card.id);
      const to = touchNode(connection.to.ref, connection.to.label, LABEL_PRIORITY.labeled, seenAt, card.id);
      if (!from || !to) continue;
      if (connection.provenance === "demonstrated") from.discovered = to.discovered = true;
      addEvidence(connectionEdge(connection.id, from.ref, to.ref, connection.relation), evidenceFor(connection));
    }

    // Primary question
    if (card.origin.kind === "investigation" && card.origin.primaryQuestion && originRef) {
      const questionRef = primaryQuestionRef(card.origin.primaryQuestion);
      touchNode(questionRef, PRIMARY_QUESTION_TEXT[card.origin.primaryQuestion], LABEL_PRIORITY.fixed, seenAt, card.id);
      const edge = connectionEdge(connectionKey(originRef, "rests-on", questionRef), originRef, questionRef, "rests-on");
      addEvidence(edge, { cardId: card.id, sourceIds: [], sources: [], note: "", provenance: "suggested" });
    }

    // Structural "explored" links from the origin to each concept
    if (originRef) {
      for (const concept of card.concepts) {
        if (concept.ref === originRef || !nodes.has(concept.ref)) continue;
        const id = `explored|${originRef}|${concept.ref}`;
        let edge = edges.get(id);
        if (!edge) {
          edge = { id, kind: "explored", from: originRef, to: concept.ref, relation: null, evidence: new Map() };
          edges.set(id, edge);
        }
        addEvidence(edge, {
          cardId: card.id,
          sourceIds: [],
          sources: [],
          note: "",
          provenance: concept.demonstrated ? "demonstrated" : "suggested",
        });
      }
    }

    // Source snapshots for scripture nodes (the latest card's snapshot wins)
    for (const source of card.sources) {
      const node = nodes.get(`scripture:${source.id}` as NodeRef);
      if (node && (source.url || !node.source)) node.source = source;
    }
  }

  // An "explored" link adds nothing where a card connection already joins the same two nodes.
  const joined = new Set<string>();
  for (const edge of edges.values()) {
    if (edge.kind === "connection") joined.add(`${edge.from}\n${edge.to}`).add(`${edge.to}\n${edge.from}`);
  }
  for (const [id, edge] of edges) {
    if (edge.kind === "explored" && joined.has(`${edge.from}\n${edge.to}`)) edges.delete(id);
  }

  // Personal connections
  for (const connection of [...personalConnections].sort(byCreated)) {
    if (connection.from.ref === connection.to.ref) continue;
    const seenAt = time(connection.createdAt);
    const from = touchNode(connection.from.ref, connection.from.label, LABEL_PRIORITY.personal, seenAt);
    const to = touchNode(connection.to.ref, connection.to.label, LABEL_PRIORITY.personal, seenAt);
    if (!from || !to) continue;
    const id = `personal|${connection.id}`;
    edges.set(id, { id, kind: "personal", from: from.ref, to: to.ref, relation: connection.relation, evidence: new Map(), personal: connection });
  }

  // Freeze into the public shape
  const cardOrder = new Map(ordered.map((card, index) => [card.id, index]));
  const graphEdges: GraphEdge[] = [...edges.values()]
    .map((edge) => {
      const evidence = [...edge.evidence.values()].sort((a, b) => (cardOrder.get(a.cardId) ?? 0) - (cardOrder.get(b.cardId) ?? 0));
      const style: GraphEdgeStyle =
        edge.kind === "personal"
          ? "user"
          : edge.kind === "explored"
            ? "explored"
            : evidence.some((entry) => entry.provenance === "demonstrated")
              ? "demonstrated"
              : "suggested";
      return { id: edge.id, kind: edge.kind, from: edge.from, to: edge.to, relation: edge.relation, style, evidence, ...(edge.personal ? { personal: edge.personal } : {}) };
    })
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const edgeIds = new Map<NodeRef, string[]>();
  for (const edge of graphEdges) {
    for (const end of [edge.from, edge.to]) {
      const list = edgeIds.get(end);
      if (list) list.push(edge.id);
      else edgeIds.set(end, [edge.id]);
    }
  }

  const graphNodes: GraphNode[] = [...nodes.values()]
    .map((node) => ({
      ref: node.ref,
      kind: node.kind,
      id: node.id,
      label: node.label,
      cardIds: [...node.cardIds].sort((a, b) => (cardOrder.get(a) ?? 0) - (cardOrder.get(b) ?? 0)),
      firstSeenAt: new Date(node.firstSeen).toISOString(),
      discovered: node.discovered,
      origins: [...node.origins.values()],
      ...(node.source ? { source: node.source } : {}),
      edgeIds: edgeIds.get(node.ref) ?? [],
    }))
    .sort(compareNodes);

  return {
    nodes: graphNodes,
    edges: graphEdges,
    nodeByRef: new Map(graphNodes.map((node) => [node.ref, node])),
    edgeById: new Map(graphEdges.map((edge) => [edge.id, edge])),
  };
}

// --- Queries ---------------------------------------------------------------------

export const otherEnd = (edge: Pick<GraphEdge, "from" | "to">, ref: NodeRef): NodeRef => (edge.from === ref ? edge.to : edge.from);

/** The edges touching a node. */
export function edgesOf(graph: DiscoveryGraph, ref: NodeRef): GraphEdge[] {
  return (graph.nodeByRef.get(ref)?.edgeIds ?? []).flatMap((id) => graph.edgeById.get(id) ?? []);
}

/** Refs of the nodes joined to `ref` by any edge. */
export function neighborsOf(graph: DiscoveryGraph, ref: NodeRef): Set<NodeRef> {
  return new Set(edgesOf(graph, ref).map((edge) => otherEnd(edge, ref)));
}

/** Nodes that first appeared after `since` (an ISO time). With no previous visit, nothing is new. */
export function nodesNewSince(graph: DiscoveryGraph, since: string | undefined): Set<NodeRef> {
  const cutoff = since ? Date.parse(since) : NaN;
  if (!Number.isFinite(cutoff)) return new Set();
  return new Set(graph.nodes.filter((node) => Date.parse(node.firstSeenAt) > cutoff).map((node) => node.ref));
}

/** True for relations that read one way, so the edge is drawn with an arrow. */
export const isDirectedEdge = (edge: Pick<GraphEdge, "relation">) => edge.relation !== null && !isSymmetricRelation(edge.relation);
