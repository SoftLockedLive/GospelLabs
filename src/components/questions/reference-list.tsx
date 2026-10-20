import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { REFERENCE_TYPE_LABELS, type SuggestedReference } from "@/domain/question-bank";

export function ReferenceList({ references }: { references: readonly SuggestedReference[] }) {
  return (
    <ul className="flex flex-col divide-y divide-line">
      {references.map((reference) => (
        <li
          key={`${reference.label}-${reference.url ?? ""}`}
          className="flex flex-col gap-2 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <span className="font-medium text-fg">{reference.label}</span>
            <Badge>{REFERENCE_TYPE_LABELS[reference.type]}</Badge>
          </div>
          {reference.url && (
            <a
              href={reference.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-md py-1 text-sm text-accent hover:text-accent-strong hover:underline"
            >
              Read on ChurchofJesusChrist.org
              <ExternalLink aria-hidden className="size-3.5" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
