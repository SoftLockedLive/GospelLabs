import { Check, ExternalLink, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { evidenceDraftFromReference } from "@/domain/evidence-input";
import type { EvidenceCard, EvidenceInput } from "@/domain/investigation";
import type { SuggestedReference } from "@/domain/question-bank";

interface SuggestedReferencesProps {
  references: readonly SuggestedReference[];
  evidence: readonly EvidenceCard[];
  /** Opens the evidence form with the source pre-filled. */
  onRecord: (draft: Partial<EvidenceInput>) => void;
}

/** The source question's suggested references, each with a shortcut to record evidence from it. */
export function SuggestedReferences({ references, evidence, onRecord }: SuggestedReferencesProps) {
  const isRecorded = (reference: SuggestedReference) =>
    evidence.some(
      (card) => (reference.url && card.sourceUrl === reference.url) || card.sourceTitle === reference.label,
    );

  return (
    <section aria-labelledby="suggested-refs-heading" className="rounded-xl border border-line bg-surface-sunken/60 p-4">
      <h3 id="suggested-refs-heading" className="text-xs font-semibold tracking-wide text-fg uppercase">
        Suggested starting points
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-subtle">
        Read each source yourself. Recording one fills in the source; the observation is yours to write.
      </p>
      <ul className="mt-3 flex flex-col divide-y divide-line">
        {references.map((reference) => {
          const recorded = isRecorded(reference);
          return (
            <li key={reference.label} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                {reference.url ? (
                  <a
                    href={reference.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-sm py-0.5 text-fg hover:text-accent hover:underline"
                  >
                    {reference.label}
                    <ExternalLink aria-hidden className="size-3 text-subtle" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                ) : (
                  <span className="text-fg">{reference.label}</span>
                )}
                {recorded && (
                  <span className="inline-flex items-center gap-1 text-xs text-green">
                    <Check aria-hidden className="size-3" />
                    Recorded
                  </span>
                )}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                aria-label={`Record evidence from ${reference.label}`}
                onClick={() => onRecord(evidenceDraftFromReference(reference))}
              >
                <Plus aria-hidden />
                Record
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
