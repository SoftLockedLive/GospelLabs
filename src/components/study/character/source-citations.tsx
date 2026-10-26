/**
 * A compact list of the sources behind a statement: each one names its kind
 * (scripture, official, speaker) and links to the original.
 */
import { SourceKindBadge } from "@/components/study/shared/provenance";
import { SourceLink } from "@/components/study/shared/source-card";
import type { Source } from "@/domain/study/content-schema";
import { cn } from "@/lib/cn";

interface SourceCitationsProps {
  sourceIds: readonly string[];
  sources: Readonly<Record<string, Source>>;
  /** Visible lead-in, e.g. "Sources". */
  label?: string;
  className?: string;
}

export function SourceCitations({ sourceIds, sources, label = "Sources", className }: SourceCitationsProps) {
  const list = [...new Set(sourceIds)].map((id) => sources[id]).filter((source): source is Source => !!source);
  if (list.length === 0) return null;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <p className="text-xs font-medium text-subtle">{label}</p>
      <ul className="flex flex-col gap-1.5">
        {list.map((source) => (
          <li key={source.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <SourceLink source={source} className="text-left font-medium">
              {source.label}
            </SourceLink>
            <SourceKindBadge kind={source.kind} />
          </li>
        ))}
      </ul>
    </div>
  );
}
