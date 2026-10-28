"use client";

import { Link2, Trash2, X } from "lucide-react";
import { useRef, useState, type Ref } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import type { Claim, EvidenceCard } from "@/domain/investigation";
import type { InvestigationActions } from "../use-investigation";
import { EvidencePicker } from "./evidence-picker";

interface ClaimItemProps {
  claim: Claim;
  label: string;
  placeholder: string;
  evidence: EvidenceCard[];
  labels: Map<string, string>;
  actions: InvestigationActions;
  textareaRef?: Ref<HTMLTextAreaElement>;
  onGoToResearch: () => void;
}

export function ClaimItem({
  claim,
  label,
  placeholder,
  evidence,
  labels,
  actions,
  textareaRef,
  onGoToResearch,
}: ClaimItemProps) {
  const [picking, setPicking] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  // Return focus to the toggle when the focused control (picker, chip) disappears.
  const refocusToggle = (update: () => void) => {
    flushSync(update);
    toggleRef.current?.focus();
  };
  // Show linked evidence in list order so labels read E1, E2, …
  const linked = evidence.filter((card) => claim.evidenceIds.includes(card.id));

  return (
    <li className="rounded-xl border border-line bg-surface-sunken/40 p-4">
      <div className="flex items-start gap-3">
        <Textarea
          ref={textareaRef}
          rows={2}
          aria-label={label}
          placeholder={placeholder}
          value={claim.statement}
          onChange={(event) => actions.updateClaim(claim.id, event.target.value)}
        />
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 size-8 px-0 hover:text-danger"
          aria-label={`Remove ${label.toLowerCase()}`}
          onClick={() => actions.removeClaim(claim.id)}
        >
          <Trash2 aria-hidden />
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {linked.length === 0 ? (
          <span className="text-xs text-subtle">No evidence linked</span>
        ) : (
          <ul aria-label={`Evidence linked to ${label.toLowerCase()}`} className="contents">
            {linked.map((card) => (
              <li
                key={card.id}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft py-0.5 pr-1 pl-2.5 text-xs text-fg"
              >
                <span className="font-semibold tabular-nums text-accent">{labels.get(card.id)}</span>
                <span className="max-w-48 truncate">{card.sourceTitle}</span>
                <button
                  type="button"
                  aria-label={`Unlink ${labels.get(card.id)} from ${label.toLowerCase()}`}
                  onClick={() => refocusToggle(() => actions.unlinkEvidence(claim.id, card.id))}
                  className="flex size-6 items-center justify-center rounded-full text-muted hover:bg-surface-raised hover:text-fg"
                >
                  <X aria-hidden className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <Button
          ref={toggleRef}
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          aria-expanded={picking}
          onClick={() => setPicking((open) => !open)}
        >
          <Link2 aria-hidden />
          {linked.length === 0 ? "Link evidence" : "Edit links"}
        </Button>
      </div>

      {picking && (
        <div className="mt-3">
          <EvidencePicker
            claimLabel={label}
            evidence={evidence}
            labels={labels}
            linkedIds={claim.evidenceIds}
            onToggle={(evidenceId, link) =>
              link ? actions.linkEvidence(claim.id, evidenceId) : actions.unlinkEvidence(claim.id, evidenceId)
            }
            onDone={() => refocusToggle(() => setPicking(false))}
            onGoToResearch={onGoToResearch}
          />
        </div>
      )}
    </li>
  );
}
