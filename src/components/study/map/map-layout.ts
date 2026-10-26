/**
 * Turns a DiscoveryGraph into positioned nodes for drawing. The layout runs
 * once per change in the graph's *structure*: edits that don't add or remove
 * nodes or edges (such as personal notes on a card) reuse the cached layout,
 * so the map never jumps around.
 */
import type { DiscoveryGraph, GraphEdgeKind } from "@/domain/study/graph";
import { layoutGraph, type Bounds, type Point } from "@/domain/study/graph-layout";
import type { NodeRef } from "@/domain/study/vocabulary";
import { labelWidth, wrapLabel } from "./labels";
import { NODE_RADIUS } from "./node-style";

export interface MapLayout {
  positions: ReadonlyMap<NodeRef, Point>;
  bounds: Bounds;
  /** Each node's wrapped label lines. */
  labels: ReadonlyMap<NodeRef, string[]>;
  /** A stable key for this layout's structure. */
  key: string;
}

const LINK_WEIGHTS: Record<GraphEdgeKind, { strength: number; length: number }> = {
  connection: { strength: 1, length: 1 },
  personal: { strength: 0.8, length: 1 },
  explored: { strength: 0.45, length: 0.85 },
};

/** Room a node needs for its shape and its label (drawn beneath it). */
export function collisionRadius(shapeRadius: number, lines: readonly string[]): number {
  const halfLabel = labelWidth(lines) / 2;
  const labelHeight = lines.length * 13;
  return Math.max(shapeRadius + 14, Math.min(halfLabel + 8, 64), (shapeRadius * 2 + labelHeight) / 2 + 8);
}

export function layoutKey(graph: DiscoveryGraph): string {
  const nodes = graph.nodes.map((node) => `${node.ref}=${node.label}`).join("\n");
  const edges = graph.edges.map((edge) => `${edge.kind}:${edge.from}>${edge.to}`).join("\n");
  return `${nodes}\n--\n${edges}`;
}

const cache = new Map<string, MapLayout>();
const CACHE_SIZE = 4;

export function computeMapLayout(graph: DiscoveryGraph): MapLayout {
  const key = layoutKey(graph);
  const cached = cache.get(key);
  if (cached) return cached;

  const labels = new Map<NodeRef, string[]>(graph.nodes.map((node) => [node.ref, wrapLabel(node.label)]));
  const { positions, bounds } = layoutGraph(
    graph.nodes.map((node) => ({ id: node.ref, radius: collisionRadius(NODE_RADIUS[node.kind], labels.get(node.ref) ?? []) })),
    graph.edges.map((edge) => ({ source: edge.from, target: edge.to, ...LINK_WEIGHTS[edge.kind] })),
    { linkDistance: 110 },
  );
  const layout: MapLayout = { positions: positions as Map<NodeRef, Point>, bounds, labels, key };
  cache.set(key, layout);
  while (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value as string);
  return layout;
}
