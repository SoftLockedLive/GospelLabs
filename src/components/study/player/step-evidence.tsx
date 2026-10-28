"use client";

/**
 * The evidence for a study step, kept in view while the learner answers, so nobody has to scroll up to the
 * verses and back down to the question:
 *
 *   EvidenceDock   below xl: a bar pinned under the study bar. It opens into a panel that scrolls on its own,
 *                  up to about two fifths of the screen, with the activity still in view below it. Once opened
 *                  it stays open from step to step (for this visit).
 *   EvidenceAside  xl and up: a column beside the step that stays in view as the page scrolls.
 *
 * Both list the activity's evidence first, then the step's other sources.
 */
import { BookOpen, ChevronDown } from "lucide-react";
import { useId, useSyncExternalStore } from "react";
import type { Source } from "@/domain/study/content-schema";
import { cn } from "@/lib/cn";
import { SourceCard } from "../shared/source-card";

interface StepEvidenceProps {
  /** What the activity asks about. */
  sources: readonly Source[];
  /** The step's other sources. */
  also: readonly Source[];
}

// Open or closed, remembered across steps (a step's components are remounted for each step).
let dockOpen = false;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const setDockOpen = (open: boolean) => {
  dockOpen = open;
  for (const listener of listeners) listener();
};

export function EvidenceDock({ sources, also }: StepEvidenceProps) {
  const open = useSyncExternalStore(subscribe, () => dockOpen, () => false);
  const panelId = useId();
  const count = sources.length + also.length;
  if (count === 0) return null;
  return (
    <section
      aria-label="Evidence"
      className="sticky top-14 z-10 -mx-5 border-y border-line bg-canvas shadow-soft sm:-mx-6 lg:top-0 lg:mx-0 lg:rounded-xl lg:border xl:hidden"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setDockOpen(!open)}
        className="flex min-h-12 w-full items-center justify-between gap-3 px-5 text-left sm:px-6 lg:px-4"
      >
        <span className="flex items-center gap-2 text-[0.9375rem] font-semibold text-fg">
          <BookOpen aria-hidden className="size-4 text-muted" />
          Evidence ({count})
        </span>
        <span className="flex items-center gap-1 text-sm font-semibold text-accent">
          {open ? "Hide" : "Show"}
          <ChevronDown aria-hidden className={cn("size-4 transition-transform", open && "rotate-180")} />
        </span>
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="max-h-[40dvh] overflow-y-auto overscroll-contain border-t border-line px-5 pt-3 pb-4 sm:px-6 lg:px-4"
      >
        <EvidenceList sources={sources} also={also} />
      </div>
    </section>
  );
}

export function EvidenceAside({ sources, also }: StepEvidenceProps) {
  if (sources.length + also.length === 0) return null;
  return (
    // Stretched to the step's full height, so the list inside can stay in view as the step scrolls.
    <aside aria-label="Evidence" className="hidden xl:block xl:self-stretch">
      <div className="sticky top-6 flex max-h-[calc(100dvh-3rem)] flex-col gap-3 overflow-y-auto overscroll-contain pr-1">
        <h3 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-fg">
          <BookOpen aria-hidden className="size-4 text-muted" />
          Evidence
        </h3>
        <EvidenceList sources={sources} also={also} />
      </div>
    </aside>
  );
}

function EvidenceList({ sources, also }: StepEvidenceProps) {
  return (
    <div className="flex flex-col gap-3">
      {sources.map((source) => (
        <SourceCard key={source.id} source={source} headingLevel="h4" />
      ))}
      {also.length > 0 && (
        <>
          {sources.length > 0 && <p className="kicker mt-2 text-muted">Also for this step</p>}
          {also.map((source) => (
            <SourceCard key={source.id} source={source} headingLevel="h4" />
          ))}
        </>
      )}
    </div>
  );
}
