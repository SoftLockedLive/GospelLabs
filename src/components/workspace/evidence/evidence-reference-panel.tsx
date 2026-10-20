import { ArrowRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Investigation } from "@/domain/investigation";
import { countCitations } from "@/domain/investigation-reducer";
import { evidenceLabels } from "./evidence-label";

interface EvidenceReferencePanelProps {
  investigation: Investigation;
  onManage: () => void;
}

/** Compact list of the investigation's evidence, shown beside Analysis and Conclusion. */
export function EvidenceReferencePanel({ investigation, onManage }: EvidenceReferencePanelProps) {
  const { evidence } = investigation;
  const labels = evidenceLabels(evidence);
  const citations = countCitations(investigation);

  return (
    <section aria-labelledby="evidence-ref-heading" className="h-fit rounded-xl border border-line bg-surface-sunken/60 p-4">
      <h3 id="evidence-ref-heading" className="flex items-center gap-2 text-xs font-semibold tracking-wide text-fg uppercase">
        <FileText aria-hidden className="size-3.5 text-accent" />
        Your evidence
      </h3>
      {evidence.length === 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-subtle">No evidence yet. Cards you add in Research appear here.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {evidence.map((card) => {
            const count = citations.get(card.id) ?? 0;
            return (
              <li key={card.id} className="text-sm">
                <span className="mr-2 font-mono text-xs text-accent">{labels.get(card.id)}</span>
                <span className="text-fg">{card.sourceTitle}</span>
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-subtle">{card.observation}</p>
                <p className="mt-0.5 text-[11px] text-subtle">
                  {count === 0 ? "Not cited yet" : `Cited by ${count} ${count === 1 ? "claim" : "claims"}`}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      <Button variant="ghost" size="sm" className="mt-3 -ml-3" onClick={onManage}>
        {evidence.length === 0 ? "Go to Research" : "Manage in Research"}
        <ArrowRight aria-hidden />
      </Button>
    </section>
  );
}
