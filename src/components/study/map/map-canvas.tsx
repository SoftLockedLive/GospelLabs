"use client";

import { Maximize, Minus, Plus } from "lucide-react";
import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from "react";
import { isDirectedEdge, neighborsOf, type DiscoveryGraph, type GraphEdge, type GraphEdgeStyle } from "@/domain/study/graph";
import { nodeInDirection, type Direction, type Point } from "@/domain/study/graph-layout";
import type { NodeRef } from "@/domain/study/vocabulary";
import { cn } from "@/lib/cn";
import { currentMotionLevel } from "@/lib/preferences";
import { edgeShortLabel, nodeAccessibleName } from "./describe";
import type { MapLayout } from "./map-layout";
import { EDGE_LOOKS, NODE_RADIUS, NodeGlyph } from "./node-style";
import {
  centerOn,
  easeOutCubic,
  fitBounds,
  interpolate,
  isInView,
  MAX_ZOOM,
  MIN_ZOOM,
  panBy,
  wheelZoomFactor,
  zoomAround,
  type Viewport,
} from "./viewport";

export interface MapCanvasHandle {
  /** Moves keyboard focus to a node, bringing it into view. */
  focusNode: (ref: NodeRef) => void;
  /** Smoothly centers the view on a node. */
  centerOn: (ref: NodeRef) => void;
}

interface MapCanvasProps {
  graph: DiscoveryGraph;
  layout: MapLayout;
  /** Nodes not hidden by filters. */
  visible: ReadonlySet<NodeRef>;
  selected: NodeRef | null;
  newRefs: ReadonlySet<NodeRef>;
  /** A node to center on when the map first appears (from ?node=). */
  initialFocus: NodeRef | null;
  onSelect: (ref: NodeRef) => void;
  onDeselect: () => void;
  /** Id of the element describing how to use the map. */
  describedBy?: string;
  handle?: Ref<MapCanvasHandle>;
}

const ARROW_KEYS: Record<string, Direction> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
const DRAG_THRESHOLD = 5;
const ZOOM_STEP = 1.3;

interface Size {
  w: number;
  h: number;
}

/** Narrow screens show the details panel as a bottom sheet, so a focused node sits higher. */
function focusAnchor(size: Size): Point {
  const wide = typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
  return { x: size.w / 2, y: wide ? size.h / 2 : size.h * 0.32 };
}

function centeredView(view: Viewport, world: Point, size: Size, k = view.k): Viewport {
  const anchor = focusAnchor(size);
  const centered = centerOn(view, world, size.w, size.h, k);
  return { ...centered, x: centered.x + (anchor.x - size.w / 2), y: centered.y + (anchor.y - size.h / 2) };
}

