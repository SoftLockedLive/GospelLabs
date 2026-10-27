"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { EvidenceCard } from "@/domain/investigation";
import { cn } from "@/lib/cn";

interface EvidencePickerProps {
  claimLabel: string;
  evidence: EvidenceCard[];
  labels: Map<string, string>;
  linkedIds: readonly string[];
  onToggle: (evidenceId: string, linked: boolean) => void;
  onDone: () => void;
  onGoToResearch: () => void;
}

/** Inline checklist for choosing which evidence cards support a claim. */
export function EvidencePicker({
  claimLabel,
  evidence,
  labels,
  linkedIds,
  onToggle,
  onDone,
  onGoToResearch,
}: EvidencePickerProps) {
  const focusOnMount = useCallback((element: HTMLElement | null) => element?.focus(), []);

  if (evidence.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-line-strong p-4 text-sm text-muted">
        <p>You haven&rsquo;t recorded any evidence yet. Add evidence cards in Research, then link them here.</p>
        <div className="flex gap-2">
          <Button ref={focusOnMount} variant="secondary" size="sm" onClick={onGoToResearch}>
            Go to Research
          </Button>
          <Button variant="ghost" size="sm" onClick={onDone}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <fieldset className="rounded-lg border border-line-strong bg-surface p-3">
      <legend className="px-1 text-xs font-medium text-fg">Evidence supporting {claimLabel.toLowerCase()}</legend>
      <ul className="flex flex-col gap-1">
        {evidence.map((card, index) => {
          const linked = linkedIds.includes(card.id);
          return (
            <li key={card.id}>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-surface-raised",
                  linked && "bg-accent-soft",
                )}
              >
                <input
                  ref={index === 0 ? focusOnMount : undefined}
                  type="checkbox"
                  checked={linked}
                  onChange={(event) => onToggle(card.id, event.target.checked)}
                  className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
                />
                <span className="min-w-0">
                  <span className="mr-2 font-mono text-xs text-accent">{labels.get(card.id)}</span>
                  <span className="text-fg">{card.sourceTitle}</span>
                  <span className="mt-0.5 block line-clamp-1 text-xs text-subtle">{card.observation}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex justify-end">
        <Button variant="secondary" size="sm" onClick={onDone}>
          Done
        </Button>
      </div>
    </fieldset>
  );
}
