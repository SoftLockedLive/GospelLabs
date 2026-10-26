/**
 * How each kind of Discovery Map node and edge looks. Nodes differ by shape
 * as well as color, so kinds stay distinguishable without color; edges differ
 * by line style according to who established them. Node colors are the
 * Discovery Map tokens (--node-*); edge colors match the provenance labels.
 */
import type { GraphEdgeStyle } from "@/domain/study/graph";
import { cn } from "@/lib/cn";
import type { NodeKind } from "@/domain/study/vocabulary";

/** Node shape radius in layout units. */
export const NODE_RADIUS: Record<NodeKind, number> = {
  investigation: 16,
  attribute: 13,
  question: 12,
  scripture: 12,
  concept: 11,
  vocabulary: 8,
};

interface KindTone {
  /** Stroke and tinted fill for the shape. */
  shape: string;
  /** Text color for badges and list markers. */
  text: string;
}

export const KIND_TONES: Record<NodeKind, KindTone> = {
  scripture: { shape: "stroke-node-scripture fill-node-scripture/20", text: "text-node-scripture" },
  concept: { shape: "stroke-node-concept fill-node-concept/20", text: "text-node-concept" },
  question: { shape: "stroke-node-question fill-node-question/20", text: "text-node-question" },
  attribute: { shape: "stroke-node-attribute fill-node-attribute/20", text: "text-node-attribute" },
  vocabulary: { shape: "stroke-node-vocabulary fill-node-vocabulary/15", text: "text-node-vocabulary" },
  investigation: { shape: "stroke-node-investigation fill-node-investigation/15", text: "text-node-investigation" },
};

/** The node's outline, centered on (0, 0). */
export function NodeShape({ kind, r, className }: { kind: NodeKind; r: number; className?: string }) {
  switch (kind) {
    case "scripture":
      return <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={r * 0.3} className={className} />;
    case "question": {
      const d = r * 1.25;
      return <path d={`M0 ${-d}L${d} 0L0 ${d}L${-d} 0Z`} className={className} />;
    }
    case "attribute": {
      const h = r * 1.08;
      const w = h * 0.866;
      return <path d={`M0 ${-h}L${w} ${-h / 2}L${w} ${h / 2}L0 ${h}L${-w} ${h / 2}L${-w} ${-h / 2}Z`} className={className} />;
    }
    case "vocabulary":
      return <rect x={-r * 1.5} y={-r * 0.95} width={r * 3} height={r * 1.9} rx={r * 0.95} className={className} />;
    case "concept":
    case "investigation":
      return <circle r={r} className={className} />;
  }
}

/** The full node glyph: an opaque base (so edges don't show through), the tinted shape, and the hub mark for investigations. */
export function NodeGlyph({ kind, r, strokeWidth = 1.75 }: { kind: NodeKind; r: number; strokeWidth?: number }) {
  return (
    <g strokeWidth={strokeWidth}>
      <NodeShape kind={kind} r={r} className="fill-surface stroke-none" />
      <NodeShape kind={kind} r={r} className={KIND_TONES[kind].shape} />
      {kind === "investigation" && <circle r={r * 0.42} className="fill-node-investigation stroke-none" />}
    </g>
  );
}

/** A small swatch of a node kind, for legends, lists, and badges. */
export function KindSwatch({ kind, className }: { kind: NodeKind; className?: string }) {
  return (
    <svg aria-hidden viewBox="-16 -16 32 32" className={cn("size-4 shrink-0 overflow-visible", className)}>
      <g strokeWidth={2.5}>
        <NodeShape kind={kind} r={kind === "vocabulary" ? 9 : 11} className={KIND_TONES[kind].shape} />
        {kind === "investigation" && <circle r={4.5} className="fill-node-investigation" />}
      </g>
    </svg>
  );
}

// --- Edges ---------------------------------------------------------------------------

export interface EdgeLook {
  className: string;
  width: number;
  dash?: string;
  /** Marker id suffix for arrowheads. */
  marker: string;
}

export const EDGE_LOOKS: Record<GraphEdgeStyle, EdgeLook> = {
  demonstrated: { className: "stroke-green", width: 1.75, marker: "demonstrated" },
  suggested: { className: "stroke-muted", width: 1.4, dash: "6 5", marker: "suggested" },
  user: { className: "stroke-accent", width: 2, dash: "0.5 5", marker: "user" },
  explored: { className: "stroke-line-strong", width: 1.1, marker: "explored" },
};

export const EDGE_LEGEND: { style: GraphEdgeStyle; label: string }[] = [
  { style: "demonstrated", label: "You discovered" },
  { style: "suggested", label: "Suggested by Gospel Labs" },
  { style: "user", label: "Your interpretation" },
  { style: "explored", label: "Explored together" },
];

/** A short line sample of an edge style, for the legend. */
export function EdgeSwatch({ style, className }: { style: GraphEdgeStyle; className?: string }) {
  const look = EDGE_LOOKS[style];
  return (
    <svg aria-hidden viewBox="0 0 28 8" className={cn("h-2 w-7 shrink-0 overflow-visible", className)}>
      <line
        x1={1}
        y1={4}
        x2={27}
        y2={4}
        className={look.className}
        strokeWidth={look.width + 0.25}
        strokeDasharray={look.dash}
        strokeLinecap="round"
      />
    </svg>
  );
}
