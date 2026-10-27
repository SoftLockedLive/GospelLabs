"use client";

/**
 * How the attributes connect. On wider screens a small diagram shows every
 * attribute and the links the sources make between them; the list beside it
 * carries the same information in words, with notes and sources, and is what
 * keyboard and screen-reader users (and everyone on a phone) use. Choosing an
 * attribute narrows both to its connections. On a phone the full list (every
 * connection, many screens long) waits behind a "Show …" button; one
 * attribute's connections always show.
 */
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { SourceKindBadge } from "@/components/study/shared/provenance";
import { SourceLink } from "@/components/study/shared/source-card";
import { circleLayout, type AttributeEdge } from "@/domain/study/character";
import type { Source } from "@/domain/study/content-schema";
import { RELATION_PHRASES } from "@/domain/study/vocabulary";
import { cn } from "@/lib/cn";
import { characterHref } from "@/lib/routes";
import { COLLAPSES_ON_PHONES, isSafetyNote } from "./collapse";
import { PhoneCollapse } from "./phone-collapse";

export type CitedSource = Pick<Source, "id" | "label" | "url" | "kind">;

interface AttributeConnectionsProps {
  attributes: readonly { id: string; name: string }[];
  edges: readonly AttributeEdge[];
  sources: Readonly<Record<string, CitedSource>>;
}

const VIEW = { width: 520, height: 400 };
const CENTER = { x: 260, y: 200 };
const RADIUS = 140;

