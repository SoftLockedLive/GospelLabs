"use client";

import { Field, Textarea } from "@/components/ui/input";
import { ClaimList } from "../claims/claim-list";
import { EvidenceReferencePanel } from "../evidence/evidence-reference-panel";
import type { SectionProps } from "../types";

export function AnalysisSection({ investigation, actions, onNavigate }: SectionProps) {
  const goToResearch = () => onNavigate("research");

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <EvidenceReferencePanel investigation={investigation} onManage={goToResearch} />
      <div className="flex min-w-0 flex-col gap-8">
        <Field label="Analysis notes" hint="Where do sources agree or differ? What patterns or tensions stand out?">
          {(props) => (
            <Textarea
              {...props}
              rows={8}
              placeholder="Compare, connect, and weigh what you’ve found"
              value={investigation.analysisNotes}
              onChange={(event) => actions.setText("analysisNotes", event.target.value)}
            />
          )}
        </Field>
        <ClaimList
          section="analysis"
          investigation={investigation}
          actions={actions}
          title="Claims"
          description="State specific things you’ve noticed, and link the evidence behind each one."
          placeholder="Something the evidence suggests…"
          onGoToResearch={goToResearch}
        />
      </div>
    </div>
  );
}
