"use client";

import { Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ClaimSection, Investigation } from "@/domain/investigation";
import { claimsInSection } from "@/domain/investigation-reducer";
import { evidenceLabels } from "../evidence/evidence-label";
import type { InvestigationActions } from "../use-investigation";
import { ClaimItem } from "./claim-item";

interface ClaimListProps {
  section: ClaimSection;
  investigation: Investigation;
  actions: InvestigationActions;
  title: string;
  description: string;
  placeholder: string;
  onGoToResearch: () => void;
}

/** User-written claims for one section, each linkable to evidence cards. */
export function ClaimList({
  section,
  investigation,
  actions,
  title,
  description,
  placeholder,
  onGoToResearch,
}: ClaimListProps) {
  const claims = claimsInSection(investigation, section);
  const labels = evidenceLabels(investigation.evidence);
  const [focusId, setFocusId] = useState<string | null>(null);
  const focusOnMount = useCallback((element: HTMLTextAreaElement | null) => element?.focus(), []);
  const headingId = `claims-${section}-heading`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div>
        <h3 id={headingId} className="text-sm font-medium text-fg">
          {title} <span className="ml-1 text-xs font-normal text-subtle">Optional</span>
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-subtle">{description}</p>
      </div>

      {claims.length > 0 && (
        <ol className="flex flex-col gap-3">
          {claims.map((claim, index) => (
            <ClaimItem
              key={claim.id}
              claim={claim}
              label={`Claim ${index + 1}`}
              placeholder={placeholder}
              evidence={investigation.evidence}
              labels={labels}
              actions={actions}
              textareaRef={claim.id === focusId ? focusOnMount : undefined}
              onGoToResearch={onGoToResearch}
            />
          ))}
        </ol>
      )}

      <div>
        <Button variant="secondary" size="sm" onClick={() => setFocusId(actions.addClaim(section))}>
          <Plus aria-hidden />
          {claims.length === 0 ? "Add a claim" : "Add another claim"}
        </Button>
      </div>
    </section>
  );
}
