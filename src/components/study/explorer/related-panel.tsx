"use client";

/**
 * Related scriptures, each with how it relates to the passage, and a side-by-
 * side comparison of the passage with any one of them.
 */
import { Columns2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProvenanceLabel } from "@/components/study/shared/provenance";
import { SourceCard, SourceLink, VerseText } from "@/components/study/shared/source-card";
import type { ExplorerPassage, Source } from "@/domain/study/content-schema";
import { RELATION_LABELS, RELATION_PHRASES } from "@/domain/study/vocabulary";

type Sources = Readonly<Record<string, Source>>;

interface RelatedPanelProps {
  passage: ExplorerPassage;
  sources: Sources;
  comparing: string | null;
  onCompare: (sourceId: string) => void;
}

export function RelatedPanel({ passage, sources, comparing, onCompare }: RelatedPanelProps) {
  const current = sources[passage.sourceId];
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-muted">
        Other scriptures that teach, support, or illustrate what {current?.label ?? "this passage"} says. Compare any of them side by side.
      </p>
      <ul className="flex flex-col gap-4">
        {passage.related.map((related) => {
          const source = sources[related.sourceId];
          if (!source) return null;
          return (
            <li key={related.sourceId} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">{RELATION_LABELS[related.relation]}</Badge>
                <span className="text-xs text-subtle">
                  {source.label} {RELATION_PHRASES[related.relation]} {current?.label ?? "this passage"}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-fg">{related.note}</p>
              <ProvenanceLabel provenance="suggested" />
              <SourceCard source={source} headingLevel="h4" className="p-3.5 sm:p-4" />
              {source.verses && current?.verses && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-11 self-start sm:h-9"
                  aria-pressed={comparing === related.sourceId}
                  onClick={() => onCompare(related.sourceId)}
                >
                  <Columns2 aria-hidden />
                  Compare side by side
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface CompareViewProps {
  passage: ExplorerPassage;
  sources: Sources;
  sourceId: string;
  onClose: () => void;
}

/** The passage and one related scripture, side by side on wide screens and stacked on phones. */
export function CompareView({ passage, sources, sourceId, onClose }: CompareViewProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const current = sources[passage.sourceId];
  const other = sources[sourceId];
  const related = passage.related.find((r) => r.sourceId === sourceId);

  useEffect(() => {
    headingRef.current?.focus();
    headingRef.current?.scrollIntoView({ block: "nearest" });
  }, [sourceId]);

  if (!current || !other || !related) return null;
  return (
    <section aria-labelledby="compare-heading" className="motion-reveal rounded-2xl border border-line bg-surface p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="compare-heading" ref={headingRef} tabIndex={-1} className="text-base font-semibold tracking-tight text-fg focus:outline-none">
            {current.label} and {other.label}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            <span className="font-medium text-fg">{RELATION_LABELS[related.relation]}.</span> {related.note}
          </p>
          <ProvenanceLabel provenance="suggested" className="mt-1.5" />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close comparison"
          className="-mt-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-subtle hover:bg-surface-raised hover:text-fg"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
        {[current, other].map((source) => (
          <article key={source.id} className="min-w-0 rounded-xl border border-line bg-surface-sunken p-4">
            <h3 className="mb-2 text-sm font-semibold text-fg">{source.label}</h3>
            <VerseText source={source} className="prose-scripture" />
            <SourceLink source={source} className="mt-2" />
          </article>
        ))}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-subtle">
        Look for repeated words, the same idea said differently, and anything one passage adds that the other doesn&rsquo;t.
      </p>
    </section>
  );
}
