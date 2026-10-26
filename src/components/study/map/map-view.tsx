"use client";

import { BookOpenText, FileWarning, FlaskConical, List, MousePointerClick, NotebookText, Plus, Waypoints } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { StorageErrorState } from "@/components/investigations/storage-error-state";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedControl, type SegmentedOption } from "@/components/ui/segmented-control";
import { buildDiscoveryGraph, nodesNewSince } from "@/domain/study/graph";
import type { DiscoveryCard, PersonalConnection } from "@/domain/study/user-data";
import { isNodeRef, NODE_KIND_LABELS, NODE_KINDS, type NodeKind, type NodeRef } from "@/domain/study/vocabulary";
import { cn } from "@/lib/cn";
import { readPreferences, updatePreferences } from "@/lib/preferences";
import { explorerHref, investigateHref, mapHref, notebookHref } from "@/lib/routes";
import { useDiscoveryCards, usePersonalConnections } from "@/persistence/study-hooks";
import { ConnectionDialog, type ConnectionEditor } from "./connection-dialog";
import { DeleteConnectionDialog } from "./delete-connection-dialog";
import { MapCanvas, type MapCanvasHandle } from "./map-canvas";
import { computeMapLayout } from "./map-layout";
import { listItemId, MapListView } from "./map-list-view";
import { NodePanel } from "./node-panel";
import { EDGE_LEGEND, EdgeSwatch, KindSwatch } from "./node-style";

const NO_CARDS: DiscoveryCard[] = [];
const NO_CONNECTIONS: PersonalConnection[] = [];

type ViewMode = "graph" | "list";

const VIEW_OPTIONS: readonly SegmentedOption<ViewMode>[] = [
  { value: "graph", label: "Map", icon: Waypoints },
  { value: "list", label: "List view", icon: List },
];

/**
 * The Discovery Map (/map, optionally ?node=kind:id). Computed from the
 * learner's Discovery Cards and their own connections, never prepopulated:
 * it grows only from what they actually discover.
 */
