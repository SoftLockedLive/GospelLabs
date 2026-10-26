"use client";

import { Search } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import type { GraphNode } from "@/domain/study/graph";
import { matchesTerms, normalizeText, searchTerms } from "@/domain/study/notebook";
import { NODE_KIND_LABELS, type NodeRef } from "@/domain/study/vocabulary";
import { cn } from "@/lib/cn";
import { KindSwatch } from "./node-style";

const MAX_SHOWN = 50;

interface NodePickerProps {
  legend: string;
  nodes: readonly GraphNode[];
  value: NodeRef | null;
  onChange: (ref: NodeRef) => void;
  /** A node that can't be chosen (the other end of the connection). */
  exclude?: NodeRef | null;
  error?: string;
}

/**
 * Chooses one node from the map: a search box narrowing a list of radio
 * buttons (native keyboard support: Tab into the list, arrows to move).
 */
export function NodePicker({ legend, nodes, value, onChange, exclude, error }: NodePickerProps) {
  const id = useId();
  const [query, setQuery] = useState("");
  const errorId = `${id}-error`;

  const { shown, total } = useMemo(() => {
    const terms = searchTerms(query);
    const matches = nodes.filter(
      (node) => node.ref !== exclude && (terms.length === 0 || matchesTerms(normalizeText(`${node.label} ${NODE_KIND_LABELS[node.kind]}`), terms)),
    );
    const list = matches.slice(0, MAX_SHOWN);
    // Keep the current choice visible even when the search hides it.
    const chosen = value ? nodes.find((node) => node.ref === value) : undefined;
    if (chosen && !list.includes(chosen)) list.unshift(chosen);
    return { shown: list, total: matches.length };
  }, [nodes, query, exclude, value]);

  return (
    <fieldset className="flex min-w-0 flex-col gap-2" aria-describedby={error ? errorId : undefined}>
      <legend className="mb-2 text-sm font-medium text-fg">{legend}</legend>
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
        <Input
          type="search"
          aria-label={`Search: ${legend}`}
          placeholder="Search your map"
          className="h-11 pl-9"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="max-h-52 overflow-y-auto rounded-lg border border-line bg-surface-sunken/50">
        {shown.length === 0 ? (
          <p className="px-3 py-3 text-sm text-muted">Nothing on your map matches.</p>
        ) : (
          <ul>
            {shown.map((node) => (
              <li key={node.ref}>
                <label
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-3 border-b border-line px-3 py-2 text-sm last:border-b-0 hover:bg-surface-raised",
                    value === node.ref && "bg-accent-soft",
                  )}
                >
                  <input
                    type="radio"
                    name={`${id}-node`}
                    value={node.ref}
                    checked={value === node.ref}
                    onChange={() => onChange(node.ref)}
                    className="size-4 shrink-0 accent-accent"
                  />
                  <KindSwatch kind={node.kind} />
                  <span className="min-w-0 flex-1 break-words text-fg">{node.label}</span>
                  <span className="hidden shrink-0 text-xs text-subtle min-[420px]:inline">{NODE_KIND_LABELS[node.kind]}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
      {total > MAX_SHOWN && (
        <p className="text-xs text-subtle">
          Showing {MAX_SHOWN} of {total}. Search to find others.
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
