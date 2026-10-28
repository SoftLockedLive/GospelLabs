"use client";

/**
 * The Scripture Explorer library: every passage, with what this learner has
 * done with it (from their Explorations on this device).
 */
import { ArrowRight, BookOpenText, CircleCheck, Highlighter } from "lucide-react";
import Link from "next/link";
import { SkeletonText } from "@/components/ui/skeleton";
import { summarizeExploration } from "@/domain/study/explorer";
import type { NodeRef } from "@/domain/study/vocabulary";
import { explorerHref } from "@/lib/routes";
import { useExplorations } from "@/persistence/study-hooks";
import { ThemeChip } from "./theme-chip";

export interface PassageListItem {
  id: string;
  title: string;
  /** The scripture reference, e.g. "Alma 7:11–13". */
  reference: string;
  speaker?: string;
  themes: { label: string; ref: NodeRef }[];
  activityIds: string[];
}

export function PassageLibrary({ passages }: { passages: readonly PassageListItem[] }) {
  const explorations = useExplorations("passage");
  const byPassage = new Map(explorations.status === "ready" ? explorations.value.map((e) => [e.contentId, e]) : []);

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {passages.map((passage, index) => {
        const summary = summarizeExploration(byPassage.get(passage.id), passage.activityIds);
        return (
          <li key={passage.id} className="motion-reveal" style={{ "--motion-index": index } as React.CSSProperties}>
            <Link
              href={explorerHref(passage.id)}
              className="group flex h-full flex-col rounded-xl border border-line bg-surface p-5 transition-colors motion-press hover:border-accent/50 hover:bg-surface-raised"
            >
              <span className="flex items-center gap-2 font-semibold tabular-nums text-xs tracking-wide text-accent">
                <BookOpenText aria-hidden className="size-3.5" />
                {passage.reference}
              </span>
              <span className="mt-2 text-base font-semibold tracking-tight text-fg">{passage.title}</span>
              {passage.speaker && <span className="mt-1 text-sm text-muted">{passage.speaker}</span>}
              <span className="mt-3 flex flex-wrap gap-1.5">
                {passage.themes.slice(0, 2).map((theme) => (
                  <ThemeChip key={theme.ref} label={theme.label} themeRef={theme.ref} />
                ))}
              </span>
              <span className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-5 text-xs text-muted">
                {explorations.status === "loading" ? (
                  <SkeletonText lines={1} className="w-28" />
                ) : summary.explored ? (
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="inline-flex items-center gap-1 text-green">
                      <CircleCheck aria-hidden className="size-3.5" />
                      Explored
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Highlighter aria-hidden className="size-3.5" />
                      {summary.highlights} highlight{summary.highlights === 1 ? "" : "s"}
                    </span>
                    {passage.activityIds.length > 0 && (
                      <span>
                        {summary.activitiesCompleted}/{passage.activityIds.length} activities
                      </span>
                    )}
                  </span>
                ) : (
                  <span>Not explored yet</span>
                )}
                <ArrowRight aria-hidden className="size-4 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
