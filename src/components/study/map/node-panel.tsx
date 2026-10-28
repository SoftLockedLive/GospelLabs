"use client";

import { ArrowRight, ChevronDown, Link2, Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ORIGIN_ICONS, ORIGIN_LINK_LABELS, originHref } from "@/components/study/notebook/origin";
import { CardSourceRow } from "@/components/study/notebook/card-source";
import { ProvenanceLabel } from "@/components/study/shared/provenance";
import { SourceLink } from "@/components/study/shared/source-card";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { otherEnd, type DiscoveryGraph, type GraphEdge, type GraphNode } from "@/domain/study/graph";
import { ORIGIN_LABELS } from "@/domain/study/notebook";
import type { DiscoveryCard, PersonalConnection } from "@/domain/study/user-data";
import { NODE_KIND_LABELS, type NodeRef } from "@/domain/study/vocabulary";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { characterHref, notebookHref, studyInvestigationHref } from "@/lib/routes";
import { edgeSentence, orderedEdges } from "./describe";
import { KIND_TONES, KindSwatch } from "./node-style";

interface NodePanelProps {
  graph: DiscoveryGraph;
  node: GraphNode;
  cardsById: ReadonlyMap<string, DiscoveryCard>;
  isNew: boolean;
  onClose: () => void;
  /** Select another node (from a link in the panel). */
  onNavigate: (ref: NodeRef) => void;
  onConnect: (from: NodeRef) => void;
  onEditConnection: (connection: PersonalConnection) => void;
  onDeleteConnection: (connection: PersonalConnection) => void;
}

export const NODE_PANEL_TITLE_ID = "map-node-panel-title";

/**
 * Details for the selected node: what it is, where the learner met it, how it
 * connects and why (with notes, sources, and who established each link), and
 * ways back to the original study. A bottom sheet on small screens, a side
 * panel on large ones.
 */
