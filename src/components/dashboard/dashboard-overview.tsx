"use client";

import { ArrowRight, Lightbulb } from "lucide-react";
import { StorageErrorState } from "@/components/investigations/storage-error-state";
import { InvestigationRow } from "@/components/investigations/investigation-row";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/page-header";
import { useInvestigationList } from "@/persistence/hooks";
import { StatusOverview } from "./status-overview";

const RECENT_COUNT = 3;

/** Status counts and recently edited investigations, read live from this device. */
export function DashboardOverview() {
  const state = useInvestigationList();

  if (state.status === "loading") {
    return (
      <div role="status" aria-label="Loading your investigations" className="flex animate-pulse flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-24 rounded-xl bg-surface" />
          ))}
        </div>
        <div className="h-32 rounded-xl bg-surface" />
      </div>
    );
  }
  if (state.status === "error") return <StorageErrorState error={state.error} />;

  const { investigations } = state.value;

  if (investigations.length === 0) {
    return (
      <section aria-labelledby="first-steps-heading" className="rounded-xl border border-dashed border-line-strong p-5 sm:p-6">
        <h2 id="first-steps-heading" className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Lightbulb aria-hidden className="size-4 text-accent" />
          Your investigations will appear here
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          Start with a question that matters to you, or browse the question bank for ideas. Everything is saved
          automatically on this device as you write.
        </p>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-10 sm:gap-12">
      <section aria-labelledby="status-heading">
        <h2 id="status-heading" className="mb-4 text-sm font-semibold tracking-tight text-fg">
          Investigation status
        </h2>
        <StatusOverview investigations={investigations} />
      </section>

      <section aria-label="Recent investigations">
        <SectionHeading
          title="Pick up where you left off"
          action={
            <ButtonLink href="/library" variant="ghost" size="sm">
              View library
              <ArrowRight aria-hidden />
            </ButtonLink>
          }
        />
        <div className="flex flex-col gap-3">
          {investigations.slice(0, RECENT_COUNT).map((investigation) => (
            <InvestigationRow key={investigation.id} investigation={investigation} />
          ))}
        </div>
      </section>
    </div>
  );
}