export function MapCanvas({ graph, layout, visible, selected, newRefs, initialFocus, onSelect, onDeselect, describedBy, handle }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const markerPrefix = `map${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [size, setSize] = useState<Size | null>(null);

  // --- Size -------------------------------------------------------------------
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);
      // Hidden (list view): keep the last real size.
      if (w === 0 || h === 0) return;
      setSize((current) => (current && current.w === w && current.h === h ? current : { w, h }));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // --- Viewport ---------------------------------------------------------------
  // Until the learner pans or zooms, the view follows the fitted view (and so the canvas size).
  const fitted = useMemo<Viewport | null>(() => {
    if (!size) return null;
    const fit = fitBounds(layout.bounds, size.w, size.h, 40);
    const focus = initialFocus ? layout.positions.get(initialFocus) : undefined;
    return focus ? centeredView(fit, focus, size, Math.max(fit.k, 0.9)) : fit;
  }, [layout, size, initialFocus]);
  const [viewState, setViewState] = useState<{ layout: MapLayout; view: Viewport } | null>(null);
  const view: Viewport = (viewState && viewState.layout === layout ? viewState.view : fitted) ?? { x: 0, y: 0, k: 1 };

  const viewRef = useRef(view);
  const sizeRef = useRef(size);
  useEffect(() => {
    viewRef.current = view;
    sizeRef.current = size;
  });

  const animation = useRef<number | null>(null);
  const stopAnimation = () => {
    if (animation.current !== null) cancelAnimationFrame(animation.current);
    animation.current = null;
  };
  useEffect(() => stopAnimation, []);

  const setView = useCallback(
    (next: Viewport | ((current: Viewport) => Viewport)) =>
      setViewState((current) => {
        const base = (current && current.layout === layout ? current.view : fitted) ?? { x: 0, y: 0, k: 1 };
        return { layout, view: typeof next === "function" ? next(base) : next };
      }),
    [layout, fitted],
  );

  const animateTo = useCallback(
    (target: Viewport) => {
      stopAnimation();
      const level = currentMotionLevel();
      if (level === "off") {
        setView(target);
        return;
      }
      const from = viewRef.current;
      const duration = level === "full" ? 480 : 280;
      const started = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - started) / duration);
        setView(interpolate(from, target, easeOutCubic(t)));
        animation.current = t < 1 ? requestAnimationFrame(step) : null;
      };
      animation.current = requestAnimationFrame(step);
    },
    [setView],
  );

  const zoomBy = useCallback(
    (factor: number) => {
      const current = sizeRef.current;
      if (!current) return;
      animateTo(zoomAround(viewRef.current, factor, { x: current.w / 2, y: current.h / 2 }));
    },
    [animateTo],
  );

  const fit = useCallback(() => {
    const current = sizeRef.current;
    if (current) animateTo(fitBounds(layout.bounds, current.w, current.h, 40));
  }, [animateTo, layout]);

  const ensureVisible = useCallback(
    (ref: NodeRef) => {
      const point = layout.positions.get(ref);
      const current = sizeRef.current;
      if (!point || !current) return;
      if (!isInView(viewRef.current, point, current.w, current.h, 56)) animateTo(centeredView(viewRef.current, point, current));
    },
    [animateTo, layout],
  );

  // --- Wheel zoom (needs a non-passive listener to keep the page from scrolling) ---
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      stopAnimation();
      const rect = svg.getBoundingClientRect();
      const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      setView((current) => zoomAround(current, wheelZoomFactor(event.deltaY, event.deltaMode, event.ctrlKey), anchor));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [setView]);

  // --- Pointer pan and pinch ---------------------------------------------------
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{ origin: Point; moved: boolean; pinch?: { distance: number; mid: Point; view: Viewport } } | null>(null);
  const suppressClick = useRef(false);
  const [dragging, setDragging] = useState(false);

  const localPoint = (event: ReactPointerEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) };
  };

  const startPinch = () => {
    const [a, b] = [...pointers.current.values()];
    if (!a || !b || !gesture.current) return;
    gesture.current.pinch = {
      distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      view: viewRef.current,
    };
  };

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const point = localPoint(event);
    pointers.current.set(event.pointerId, point);
    if (pointers.current.size === 1) {
      suppressClick.current = false;
      gesture.current = { origin: point, moved: false };
    } else if (pointers.current.size === 2) {
      stopAnimation();
      if (gesture.current) gesture.current.moved = true;
      suppressClick.current = true;
      for (const id of pointers.current.keys()) {
        if (!svgRef.current?.hasPointerCapture(id)) svgRef.current?.setPointerCapture(id);
      }
      startPinch();
    }
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const previous = pointers.current.get(event.pointerId);
    const current = gesture.current;
    if (!previous || !current) return;
    const point = localPoint(event);
    pointers.current.set(event.pointerId, point);

    if (pointers.current.size >= 2 && current.pinch) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const { pinch } = current;
      const zoomed = zoomAround(pinch.view, distance / pinch.distance, pinch.mid);
      setView(panBy(zoomed, mid.x - pinch.mid.x, mid.y - pinch.mid.y));
      return;
    }

    if (!current.moved) {
      if (Math.hypot(point.x - current.origin.x, point.y - current.origin.y) < DRAG_THRESHOLD) return;
      // Start panning only once the pointer really moves, so a tap still selects the node under it.
      current.moved = true;
      suppressClick.current = true;
      setDragging(true);
      stopAnimation();
      svgRef.current?.setPointerCapture(event.pointerId);
      setView((v) => panBy(v, point.x - current.origin.x, point.y - current.origin.y));
      return;
    }
    setView((v) => panBy(v, point.x - previous.x, point.y - previous.y));
  };

  const onPointerEnd = (event: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(event.pointerId);
    if (svgRef.current?.hasPointerCapture(event.pointerId)) svgRef.current.releasePointerCapture(event.pointerId);
    if (gesture.current) gesture.current.pinch = undefined;
    if (pointers.current.size === 0) {
      gesture.current = null;
      setDragging(false);
    }
  };

  // --- Roving focus --------------------------------------------------------------
  const elements = useRef(new Map<NodeRef, SVGGElement>());
  const registerNode = useCallback((ref: NodeRef, element: SVGGElement | null) => {
    if (element) elements.current.set(ref, element);
    else elements.current.delete(ref);
  }, []);

  const [active, setActive] = useState<NodeRef | null>(null);
  const fallbackActive = useMemo(() => {
    let best: { ref: NodeRef; degree: number } | null = null;
    for (const node of graph.nodes) {
      if (!visible.has(node.ref)) continue;
      if (!best || node.edgeIds.length > best.degree) best = { ref: node.ref, degree: node.edgeIds.length };
    }
    return best?.ref ?? null;
  }, [graph, visible]);
  const tabStop = [active, selected, fallbackActive].find((ref): ref is NodeRef => ref !== null && visible.has(ref)) ?? null;

  const focusNode = useCallback(
    (ref: NodeRef) => {
      setActive(ref);
      elements.current.get(ref)?.focus({ preventScroll: true });
      ensureVisible(ref);
    },
    [ensureVisible],
  );

  useImperativeHandle(
    handle,
    () => ({
      focusNode,
      centerOn: (ref: NodeRef) => {
        const point = layout.positions.get(ref);
        const current = sizeRef.current;
        if (point && current) animateTo(centeredView(viewRef.current, point, current, Math.max(viewRef.current.k, 0.8)));
      },
    }),
    [focusNode, animateTo, layout],
  );

  const visibleList = useMemo(() => graph.nodes.filter((node) => visible.has(node.ref)).map((node) => node.ref), [graph, visible]);

  const onNodeKeyDown = useCallback(
    (ref: NodeRef, event: ReactKeyboardEvent<SVGGElement>) => {
      const direction = ARROW_KEYS[event.key];
      if (direction) {
        event.preventDefault();
        const next = nodeInDirection(ref, direction, layout.positions, visibleList, neighborsOf(graph, ref));
        if (next) focusNode(next);
        return;
      }
      switch (event.key) {
        case "Enter":
        case " ":
          event.preventDefault();
          onSelect(ref);
          break;
        case "Escape":
          if (selected) {
            event.preventDefault();
            onDeselect();
          }
          break;
        case "Home":
        case "End": {
          event.preventDefault();
          const target = event.key === "Home" ? visibleList[0] : visibleList.at(-1);
          if (target) focusNode(target);
          break;
        }
        case "+":
        case "=":
          event.preventDefault();
          zoomBy(ZOOM_STEP);
          break;
        case "-":
        case "_":
          event.preventDefault();
          zoomBy(1 / ZOOM_STEP);
          break;
        case "0":
          event.preventDefault();
          fit();
          break;
      }
    },
    [layout, visibleList, graph, focusNode, onSelect, onDeselect, selected, zoomBy, fit],
  );

  const onNodeClick = useCallback(
    (ref: NodeRef) => {
      if (suppressClick.current) return;
      setActive(ref);
      onSelect(ref);
    },
    [onSelect],
  );

  const onNodeFocus = useCallback((ref: NodeRef) => setActive(ref), []);

  // --- Rendering -------------------------------------------------------------------
  const highlighted = useMemo(() => (selected ? neighborsOf(graph, selected) : null), [graph, selected]);
  const showAllLabels = view.k >= 0.6;
  // Keep labels readable when zoomed out by drawing them larger in map units, so they stay about 11px on
  // screen (quantized to limit re-renders). The old 2.5× cap left them near 8px on a phone's fitted view.
  const labelScale = view.k >= 1 ? 1 : Math.min(4, Math.round((1 / view.k) * 4) / 4);
  const minHit = Math.min(60, Math.round(22 / view.k / 2) * 2);

  return (
    <div
      ref={containerRef}
      className="relative h-[min(60dvh,40rem)] min-h-[20rem] overflow-hidden rounded-2xl border border-line bg-surface-sunken/70 lg:h-[calc(100dvh-15rem)] lg:min-h-[30rem]"
    >
      <svg
        ref={svgRef}
        role="group"
        aria-roledescription="discovery map"
        aria-label="Discovery Map"
        aria-describedby={describedBy}
        className={cn("block size-full touch-none select-none", dragging ? "cursor-grabbing" : "cursor-grab")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClick={(event) => {
          if (suppressClick.current) return;
          if ((event.target as Element).closest("[data-node]")) return;
          if (selected) onDeselect();
        }}
      >
        <defs>
          {(["demonstrated", "suggested", "user"] as const).map((style) => (
            <marker
              key={style}
              id={`${markerPrefix}-${style}`}
              viewBox="0 0 10 10"
              refX={8.5}
              refY={5}
              markerWidth={8}
              markerHeight={8}
              markerUnits="userSpaceOnUse"
              orient="auto"
            >
              <path d="M0 1.2L9 5L0 8.8Z" className={MARKER_FILLS[style]} />
            </marker>
          ))}
        </defs>
        <g transform={`translate(${round(view.x)} ${round(view.y)}) scale(${round(view.k, 1000)})`}>
          <GraphLayer
            graph={graph}
            layout={layout}
            visible={visible}
            selected={selected}
            highlighted={highlighted}
            tabStop={tabStop}
            newRefs={newRefs}
            showAllLabels={showAllLabels}
            labelScale={labelScale}
            minHit={minHit}
            markerPrefix={markerPrefix}
            registerNode={registerNode}
            onNodeClick={onNodeClick}
            onNodeKeyDown={onNodeKeyDown}
            onNodeFocus={onNodeFocus}
          />
        </g>
      </svg>

      <div className="absolute top-3 right-3 flex flex-col overflow-hidden rounded-xl border border-line-strong bg-surface/90 shadow-lg backdrop-blur-sm">
        <ZoomButton label="Zoom in" onClick={() => zoomBy(ZOOM_STEP)} disabled={view.k >= MAX_ZOOM - 1e-6}>
          <Plus aria-hidden />
        </ZoomButton>
        <ZoomButton label="Zoom out" onClick={() => zoomBy(1 / ZOOM_STEP)} disabled={view.k <= MIN_ZOOM + 1e-6}>
          <Minus aria-hidden />
        </ZoomButton>
        <ZoomButton label="Show your whole Map" onClick={fit}>
          <Maximize aria-hidden />
        </ZoomButton>
      </div>
    </div>
  );
}

const MARKER_FILLS: Record<Exclude<GraphEdgeStyle, "explored">, string> = {
  demonstrated: "fill-green",
  suggested: "fill-muted",
  user: "fill-accent",
};

const round = (value: number, precision = 10) => Math.round(value * precision) / precision;

function ZoomButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-11 items-center justify-center text-muted transition-colors not-last:border-b not-last:border-line hover:bg-surface-raised hover:text-fg focus-visible:-outline-offset-2 disabled:opacity-40 [&_svg]:size-4"
    >
      {children}
    </button>
  );
}

// --- The drawn graph (memoized: panning and zooming don't re-render it) ---------------

interface GraphLayerProps {
  graph: DiscoveryGraph;
  layout: MapLayout;
  visible: ReadonlySet<NodeRef>;
  selected: NodeRef | null;
  highlighted: ReadonlySet<NodeRef> | null;
  tabStop: NodeRef | null;
  newRefs: ReadonlySet<NodeRef>;
  showAllLabels: boolean;
  labelScale: number;
  minHit: number;
  markerPrefix: string;
  registerNode: (ref: NodeRef, element: SVGGElement | null) => void;
  onNodeClick: (ref: NodeRef) => void;
  onNodeKeyDown: (ref: NodeRef, event: ReactKeyboardEvent<SVGGElement>) => void;
  onNodeFocus: (ref: NodeRef) => void;
}

interface DrawnEdge {
  edge: GraphEdge;
  d: string;
  mid: Point;
  incident: boolean;
}

const pairKey = (a: NodeRef, b: NodeRef) => (a < b ? `${a}\n${b}` : `${b}\n${a}`);
const fixed = (value: number) => Math.round(value * 10) / 10;

function drawEdges(graph: DiscoveryGraph, layout: MapLayout, visible: ReadonlySet<NodeRef>, selected: NodeRef | null): DrawnEdge[] {
  const shown = graph.edges.filter((edge) => visible.has(edge.from) && visible.has(edge.to));
  const pairs = new Map<string, GraphEdge[]>();
  for (const edge of shown) {
    const key = pairKey(edge.from, edge.to);
    const list = pairs.get(key);
    if (list) list.push(edge);
    else pairs.set(key, [edge]);
  }

  const drawn: DrawnEdge[] = [];
  for (const [key, edges] of pairs) {
    const [first, second] = key.split("\n") as [NodeRef, NodeRef];
    const p = layout.positions.get(first);
    const q = layout.positions.get(second);
    if (!p || !q) continue;
    // A normal that's the same whichever way an edge points, so parallel edges fan out evenly.
    const length = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    const normal = { x: -(q.y - p.y) / length, y: (q.x - p.x) / length };
    edges.forEach((edge, index) => {
      const a = layout.positions.get(edge.from) as Point;
      const b = layout.positions.get(edge.to) as Point;
      const fromNode = graph.nodeByRef.get(edge.from);
      const toNode = graph.nodeByRef.get(edge.to);
      const ra = (fromNode ? NODE_RADIUS[fromNode.kind] : 10) + 3;
      const rb = (toNode ? NODE_RADIUS[toNode.kind] : 10) + (isDirectedEdge(edge) ? 5 : 3);
      const offset = (index - (edges.length - 1) / 2) * 26;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const ux = dx / d;
      const uy = dy / d;
      const start = { x: a.x + ux * ra, y: a.y + uy * ra };
      const end = { x: b.x - ux * rb, y: b.y - uy * rb };
      const incident = selected !== null && (edge.from === selected || edge.to === selected);
      if (offset === 0) {
        drawn.push({
          edge,
          d: `M${fixed(start.x)} ${fixed(start.y)}L${fixed(end.x)} ${fixed(end.y)}`,
          mid: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
          incident,
        });
        return;
      }
      const control = { x: (a.x + b.x) / 2 + normal.x * offset * 2, y: (a.y + b.y) / 2 + normal.y * offset * 2 };
      drawn.push({
        edge,
        d: `M${fixed(start.x)} ${fixed(start.y)}Q${fixed(control.x)} ${fixed(control.y)} ${fixed(end.x)} ${fixed(end.y)}`,
        mid: { x: 0.25 * start.x + 0.5 * control.x + 0.25 * end.x, y: 0.25 * start.y + 0.5 * control.y + 0.25 * end.y },
        incident,
      });
    });
  }
  // Faint structural links first, then the learner's and the content's connections on top; the selected node's edges last.
  const order: Record<GraphEdgeStyle, number> = { explored: 0, suggested: 1, demonstrated: 2, user: 3 };
  return drawn.sort((x, y) => Number(x.incident) - Number(y.incident) || order[x.edge.style] - order[y.edge.style]);
}

const LABEL_HALO = { paintOrder: "stroke", stroke: "var(--surface-sunken)", strokeWidth: 3.5, strokeLinejoin: "round" } as const;

const GraphLayer = memo(function GraphLayer({
  graph,
  layout,
  visible,
  selected,
  highlighted,
  tabStop,
  newRefs,
  showAllLabels,
  labelScale,
  minHit,
  markerPrefix,
  registerNode,
  onNodeClick,
  onNodeKeyDown,
  onNodeFocus,
}: GraphLayerProps) {
  const edges = useMemo(() => drawEdges(graph, layout, visible, selected), [graph, layout, visible, selected]);

  // Draw the selected node and its neighbors last, so they sit on top.
  const nodes = useMemo(() => {
    const shown = graph.nodes.filter((node) => visible.has(node.ref));
    const rank = (ref: NodeRef) => (ref === selected ? 2 : highlighted?.has(ref) ? 1 : 0);
    return shown.map((node, index) => ({ node, index })).sort((a, b) => rank(a.node.ref) - rank(b.node.ref) || a.index - b.index).map(({ node }) => node);
  }, [graph, visible, selected, highlighted]);

  const dimming = selected !== null;

  return (
    <>
      <g aria-hidden fill="none" strokeLinecap="round">
        {edges.map(({ edge, d, incident }) => {
          const look = EDGE_LOOKS[edge.style];
          const directed = isDirectedEdge(edge);
          return (
            <path
              key={edge.id}
              d={d}
              className={cn(
                look.className,
                "motion-on:transition-opacity motion-on:duration-300",
                dimming && !incident && "opacity-15",
                !dimming && edge.style === "suggested" && "opacity-70",
                !dimming && edge.style === "demonstrated" && "opacity-80",
              )}
              strokeWidth={incident ? look.width + 0.75 : look.width}
              strokeDasharray={look.dash}
              markerEnd={directed && edge.style !== "explored" ? `url(#${markerPrefix}-${look.marker})` : undefined}
            />
          );
        })}
      </g>

      <g aria-hidden>
        {edges
          .filter((entry) => entry.incident)
          .map(({ edge, mid }) => (
            <text
              key={edge.id}
              x={fixed(mid.x)}
              y={fixed(mid.y)}
              dy="0.35em"
              textAnchor="middle"
              className="pointer-events-none fill-muted font-medium"
              style={{ ...LABEL_HALO, fontSize: 10 * labelScale }}
            >
              {edgeShortLabel(edge)}
            </text>
          ))}
      </g>

      <g>
        {nodes.map((node) => {
          const point = layout.positions.get(node.ref);
          if (!point) return null;
          const r = NODE_RADIUS[node.kind];
          const isSelected = node.ref === selected;
          const isNear = highlighted?.has(node.ref) ?? false;
          const isNew = newRefs.has(node.ref);
          const keyNode = node.kind === "investigation" || node.kind === "attribute" || node.ref.startsWith("question:primary-");
          const showLabel = showAllLabels || isSelected || isNear || keyNode || node.ref === tabStop;
          const lines = layout.labels.get(node.ref) ?? [node.label];
          const lineHeight = 13 * labelScale;
          return (
            <g
              key={node.ref}
              ref={(element) => registerNode(node.ref, element)}
              data-node={node.ref}
              transform={`translate(${point.x} ${point.y})`}
              role="button"
              tabIndex={node.ref === tabStop ? 0 : -1}
              aria-label={nodeAccessibleName(node, { isNew, selected: isSelected })}
              aria-current={isSelected ? "true" : undefined}
              className={cn(
                "group cursor-pointer outline-none motion-on:transition-opacity motion-on:duration-300",
                dimming && !isSelected && !isNear && "opacity-35",
              )}
              onClick={() => onNodeClick(node.ref)}
              onKeyDown={(event) => onNodeKeyDown(node.ref, event)}
              onFocus={() => onNodeFocus(node.ref)}
            >
              <title>{node.label}</title>
              <circle r={Math.max(r + 8, minHit)} className="fill-transparent" />
              {isNew && (
                <circle
                  r={r + 7}
                  className="motion-pulse-new fill-none stroke-accent/60"
                  strokeWidth={1.5}
                  style={{ transformBox: "fill-box", transformOrigin: "center" }}
                />
              )}
              <circle r={r + 7} className="fill-none stroke-accent opacity-0 group-focus-visible:opacity-100" strokeWidth={2.5} />
              {isSelected && <circle r={r + 4.5} className="motion-success fill-accent-soft stroke-fg" strokeWidth={1.5} />}
              <NodeGlyph kind={node.kind} r={r} strokeWidth={isSelected ? 2.25 : 1.75} />
              {isNew && <circle cx={r * 0.85} cy={-r * 0.85} r={3.5} className="fill-accent stroke-surface" strokeWidth={1.5} />}
              {showLabel && (
                <text
                  y={r + 6 + 10 * labelScale}
                  textAnchor="middle"
                  className={cn("pointer-events-none font-medium", isSelected ? "fill-fg" : "fill-fg/90", node.kind === "investigation" && "font-semibold")}
                  style={{ ...LABEL_HALO, fontSize: 11 * labelScale }}
                >
                  {lines.map((line, index) => (
                    // A space between lines keeps the label's text in words ("Christ the", not "Christthe").
                    <Fragment key={index}>
                      {index > 0 && " "}
                      <tspan x={0} dy={index === 0 ? 0 : lineHeight}>
                        {line}
                      </tspan>
                    </Fragment>
                  ))}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </>
  );
});
