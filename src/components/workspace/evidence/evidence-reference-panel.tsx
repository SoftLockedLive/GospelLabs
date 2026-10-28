"use client";

import { ArrowRight, ChevronDown, FileText } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Investigation } from "@/domain/investigation";
import { countCitations } from "@/domain/investigation-reducer";
import { evidenceLabels } from "./evidence-label";

interface EvidenceReferencePanelProps {
  investigation: Investigation;
  onManage: () => void;
}

/** Whether the panel was last left open, so it stays that way between Analysis and Conclusion. */
let rememberedOpen = false;

/**
 * The investigation's evidence for reference while writing in Analysis and
 * Conclusion: a collapsible panel above the content, so the writing area
 * keeps the full width.
 */
export function EvidenceReferencePanel({ investigation, onManage }: EvidenceReferencePanelProps) {
  const [open, setOpen] = useState(rememberedOpen);
  const { evidence } = investigation;
  const labels = evidenceLabels(evidence);
  const citations = countCitations(investigation);

  return (
    <details
      open={open}
      onToggle={(event) => {
        rememberedOpen = event.currentTarget.open;
        setOpen(rememberedOpen);
      }}
      className="group rounded-xl border border-line bg-surface-sunken/60"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm text-fg [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 font-medium">
          <FileText aria-hidden className="size-4 text-accent" />
          Your evidence
          <span className="font-normal text-subtle">({evidence.length})</span>
        </span>
        <ChevronDown aria-hidden className="size-4 text-subtle transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-line px-4 py-3">
        {evidence.length === 0 ? (
          <p className="text-sm leading-relaxed text-subtle">No evidence yet. Cards you add in Research appear here.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {evidence.map((card) => {
              const count = citations.get(card.id) ?? 0;
              return (
                <li key={card.id} className="min-w-0 text-sm">
                  <span className="mr-2 font-semibold tabular-nums text-muted">{labels.get(card.id)}</span>
                  <span className="break-words text-fg">{card.sourceTitle}</span>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-subtle">{card.observation}</p>
                  <p className="mt-0.5 text-[11px] text-subtle">
                    {count === 0 ? "Not cited yet" : `Cited by ${count} ${count === 1 ? "claim" : "claims"}`}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        <Button variant="ghost" size="sm" className="mt-2 -ml-3" onClick={onManage}>
          {evidence.length === 0 ? "Go to Research" : "Manage in Research"}
          <ArrowRight aria-hidden />
        </Button>
      </div>
    </details>
  );
}
