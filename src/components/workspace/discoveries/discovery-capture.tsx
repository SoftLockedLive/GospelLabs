"use client";

import { Check, Lightbulb } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Investigation } from "@/domain/investigation";
import { evidenceLabels } from "../evidence/evidence-label";
import type { InvestigationActions } from "../use-investigation";
import { DiscoveryDialog } from "./discovery-dialog";

interface DiscoveryCaptureProps {
  investigation: Investigation;
  actions: InvestigationActions;
  /** Goes to the list of saved insights in Conclusion. */
  onReview: () => void;
}

/**
 * "Save insight", always within reach in the sticky step bar: under the
 * steps when they form a column (from 1280px), beside them otherwise, with
 * its label shown from 768px.
 */
export function DiscoveryCapture({ investigation, actions, onReview }: DiscoveryCaptureProps) {
  const [open, setOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const count = investigation.discoveryHighlights.length;

  // The check mark is a brief acknowledgement, not a reward; it simply reverts.
  useEffect(() => {
    if (!justSaved) return;
    const timer = window.setTimeout(() => setJustSaved(false), 2500);
    return () => window.clearTimeout(timer);
  }, [justSaved]);

  return (
    <div className="flex shrink-0 items-center gap-2 xl:flex-col xl:items-stretch">
      <Button
        variant="secondary"
        size="sm"
        className="h-9 gap-1.5 px-2.5 md:px-3 xl:justify-start"
        onClick={() => setOpen(true)}
      >
        {justSaved ? <Check aria-hidden className="text-green" /> : <Lightbulb aria-hidden className="text-accent" />}
        {/* The name comes from this text (sr-only where there's no room), so it always contains what's visible. */}
        <span className="sr-only md:not-sr-only">Save insight</span>
        {count > 0 && (
          <>
            <span aria-hidden className="font-semibold tabular-nums text-xs text-subtle xl:hidden">
              {count}
            </span>
            <span className="sr-only"> ({count} saved)</span>
          </>
        )}
      </Button>
      {count > 0 && (
        <button
          type="button"
          onClick={onReview}
          className="hidden rounded-sm py-1 text-left text-xs text-muted hover:text-fg hover:underline xl:block"
        >
          {count} saved · Review
        </button>
      )}
      <p role="status" className="sr-only">
        {justSaved ? "Insight saved. You can review it in Conclusion." : ""}
      </p>

      <DiscoveryDialog
        open={open}
        title="Save an insight"
        description="Keep an insight while it’s fresh. Your saved insights gather in Conclusion for review."
        submitLabel="Save insight"
        evidence={investigation.evidence}
        labels={evidenceLabels(investigation.evidence)}
        onSubmit={(input) => {
          actions.addHighlight(input);
          setOpen(false);
          setJustSaved(true);
        }}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
