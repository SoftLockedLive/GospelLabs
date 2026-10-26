"use client";

/**
 * The evidence beside an activity. On phones it starts collapsed behind a
 * toggle so the activity stays in view; from the sm breakpoint up it is
 * always shown (CSS only, so there is no layout flash on load). `collapsible`
 * keeps the toggle at every width, for activities embedded in pages that
 * already show their sources (Character of Christ, Scripture Explorer).
 */
import { BookOpen, ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import type { Source } from "@/domain/study/content-schema";
import { cn } from "@/lib/cn";
import { SourceCard } from "../shared/source-card";

export function EvidencePanel({
  sources,
  title = "Evidence",
  className,
  collapsible = false,
}: {
  sources: readonly Source[];
  title?: string;
  className?: string;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  if (sources.length === 0) return null;
  return (
    <section aria-label={title} className={cn("flex flex-col gap-3", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-line bg-surface-sunken px-3.5 text-left text-sm font-medium text-fg",
          !collapsible && "sm:hidden",
        )}
      >
        <span className="flex items-center gap-2">
          <BookOpen aria-hidden className="size-4 text-accent" />
          {title} ({sources.length})
        </span>
        <ChevronDown aria-hidden className={cn("size-4 text-subtle transition-transform", open && "rotate-180")} />
      </button>
      {!collapsible && (
        <p className="hidden items-center gap-2 text-xs font-semibold tracking-wide text-muted uppercase sm:flex">
          <BookOpen aria-hidden className="size-3.5 text-accent" />
          {title}
        </p>
      )}
      <div id={panelId} className={cn("flex-col gap-3", !collapsible && "sm:flex", open ? "flex" : "hidden")}>
        {sources.map((source) => (
          <SourceCard key={source.id} source={source} headingLevel="h4" />
        ))}
      </div>
    </section>
  );
}