export function MapView() {
  const router = useRouter();
  const nodeParam = useSearchParams().get("node");
  const cardsState = useDiscoveryCards();
  const connectionsState = usePersonalConnections();
  const hintId = useId();
  const canvas = useRef<MapCanvasHandle>(null);

  // Captured once: the node to open on, and the previous visit (so new nodes stay marked during this one).
  const [initialFocus] = useState<NodeRef | null>(() => (isNodeRef(nodeParam) ? nodeParam : null));
  const [since] = useState<string | undefined>(() => (typeof window === "undefined" ? undefined : readPreferences().lastMapVisit));
  const [mode, setMode] = useState<ViewMode>("graph");
  const [hiddenKinds, setHiddenKinds] = useState<ReadonlySet<NodeKind>>(() => new Set());
  const [editor, setEditor] = useState<ConnectionEditor | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<PersonalConnection | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const cards = useMemo(() => (cardsState.status === "ready" ? cardsState.value.records : NO_CARDS), [cardsState]);
  const connections = useMemo(() => (connectionsState.status === "ready" ? connectionsState.value.records : NO_CONNECTIONS), [connectionsState]);
  const graph = useMemo(() => buildDiscoveryGraph(cards, connections), [cards, connections]);
  const layout = useMemo(() => computeMapLayout(graph), [graph]);
  const cardsById = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);
  const newRefs = useMemo(() => nodesNewSince(graph, since), [graph, since]);
  const kindCounts = useMemo(() => {
    const counts = new Map<NodeKind, number>();
    for (const node of graph.nodes) counts.set(node.kind, (counts.get(node.kind) ?? 0) + 1);
    return counts;
  }, [graph]);

  const selected = isNodeRef(nodeParam) && graph.nodeByRef.has(nodeParam) ? nodeParam : null;
  const selectedNode = selected ? graph.nodeByRef.get(selected) : undefined;
  const visible = useMemo(
    () => new Set(graph.nodes.filter((node) => !hiddenKinds.has(node.kind) || node.ref === selected).map((node) => node.ref)),
    [graph, hiddenKinds, selected],
  );

  const ready = cardsState.status === "ready" && connectionsState.status === "ready";

  // Remember this visit once the map has been shown, for marking what's new next time.
  useEffect(() => {
    if (ready) updatePreferences({ lastMapVisit: new Date().toISOString() });
  }, [ready]);

  const labelOf = (ref: NodeRef) => graph.nodeByRef.get(ref)?.label ?? ref;

  const select = (ref: NodeRef) => {
    router.replace(mapHref(ref), { scroll: false });
    setAnnouncement(`Showing details for ${labelOf(ref)}.`);
  };

  const navigate = (ref: NodeRef) => {
    select(ref);
    if (mode === "graph") canvas.current?.centerOn(ref);
    else document.getElementById(listItemId(ref))?.scrollIntoView({ block: "nearest" });
  };

  const deselect = () => {
    const previous = selected;
    router.replace(mapHref(), { scroll: false });
    setAnnouncement("Details closed.");
    if (!previous) return;
    // Give focus back to the node (or its list entry) the details belonged to.
    requestAnimationFrame(() => {
      if (mode === "graph") canvas.current?.focusNode(previous);
      else document.getElementById(listItemId(previous))?.focus();
    });
  };

  const openEditor = (value: ConnectionEditor) => {
    setEditorKey((key) => key + 1);
    setEditor(value);
  };

  const toggleKind = (kind: NodeKind) => {
    const next = new Set(hiddenKinds);
    if (next.has(kind)) next.delete(kind);
    else next.add(kind);
    setHiddenKinds(next);
    setAnnouncement(`${next.has(kind) ? "Hiding" : "Showing"} ${NODE_KIND_LABELS[kind].toLowerCase()} items.`);
  };

  const header = (
    <PageHeader
      eyebrow="Discovery Map"
      title="Your map of understanding"
      description="It grows only from what you discover. Select anything to see how it connects, and why."
      actions={
        <ButtonLink href={notebookHref()} variant="secondary">
          <NotebookText aria-hidden />
          Notebook
        </ButtonLink>
      }
    />
  );

  if (cardsState.status === "error" || connectionsState.status === "error") {
    const error = cardsState.status === "error" ? cardsState.error : connectionsState.status === "error" ? connectionsState.error : null;
    return (
      <div className="flex flex-col gap-8">
        {header}
        {error && <StorageErrorState error={error} />}
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <MapSkeleton />
      </div>
    );
  }

  if (graph.nodes.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <MapEmptyState />
      </div>
    );
  }

  const unreadable = cardsState.value.unreadable + connectionsState.value.unreadable;
  const missing = nodeParam !== null && selected === null;
  const kinds = NODE_KINDS.filter((kind) => (kindCounts.get(kind) ?? 0) > 0);

  return (
    <div className="flex flex-col gap-6">
      {header}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {unreadable > 0 && (
        <p role="status" className="flex items-start gap-2 rounded-lg border border-amber/40 bg-amber-soft px-4 py-3 text-sm text-fg">
          <FileWarning aria-hidden className="mt-0.5 size-4 shrink-0 text-amber" />
          {unreadable === 1 ? "One saved record" : `${unreadable} saved records`} couldn&rsquo;t be read and{" "}
          {unreadable === 1 ? "isn't" : "aren't"} on the map. Nothing has been deleted.
        </p>
      )}

      {missing && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line-strong bg-surface px-4 py-3 text-sm text-muted">
          <span>That isn&rsquo;t on your map yet. It appears once one of your discoveries includes it.</span>
          <Button variant="ghost" size="sm" className="h-11 sm:h-8" onClick={() => router.replace(mapHref(), { scroll: false })}>
            Dismiss
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl
            label="View as"
            options={VIEW_OPTIONS}
            value={mode}
            onChange={setMode}
            className="w-full min-[480px]:w-auto"
          />
          {newRefs.size > 0 && (
            <p className="flex items-center gap-2 text-sm text-muted">
              <span aria-hidden className="motion-pulse-new inline-block size-2 rounded-full bg-accent" />
              {newRefs.size} new since your last visit
            </p>
          )}
          <Button onClick={() => openEditor({ mode: "create", from: selected })} disabled={graph.nodes.length < 2} className="h-11 sm:h-10">
            <Plus aria-hidden />
            Add a connection
          </Button>
        </div>
        <div role="group" aria-label="Show on the map" className="flex flex-wrap gap-2">
          {kinds.map((kind) => {
            const shown = !hiddenKinds.has(kind);
            return (
              <button
                key={kind}
                type="button"
                aria-pressed={shown}
                onClick={() => toggleKind(kind)}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm transition-colors sm:min-h-9",
                  shown ? "border-line-strong bg-surface-raised text-fg hover:border-accent/50" : "border-dashed border-line text-subtle line-through decoration-subtle/60 hover:text-muted",
                )}
              >
                <KindSwatch kind={kind} className={cn(!shown && "opacity-40")} />
                {NODE_KIND_LABELS[kind]}
                <span className="text-xs text-subtle">{kindCounts.get(kind)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="flex min-w-0 flex-col gap-3">
          <div hidden={mode !== "graph"} className="flex flex-col gap-2">
            <MapCanvas
              handle={canvas}
              graph={graph}
              layout={layout}
              visible={visible}
              selected={selected}
              newRefs={newRefs}
              initialFocus={initialFocus}
              onSelect={select}
              onDeselect={deselect}
              describedBy={hintId}
            />
            <p id={hintId} className="text-xs leading-relaxed text-subtle">
              Drag to move around; pinch, scroll, or use + and − to zoom. With a keyboard, Tab to the map, use the arrow
              keys to move between items, Enter to see details, and Escape to close them. Prefer reading? Choose{" "}
              <button type="button" className="text-accent underline-offset-2 hover:underline" onClick={() => setMode("list")}>
                List view
              </button>
              .
            </p>
          </div>
          {mode === "list" && <MapListView graph={graph} visible={visible} newRefs={newRefs} selected={selected} onSelect={select} />}
          <ul aria-label="Line styles" className="flex flex-wrap gap-x-5 gap-y-2 pt-1 text-xs text-muted">
            {EDGE_LEGEND.map(({ style, label }) => (
              <li key={style} className="inline-flex items-center gap-2">
                <EdgeSwatch style={style} />
                {label}
              </li>
            ))}
          </ul>
        </div>

        {selectedNode ? (
          <NodePanel
            key={selectedNode.ref}
            graph={graph}
            node={selectedNode}
            cardsById={cardsById}
            isNew={newRefs.has(selectedNode.ref)}
            onClose={deselect}
            onNavigate={navigate}
            onConnect={(from) => openEditor({ mode: "create", from })}
            onEditConnection={(connection) => openEditor({ mode: "edit", connection })}
            onDeleteConnection={setPendingDelete}
          />
        ) : (
          <aside aria-label="About the map" className="hidden flex-col gap-4 rounded-2xl border border-dashed border-line-strong p-5 lg:sticky lg:top-6 lg:flex">
            <div className="flex items-start gap-3">
              <MousePointerClick aria-hidden className="mt-0.5 size-5 shrink-0 text-accent" />
              <p className="text-sm leading-relaxed text-muted">
                Select anything on the map to see where you found it, what it connects to, and why.
              </p>
            </div>
            <ul aria-label="Kinds of items" className="flex flex-col gap-2 text-sm text-muted">
              {kinds.map((kind) => (
                <li key={kind} className="flex items-center gap-2.5">
                  <KindSwatch kind={kind} />
                  {NODE_KIND_LABELS[kind]}
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>

      <ConnectionDialog
        key={editorKey}
        graph={graph}
        editor={editor}
        onClose={() => setEditor(null)}
        onSaved={(connection, created) => {
          setEditor(null);
          setAnnouncement(created ? "Your connection was added to the map." : "Your connection was saved.");
          if (!selected) select(connection.from.ref);
        }}
      />
      <DeleteConnectionDialog
        connection={pendingDelete}
        labelFor={(ref) => graph.nodeByRef.get(ref)?.label}
        onClose={() => setPendingDelete(null)}
        onDeleted={() => {
          setPendingDelete(null);
          setAnnouncement("Your connection was deleted.");
        }}
      />
    </div>
  );
}

function MapEmptyState() {
  return (
    <EmptyState
      icon={Waypoints}
      headingLevel={2}
      title="Your map grows from your discoveries"
      description="Nothing is drawn here ahead of time. As you finish investigations and explore scripture, the concepts, verses, and questions you work with appear, connected the way you found them. You can add connections of your own, too."
      action={
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href={investigateHref()}>
            <FlaskConical aria-hidden />
            Start an investigation
          </ButtonLink>
          <ButtonLink href={explorerHref()} variant="secondary">
            <BookOpenText aria-hidden />
            Explore scripture
          </ButtonLink>
        </div>
      }
      className="bg-surface py-16"
    />
  );
}

export function MapSkeleton() {
  return (
    <div role="status" aria-label="Loading your map" className="flex animate-pulse flex-col gap-4">
      <div className="h-24 rounded-xl bg-surface" />
      <div className="h-[min(60dvh,40rem)] min-h-[20rem] rounded-2xl border border-line bg-surface" />
    </div>
  );
}
