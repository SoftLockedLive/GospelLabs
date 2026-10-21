"use client";

import { Check, Route } from "lucide-react";
import { useRef } from "react";
import { flushSync } from "react-dom";
import type { DiscoveryTrail } from "@/domain/discovery-trails";
import type { EvidenceInput, Investigation, SectionId } from "@/domain/investigation";
import { findTrailProgress } from "@/domain/investigation-reducer";
import { cn } from "@/lib/cn";
import type { InvestigationActions } from "../use-investigation";
import { TrailNotesArchive } from "./trail-notes-archive";
import { TrailStepView } from "./trail-step-view";

interface TrailPanelProps {
  trail: DiscoveryTrail;
  investigation: Investigation;
  actions: InvestigationActions;
  /** Opens the evidence form with a reference's source filled in. */
  onRecord: (draft: Partial<EvidenceInput>) => void;
  onNavigate: (section: SectionId) => void;
}

/**
 * A discovery trail for the investigation's curated question. Every step is
 * reachable at any time; the trail reopens at the step last viewed, and the
 * user's notes and explored marks are saved with the investigation.
 */
export function TrailPanel({ trail, investigation, actions, onRecord, onNavigate }: TrailPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const progress = findTrailProgress(investigation, trail.id);
  const notesFor = (stepId: string) => progress?.steps.find((step) => step.stepId === stepId);
  const currentIndex = Math.max(
    0,
    trail.steps.findIndex((step) => step.id === progress?.currentStepId),
  );
  const step = trail.steps[currentIndex];
  const snapshot = { stepId: step.id, title: step.title, question: step.question };
  const exploredCount = trail.steps.filter((item) => notesFor(item.id)?.explored).length;
  const stepTitles = new Map(trail.steps.map((item, index) => [item.id, { index, title: item.title }]));
  // Notes on steps that a later revision of the trail removed.
  const orphaned = progress?.steps.filter((item) => !stepTitles.has(item.stepId)) ?? [];

  /** Switches steps. From buttons that may disappear or move, focus follows to the new step's title. */
  const goToStep = (index: number, moveFocus: boolean) => {
    flushSync(() => actions.setTrailStep(trail.id, trail.steps[index].id));
    if (moveFocus) headingRef.current?.focus();
  };

  return (
    <section
      aria-labelledby="discovery-trail-heading"
      className="flex min-w-0 flex-col gap-4 rounded-xl border border-line bg-surface-sunken/60 p-3 sm:p-5"
    >
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-fg uppercase">
            <Route aria-hidden className="size-4 text-accent" />
            Discovery trail
          </p>
          <p className="text-xs text-subtle">
            {exploredCount} of {trail.steps.length} steps explored
          </p>
        </div>
        <h3 id="discovery-trail-heading" className="mt-2 text-base font-semibold tracking-tight text-fg">
          {trail.title}
        </h3>
        {trail.introduction && <p className="mt-1 text-sm leading-relaxed text-muted">{trail.introduction}</p>}
      </div>

      <nav aria-label="Trail steps" className="min-w-0">
        {/*
          On phones, one row where only the current step shows its title, so every step stays in view;
          wider screens show every title and wrap. Vertical padding leaves room for focus rings.
        */}
        <ol className="scrollbar-none -mx-3 flex gap-1.5 overflow-x-auto px-3 py-1 sm:mx-0 sm:flex-wrap sm:gap-2 sm:overflow-visible sm:px-0">
          {trail.steps.map((item, index) => {
            const notes = notesFor(item.id);
            const current = index === currentIndex;
            const hasNotes = Boolean(notes?.discoveries.trim());
            return (
              // Buttons size to their content, so the width limit sits on the list item and the
              // button fills it; the current step's title then truncates instead of overflowing.
              <li key={item.id} className={cn("max-w-60", current ? "min-w-0" : "shrink-0")}>
                <button
                  type="button"
                  aria-current={current ? "step" : undefined}
                  aria-label={`Step ${index + 1}: ${item.title}${notes?.explored ? " (explored)" : ""}${hasNotes ? " (has notes)" : ""}`}
                  onClick={() => goToStep(index, false)}
                  className={cn(
                    "flex h-8 max-w-full items-center gap-2 rounded-full border pl-1 text-sm transition-colors sm:pr-3",
                    current
                      ? "min-w-0 border-accent/60 bg-accent-soft pr-3 text-fg"
                      : "border-line-strong pr-1 text-muted hover:border-accent/40 hover:text-fg",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-[11px]",
                      notes?.explored
                        ? "border-accent bg-accent text-accent-fg"
                        : current
                          ? "border-accent text-accent"
                          : "border-line-strong text-subtle",
                    )}
                  >
                    {notes?.explored ? <Check className="size-3" /> : index + 1}
                  </span>
                  <span aria-hidden className={cn("truncate", !current && "hidden sm:inline")}>
                    {item.title}
                  </span>
                  {hasNotes && (
                    <span
                      aria-hidden
                      className={cn("size-1.5 shrink-0 rounded-full bg-accent", !current && "hidden sm:block")}
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <TrailStepView
        key={step.id}
        step={step}
        index={currentIndex}
        total={trail.steps.length}
        notes={notesFor(step.id)}
        evidence={investigation.evidence}
        stepTitles={stepTitles}
        headingRef={headingRef}
        onDiscoveriesChange={(text) => actions.recordTrailDiscoveries(trail.id, snapshot, text)}
        onExploredChange={(explored) => actions.setTrailStepExplored(trail.id, snapshot, explored)}
        onGoToStep={(index) => goToStep(index, true)}
        onRecord={onRecord}
        onNavigate={onNavigate}
      />

      <TrailNotesArchive heading="Notes from earlier versions of this trail" notes={orphaned} />
    </section>
  );
}
