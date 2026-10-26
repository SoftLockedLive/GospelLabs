"use client";

import { ProvenanceLabel } from "@/components/study/shared/provenance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DiscoveryGraph, GraphEdge } from "@/domain/study/graph";
import { NODE_KIND_LABELS, NODE_KINDS, type NodeRef } from "@/domain/study/vocabulary";
import { cn } from "@/lib/cn";
import { edgeSentenceText, orderedEdges } from "./describe";
import { KindSwatch } from "./node-style";

interface MapListViewProps {
  graph: DiscoveryGraph;
  visible: ReadonlySet<NodeRef>;
  newRefs: ReadonlySet<NodeRef>;
  selected: NodeRef | null;
  onSelect: (ref: NodeRef) => void;
}

export const listItemId = (ref: NodeRef) => `map-list-${ref.replace(":", "-")}`;

/** The same map as an outline: nodes grouped by kind, each with its connections in words. */
export function MapListView({ graph, visible, newRefs, selected, onSelect }: MapListViewProps) {
  const groups = NODE_KINDS.map((kind) => ({ kind, nodes: graph.nodes.filter((node) => node.kind === kind && visible.has(node.ref)) })).filter(
    (group) => group.nodes.length > 0,
  );

  if (groups.length === 0) {
    return <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">Nothing to show with these filters.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      {groups.map(({ kind, nodes }) => (
        <section key={kind} aria-labelledby={`map-list-${kind}`} className="flex flex-col gap-3">
          <h2 id={`map-list-${kind}`} className="flex items-center gap-2 text-sm font-semibold text-fg">
            <KindSwatch kind={kind} />
            {NODE_KIND_LABELS[kind]}
            <span className="font-normal text-subtle">({nodes.length})</span>
          </h2>
          <ul className="grid gap-3 xl:grid-cols-2">
            {nodes.map((node) => {
              const edges = orderedEdges(graph, node).filter((edge) => visible.has(edge.from) && visible.has(edge.to));
              return (
                <li
                  key={node.ref}
                  className={cn("rounded-xl border bg-surface p-4", node.ref === selected ? "border-accent/60" : "border-line")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-medium break-words text-fg">{node.label}</h3>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-subtle">
                        {node.cardIds.length === 0
                          ? "From a connection you made"
                          : `In ${node.cardIds.length} ${node.cardIds.length === 1 ? "discovery" : "discoveries"}`}
                        {newRefs.has(node.ref) && <Badge tone="accent">New</Badge>}
                      </p>
                    </div>
                    <Button
                      id={listItemId(node.ref)}
                      variant="secondary"
                      size="sm"
                      className="h-11 shrink-0 sm:h-9"
                      aria-label={`Details for ${node.label}`}
                      aria-current={node.ref === selected ? "true" : undefined}
                      onClick={() => onSelect(node.ref)}
                    >
                      Details
                    </Button>
                  </div>
                  {edges.length > 0 && (
                    <ul aria-label={`Connections of ${node.label}`} className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
                      {edges.map((edge) => (
                        <li key={edge.id} className="flex flex-col gap-0.5 text-sm">
                          <span className="leading-relaxed text-fg">{edgeSentenceText(graph, edge)}</span>
                          <EdgeProvenance edge={edge} />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function EdgeProvenance({ edge }: { edge: GraphEdge }) {
  if (edge.style === "explored") return <span className="text-xs text-subtle">Explored together</span>;
  return <ProvenanceLabel provenance={edge.style} />;
}
