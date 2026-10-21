"use client";

import { Lightbulb, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { DiscoveryHighlight, Investigation } from "@/domain/investigation";
import { evidenceLabels } from "../evidence/evidence-label";
import type { InvestigationActions } from "../use-investigation";
import { DiscoveryDialog } from "./discovery-dialog";

export const DISCOVERIES_HEADING_ID = "discoveries-heading";

/** The discoveries saved during this investigation, for review while writing a conclusion. */
export function DiscoveryList({ investigation, actions }: { investigation: Investigation; actions: InvestigationActions }) {
  const [editing, setEditing] = useState<DiscoveryHighlight | null>(null);
  const { discoveryHighlights: highlights, evidence } = investigation;
  const labels = evidenceLabels(evidence);
  const cards = new Map(evidence.map((card) => [card.id, card]));

  return (
    <section aria-labelledby={DISCOVERIES_HEADING_ID} className="flex flex-col gap-3">
      <div>
        <h3
          id={DISCOVERIES_HEADING_ID}
          tabIndex={-1}
          className="flex scroll-mt-40 items-center gap-2 text-sm font-semibold text-fg focus:outline-none"
        >
          <Lightbulb aria-hidden className="size-4 text-accent" />
          Your discoveries
          {highlights.length > 0 && <span className="font-normal text-subtle">({highlights.length})</span>}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-subtle">
          Insights you saved along the way, to review as you write your conclusion.
        </p>
      </div>

      {highlights.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong px-4 py-3 text-sm leading-relaxed text-muted">
          Nothing saved yet. Whenever something stands out, use <span className="text-fg">Save discovery</span> (the
          lightbulb beside the steps) and it will gather here.
        </p>
      ) : (
        <ul aria-label="Your discoveries" className="flex flex-col gap-2">
          {highlights.map((highlight) => {
            const linked = highlight.evidenceIds.filter((id) => cards.has(id));
            return (
              <li key={highlight.id} className="rounded-lg border border-line bg-surface-sunken/40 p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-medium break-words text-fg">{highlight.title}</h4>
                    {highlight.insight && (
                      <p className="mt-1 line-clamp-3 text-sm leading-relaxed break-words whitespace-pre-line text-muted">
                        {highlight.insight}
                      </p>
                    )}
                    {linked.length > 0 && (
                      <ul aria-label={`Evidence related to ${highlight.title}`} className="mt-2 flex flex-wrap gap-1.5">
                        {linked.map((id) => (
                          <li
                            key={id}
                            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-xs text-muted"
                          >
                            <span className="font-mono text-accent">{labels.get(id)}</span>
                            <span className="truncate">{cards.get(id)?.sourceTitle}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-8 px-0"
                      aria-label={`Edit discovery: ${highlight.title}`}
                      onClick={() => setEditing(highlight)}
                    >
                      <Pencil aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-8 px-0 hover:text-danger"
                      aria-label={`Delete discovery: ${highlight.title}`}
                      onClick={() => actions.removeHighlight(highlight.id)}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <DiscoveryDialog
        open={editing !== null}
        title="Edit discovery"
        submitLabel="Save changes"
        initial={editing ?? undefined}
        evidence={evidence}
        labels={labels}
        onSubmit={(input) => {
          if (editing) actions.updateHighlight(editing.id, input);
          setEditing(null);
        }}
        onClose={() => setEditing(null)}
      />
    </section>
  );
}