export function AttributeConnections({ attributes, edges, sources }: AttributeConnectionsProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const titleId = useId();
  const names = Object.fromEntries(attributes.map((attribute) => [attribute.id, attribute.name]));
  const name = (id: string) => names[id] ?? id;
  const positions = circleLayout(
    attributes.map((attribute) => attribute.id),
    CENTER,
    RADIUS,
  );
  const touches = (edge: AttributeEdge, id: string) => edge.a === id || edge.b === id;
  const shown = selected ? edges.filter((edge) => touches(edge, selected)) : edges;
  const neighbors = new Set(shown.flatMap((edge) => [edge.a, edge.b]));
  const safety = shown.map((edge) => edge.links.some((link) => isSafetyNote(link.note, link.sourceIds)));
  const kept = safety.filter(Boolean).length;

  return (
    <div className="flex flex-col gap-5">
      <div role="group" aria-label="Show the connections of" className="flex flex-wrap gap-2">
        <FilterButton pressed={selected === null} onClick={() => setSelected(null)}>
          All
        </FilterButton>
        {attributes.map((attribute) => (
          <FilterButton key={attribute.id} pressed={selected === attribute.id} onClick={() => setSelected(attribute.id)}>
            {attribute.name}
          </FilterButton>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        {/* Visual only: the list holds the same information for everyone. */}
        <figure className="hidden rounded-2xl border border-line bg-surface p-3 sm:block" aria-hidden>
          <svg viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} className="h-auto w-full" role="presentation">
            <g key={selected ?? "all"}>
              {edges.map((edge) => {
                const from = positions[edge.a];
                const to = positions[edge.b];
                if (!from || !to) return null;
                const active = !selected || touches(edge, selected);
                return (
                  <line
                    key={edge.id}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    pathLength={1}
                    className={cn(
                      "transition-opacity duration-300",
                      selected && active ? "motion-draw stroke-accent" : "stroke-line-strong",
                      active ? "opacity-100" : "opacity-25",
                    )}
                    strokeWidth={selected && active ? 2.25 : 1.25}
                    strokeLinecap="round"
                  />
                );
              })}
            </g>
            {attributes.map((attribute) => {
              const point = positions[attribute.id];
              const isSelected = selected === attribute.id;
              const dim = selected !== null && !neighbors.has(attribute.id);
              const label = labelPlacement(point);
              return (
                <g
                  key={attribute.id}
                  onClick={() => setSelected(isSelected ? null : attribute.id)}
                  className={cn("cursor-pointer transition-opacity duration-300", dim && "opacity-40")}
                >
                  <circle cx={point.x} cy={point.y} r={22} className="fill-transparent" />
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={isSelected ? 10 : 8}
                    className={cn(
                      "stroke-node-attribute",
                      isSelected ? "motion-success fill-node-attribute" : "fill-surface",
                    )}
                    strokeWidth={2}
                  />
                  <text
                    x={label.x}
                    y={label.y}
                    textAnchor={label.anchor}
                    className={cn("fill-fg text-[13px]", isSelected ? "font-semibold" : "font-medium")}
                  >
                    {attribute.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </figure>

        <div className="flex flex-col gap-3">
          <h3 id={titleId} className="text-sm font-semibold text-fg" aria-live="polite">
            {selected
              ? `${name(selected)} connects with ${shown.length} ${shown.length === 1 ? "attribute" : "attributes"}`
              : "Every connection the sources make"}
          </h3>
          <PhoneCollapse hidden={selected ? 0 : shown.length - kept} someShown={kept > 0} noun={["connection", "connections"]}>
            <ul aria-labelledby={titleId} className="flex flex-col gap-3">
              {shown.map((edge, index) => (
                <li key={edge.id} className={cn("motion-reveal rounded-xl border border-line bg-surface p-4", !safety[index] && COLLAPSES_ON_PHONES)}>
                  <EdgeDetails edge={edge} name={name} selected={selected} sources={sources} />
                </li>
              ))}
            </ul>
          </PhoneCollapse>
        </div>
      </div>
    </div>
  );
}

function FilterButton({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors",
        pressed ? "border-accent/40 bg-accent-soft text-accent" : "border-line-strong bg-surface text-muted hover:border-accent/40 hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

function EdgeDetails({
  edge,
  name,
  selected,
  sources,
}: {
  edge: AttributeEdge;
  name: (id: string) => string;
  selected: string | null;
  sources: Readonly<Record<string, CitedSource>>;
}) {
  // With an attribute chosen, lead with the other one; otherwise show the pair.
  const other = selected ? (edge.a === selected ? edge.b : edge.a) : null;
  const cited = [...new Set(edge.links.flatMap((link) => link.sourceIds))].map((id) => sources[id]).filter((s): s is CitedSource => !!s);
  return (
    <div className="flex flex-col gap-2">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-fg">
        {other ? (
          <AttributeLinkText id={other} name={name(other)} />
        ) : (
          <>
            <AttributeLinkText id={edge.a} name={name(edge.a)} />
            <span aria-hidden className="text-subtle">
              ·
            </span>
            <AttributeLinkText id={edge.b} name={name(edge.b)} />
          </>
        )}
      </p>
      {edge.links.map((link) => (
        <div key={`${link.from}-${link.relation}-${link.to}`} className="flex flex-col gap-1">
          <p className="text-xs font-medium text-muted">
            {name(link.from)} {RELATION_PHRASES[link.relation]} {name(link.to).toLowerCase()}
          </p>
          <p className="text-sm leading-relaxed text-fg">{link.note}</p>
        </div>
      ))}
      {cited.length > 0 && (
        <ul aria-label="Sources" className="flex flex-col gap-1">
          {cited.map((source) => (
            <li key={source.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <SourceLink source={source} className="text-left">
                {source.label}
              </SourceLink>
              <SourceKindBadge kind={source.kind} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AttributeLinkText({ id, name }: { id: string; name: string }) {
  return (
    <Link href={characterHref(id)} className="inline-flex min-h-11 items-center gap-1 rounded-md text-accent hover:text-accent-strong hover:underline sm:min-h-0">
      {name}
      <ArrowRight aria-hidden className="size-3.5" />
    </Link>
  );
}

/** Where a node's label goes: above the top node, below the bottom ones, and outside on the sides. */
function labelPlacement(point: { x: number; y: number }): { x: number; y: number; anchor: "start" | "middle" | "end" } {
  const dx = point.x - CENTER.x;
  const dy = point.y - CENTER.y;
  if (Math.abs(dx) < RADIUS * 0.3) return { x: point.x, y: dy < 0 ? point.y - 16 : point.y + 26, anchor: "middle" };
  return { x: point.x + (dx > 0 ? 16 : -16), y: point.y + 4.5, anchor: dx > 0 ? "start" : "end" };
}
