"use client";

import { Field, Textarea } from "@/components/ui/input";
import { ClaimList } from "../claims/claim-list";
import { DiscoveryList } from "../discoveries/discovery-list";
import { EvidenceReferencePanel } from "../evidence/evidence-reference-panel";
import { ComeUntoChrist } from "../reflection/come-unto-christ";
import { StatusSelector } from "../status-selector";
import type { SectionProps } from "../types";

export function ConclusionSection({ investigation, actions, onNavigate }: SectionProps) {
  const goToResearch = () => onNavigate("research");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex min-w-0 flex-col gap-8">
        <div className="flex min-w-0 flex-col gap-8">
          <DiscoveryList investigation={investigation} actions={actions} />
          <EvidenceReferencePanel investigation={investigation} onManage={goToResearch} />
          <Field
            label="What I understand now"
            optional
            hint="Your conclusion, in your own words. It can be tentative, and you can revise it anytime. Gospel Labs never writes or evaluates it."
          >
            {(props) => (
              <Textarea
                {...props}
                rows={6}
                placeholder="Based on my study so far…"
                value={investigation.conclusion}
                onChange={(event) => actions.setText("conclusion", event.target.value)}
              />
            )}
          </Field>
          <ClaimList
            section="conclusion"
            investigation={investigation}
            actions={actions}
            title="Supporting claims"
            description="The key points behind your conclusion, each with the evidence that supports it."
            placeholder="A point my conclusion rests on…"
            onGoToResearch={goToResearch}
          />
          <Field label="Remaining questions" optional>
            {(props) => (
              <Textarea
                {...props}
                rows={3}
                placeholder="What is still unclear or worth studying further?"
                value={investigation.remainingQuestions}
                onChange={(event) => actions.setText("remainingQuestions", event.target.value)}
              />
            )}
          </Field>
          <ComeUntoChrist investigation={investigation} actions={actions} />
        </div>
      </div>

      <div className="border-t border-line pt-6">
        <StatusSelector value={investigation.status} onChange={actions.setStatus} />
      </div>
    </div>
  );
}