export function NodePanel({ graph, node, cardsById, isNew, onClose, onNavigate, onConnect, onEditConnection, onDeleteConnection }: NodePanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const edges = orderedEdges(graph, node);
  const relationships = edges.filter((edge) => edge.kind !== "explored");
  const explored = edges.filter((edge) => edge.kind === "explored");
  const cards = node.cardIds.flatMap((id) => cardsById.get(id) ?? []);

  return (
    <aside
      aria-labelledby={NODE_PANEL_TITLE_ID}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.defaultPrevented) {
          event.preventDefault();
          onClose();
        }
      }}
      className={cn(
        // Below lg it is a bottom sheet resting on the tab bar (56px items + 1px border + the safe area). The tab bar sits
        // above <main>'s stacking context, so a sheet reaching the screen's bottom edge would hide its last items behind it.
        "motion-reveal fixed inset-x-0 bottom-[calc(3.5rem+1px+env(safe-area-inset-bottom))] z-40 flex max-h-[62dvh] flex-col rounded-t-2xl border-t border-line-strong bg-surface shadow-[0_-12px_40px_-12px_rgb(0_0_0/0.45)]",
        "lg:sticky lg:top-6 lg:bottom-auto lg:z-auto lg:max-h-[calc(100dvh-3rem)] lg:self-start lg:rounded-2xl lg:border lg:shadow-none",
      )}
    >
      <header className="flex items-start gap-3 border-b border-line px-4 pt-3 pb-3 sm:px-5 lg:pt-4">
        <div className="min-w-0 flex-1">
          <p className={cn("flex flex-wrap items-center gap-2 text-xs font-medium", KIND_TONES[node.kind].text)}>
            <KindSwatch kind={node.kind} />
            {NODE_KIND_LABELS[node.kind]}
            {isNew && (
              <Badge tone="accent" className="motion-pulse-new">
                New since your last visit
              </Badge>
            )}
          </p>
          <h2 id={NODE_PANEL_TITLE_ID} className="mt-1.5 text-lg leading-snug font-semibold tracking-tight break-words text-fg">
            {node.label}
          </h2>
          {node.discovered && <ProvenanceLabel provenance="demonstrated" className="mt-1" />}
        </div>
        <div className="-mr-2 flex shrink-0 items-center">
          <button
            type="button"
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Show details" : "Minimize details"}
            onClick={() => setCollapsed((value) => !value)}
            className="flex size-11 items-center justify-center rounded-lg text-subtle hover:bg-surface-raised hover:text-fg lg:hidden"
          >
            <ChevronDown aria-hidden className={cn("size-5 motion-on:transition-transform", collapsed && "rotate-180")} />
          </button>
          <button
            type="button"
            aria-label="Close details"
            onClick={onClose}
            className="flex size-11 items-center justify-center rounded-lg text-subtle hover:bg-surface-raised hover:text-fg"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
      </header>

      <div className={cn("flex flex-col gap-6 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5", collapsed && "hidden lg:flex")}>
        <OpenLinks node={node} />

        <PanelSection title="In your Notebook">
          {cards.length === 0 ? (
            <p className="text-sm text-muted">
              Not part of any saved discovery right now. It&rsquo;s here because of a connection you made.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {cards.map((card) => {
                const Icon = ORIGIN_ICONS[card.origin.kind];
                return (
                  <li key={card.id}>
                    <Link
                      href={notebookHref(card.id)}
                      className="group flex min-h-11 items-center gap-3 rounded-lg border border-line px-3 py-2 transition-colors hover:border-accent/40 hover:bg-surface-raised"
                    >
                      <Icon aria-hidden className="size-4 shrink-0 text-accent" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-fg group-hover:text-accent">{card.title}</span>
                        <span className="block text-xs text-subtle">
                          {ORIGIN_LABELS[card.origin.kind]} · {formatDate(card.createdAt)}
                        </span>
                      </span>
                      <ArrowRight aria-hidden className="size-4 shrink-0 text-subtle" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </PanelSection>

        <PanelSection
          title="Why it’s connected"
          action={
            <Button variant="ghost" size="sm" className="h-11 sm:h-8" onClick={() => onConnect(node.ref)}>
              <Plus aria-hidden />
              Connect
            </Button>
          }
        >
          {relationships.length === 0 ? (
            <p className="text-sm text-muted">
              No relationships recorded yet. Use <span className="text-fg">Connect</span> to add one in your own words.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {relationships.map((edge) => (
                <li key={edge.id}>
                  <RelationshipItem
                    graph={graph}
                    edge={edge}
                    cardsById={cardsById}
                    current={node.ref}
                    onNavigate={onNavigate}
                    onEdit={onEditConnection}
                    onDelete={onDeleteConnection}
                  />
                </li>
              ))}
            </ul>
          )}
        </PanelSection>

        {explored.length > 0 && (
          <PanelSection title={node.origins.length > 0 ? "Explored here" : "Explored in"}>
            <p className="-mt-1 mb-2 text-xs leading-relaxed text-subtle">
              Studied together in the same discovery. This isn&rsquo;t a stated relationship.
            </p>
            <ul className="flex flex-wrap gap-2">
              {explored.map((edge) => {
                const other = graph.nodeByRef.get(otherEnd(edge, node.ref));
                if (!other) return null;
                return (
                  <li key={edge.id} className="max-w-full">
                    <button
                      type="button"
                      onClick={() => onNavigate(other.ref)}
                      className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-line-strong px-3 text-sm text-fg transition-colors hover:border-accent/50 hover:bg-surface-raised sm:min-h-9"
                    >
                      <KindSwatch kind={other.kind} className="size-3.5" />
                      <span className="truncate">{other.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </PanelSection>
        )}
      </div>
    </aside>
  );
}

function PanelSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="kicker text-muted">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Ways back to the original study or source. */
function OpenLinks({ node }: { node: GraphNode }) {
  const links: { href: string; label: string }[] = [];
  if (node.kind === "investigation") links.push({ href: studyInvestigationHref(node.id), label: "Open the investigation" });
  if (node.kind === "attribute") links.push({ href: characterHref(node.id), label: "Open in Character of Christ" });
  for (const origin of node.origins) {
    if (origin.kind === "passage" || origin.kind === "connect") links.push({ href: originHref(origin), label: ORIGIN_LINK_LABELS[origin.kind] });
  }
  const unique = links.filter((link, index) => links.findIndex((other) => other.href === link.href) === index);
  const source = node.kind === "scripture" && node.source?.url ? node.source : null;
  if (unique.length === 0 && !source) return null;
  return (
    <div className="flex flex-col gap-2">
      {unique.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {unique.map((link) => (
            <ButtonLink key={link.href} href={link.href} variant="secondary" className="h-11 sm:h-10">
              {link.label}
              <ArrowRight aria-hidden />
            </ButtonLink>
          ))}
        </div>
      )}
      {source?.url && <SourceLink source={{ url: source.url, label: source.label }}>Read {source.label}</SourceLink>}
    </div>
  );
}

interface RelationshipItemProps {
  graph: DiscoveryGraph;
  edge: GraphEdge;
  cardsById: ReadonlyMap<string, DiscoveryCard>;
  current: NodeRef;
  onNavigate: (ref: NodeRef) => void;
  onEdit: (connection: PersonalConnection) => void;
  onDelete: (connection: PersonalConnection) => void;
}

function RelationshipItem({ graph, edge, cardsById, current, onNavigate, onEdit, onDelete }: RelationshipItemProps) {
  const { subject, phrase, object } = edgeSentence(edge);
  const name = (ref: NodeRef) => {
    const node = graph.nodeByRef.get(ref);
    const label = node?.label ?? ref;
    if (ref === current) return <span className="font-medium text-fg">{label}</span>;
    return (
      <button
        type="button"
        onClick={() => onNavigate(ref)}
        className="rounded-sm text-left font-medium text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
      >
        {label}
      </button>
    );
  };

  return (
    <article className={cn("rounded-xl border p-3.5", edge.kind === "personal" ? "border-accent/30 bg-accent-soft/40" : "border-line bg-surface-sunken/40")}>
      <p className="flex items-start gap-2 text-sm leading-relaxed text-muted">
        <Link2 aria-hidden className="mt-1 size-3.5 shrink-0 text-subtle" />
        <span>
          {name(subject)} {phrase} {name(object)}
        </span>
      </p>

      {edge.kind === "personal" && edge.personal ? (
        <div className="mt-2.5 flex flex-col gap-2">
          <ProvenanceLabel provenance="user" />
          <p className="text-sm leading-relaxed break-words whitespace-pre-line text-fg">{edge.personal.note}</p>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-11 sm:h-8" onClick={() => edge.personal && onEdit(edge.personal)}>
              <Pencil aria-hidden />
              Edit
            </Button>
            <Button variant="ghost" size="sm" className="h-11 text-danger hover:text-danger sm:h-8" onClick={() => edge.personal && onDelete(edge.personal)}>
              <Trash2 aria-hidden />
              Delete
            </Button>
          </div>
        </div>
      ) : (
        <ul className="mt-2.5 flex flex-col gap-3">
          {edge.evidence.map((evidence) => {
            const card = cardsById.get(evidence.cardId);
            return (
              <li key={evidence.cardId} className="flex flex-col gap-1.5 border-t border-line pt-2.5 first:border-t-0 first:pt-0">
                <ProvenanceLabel provenance={evidence.provenance} />
                {evidenceNote(edge, evidence.note) && <p className="text-sm leading-relaxed text-fg">{evidenceNote(edge, evidence.note)}</p>}
                {evidence.sources.length > 0 && (
                  <ul className="flex flex-col gap-1.5">
                    {evidence.sources.map((source) => (
                      <li key={source.id}>
                        <CardSourceRow source={source} compact />
                      </li>
                    ))}
                  </ul>
                )}
                {card && (
                  <Link href={notebookHref(card.id)} className="inline-flex min-h-11 w-fit items-center gap-1 rounded-sm text-xs text-subtle hover:text-accent sm:min-h-0">
                    From “{card.title}”
                    <ArrowRight aria-hidden className="size-3" />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

/** The evidence's note, or an explanation for the primary-question link (which has none of its own). */
function evidenceNote(edge: GraphEdge, note: string): string {
  if (note.trim()) return note;
  if (edge.relation === "rests-on" && edge.to.startsWith("question:primary-")) {
    return "The investigation names this as the primary question it ultimately rests on.";
  }
  return "";
}
