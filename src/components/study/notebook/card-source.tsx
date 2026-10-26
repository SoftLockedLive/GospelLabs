import { SourceKindBadge } from "@/components/study/shared/provenance";
import { SourceLink } from "@/components/study/shared/source-card";
import type { CardSource } from "@/domain/study/user-data";
import { cn } from "@/lib/cn";

/** A source snapshot saved on a Discovery Card: its citation, who it speaks for, and a link to the original. */
export function CardSourceRow({ source, compact = false, className }: { source: CardSource; compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("font-medium text-fg", compact ? "text-xs" : "text-sm")}>{source.label}</span>
        <SourceKindBadge kind={source.kind} />
      </div>
      {source.url && <SourceLink source={{ url: source.url, label: source.label }} className={compact ? "text-xs" : undefined} />}
    </div>
  );
}

/** Looks up a card's source snapshots by id, skipping any it doesn't have. */
export function sourcesById(sources: readonly CardSource[], ids: readonly string[]): CardSource[] {
  const byId = new Map(sources.map((source) => [source.id, source]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}
