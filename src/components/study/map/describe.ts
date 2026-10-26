/**
 * Words for the Discovery Map: how an edge reads as a sentence, and how a node
 * is announced. Shared by the graph, the list view, and the details panel.
 */
import { otherEnd, type DiscoveryGraph, type GraphEdge, type GraphNode } from "@/domain/study/graph";
import { NODE_KIND_LABELS, RELATION_PHRASES, type NodeRef } from "@/domain/study/vocabulary";

export interface EdgeSentence {
  subject: NodeRef;
  phrase: string;
  object: NodeRef;
}

/**
 * The edge as "subject phrase object": "Alma 7:11–12 teaches Atonement".
 * Structural links read "Atonement was explored in He knows how to help".
 */
export function edgeSentence(edge: GraphEdge): EdgeSentence {
  if (edge.kind === "explored") return { subject: edge.to, phrase: "explored in", object: edge.from };
  return { subject: edge.from, phrase: edge.relation ? RELATION_PHRASES[edge.relation] : "relates to", object: edge.to };
}

/** The sentence as plain text, using the graph's labels. */
export function edgeSentenceText(graph: DiscoveryGraph, edge: GraphEdge): string {
  const { subject, phrase, object } = edgeSentence(edge);
  const label = (ref: NodeRef) => graph.nodeByRef.get(ref)?.label ?? ref;
  return `${label(subject)} ${phrase} ${label(object)}`;
}

/** Short relation label for drawing on an edge. */
export const edgeShortLabel = (edge: GraphEdge) => (edge.kind === "explored" ? "explored" : edge.relation ? RELATION_PHRASES[edge.relation] : "");

const EDGE_KIND_ORDER = { personal: 0, connection: 1, explored: 2 } as const;

/** A node's edges, ordered: your connections, then card connections, then explored links; each by the other end's label. */
export function orderedEdges(graph: DiscoveryGraph, node: GraphNode): GraphEdge[] {
  const label = (edge: GraphEdge) => graph.nodeByRef.get(otherEnd(edge, node.ref))?.label ?? "";
  return node.edgeIds
    .flatMap((id) => graph.edgeById.get(id) ?? [])
    .sort((a, b) => EDGE_KIND_ORDER[a.kind] - EDGE_KIND_ORDER[b.kind] || label(a).localeCompare(label(b), "en", { sensitivity: "base" }) || (a.id < b.id ? -1 : 1));
}

/** What a screen reader hears on a node in the graph. */
export function nodeAccessibleName(node: GraphNode, options: { isNew?: boolean; selected?: boolean } = {}): string {
  const count = node.edgeIds.length;
  const label = /[.?!…]$/.test(node.label) ? node.label : `${node.label}.`;
  return [
    `${NODE_KIND_LABELS[node.kind]}: ${label}`,
    count === 0 ? "No connections yet." : `${count} ${count === 1 ? "connection" : "connections"}.`,
    options.isNew ? "New since your last visit." : "",
    options.selected ? "Selected." : "",
  ]
    .filter(Boolean)
    .join(" ");
}
