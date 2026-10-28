"use client";

/**
 * Every guided investigation, with where this learner is in each (from
 * progress stored on this device). The cards come from content summaries
 * the server page passes in; status loads in the browser.
 */
import { Check, Compass, Footprints, Telescope } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArtImage } from "@/components/ui/art-image";
import { EmptyState } from "@/components/ui/empty-state";
import { sessionSteps } from "@/domain/study/suggestions";
import type { StudyProgress } from "@/domain/study/user-data";
import { PRIMARY_QUESTION_TEXT } from "@/domain/study/vocabulary";
import { formatDate } from "@/lib/format";
import { studyInvestigationHref } from "@/lib/routes";
import { useStudyProgressList } from "@/persistence/study-hooks";
import { libraryStatus, type InvestigationSummary, type LibraryStatus } from "./library";

export function InvestigationLibrary({ items }: { items: readonly InvestigationSummary[] }) {
  const progress = useStudyProgressList();
  const byId = new Map<string, StudyProgress>(progress.status === "ready" ? progress.value.records.map((record) => [record.id, record]) : []);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Telescope}
        headingLevel={2}
        title="Investigations are on their way"
        description="Guided investigations are being written and checked against their sources. Until they’re ready, the Question Bank and My Library are open."
      />
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-6">
      {items.map((item, index) => (
        <li key={item.id}>
          <LibraryCard item={item} status={progress.status === "ready" ? libraryStatus(item, byId.get(item.id)) : null} index={index} />
        </li>
      ))}
    </ul>
  );
}

/** Where this learner is: plain text with an icon, so status reads without relying on color. */
function StatusText({ status }: { status: LibraryStatus | null }) {
  if (!status || status.kind === "not-started") return null;
  if (status.kind === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green">
        <Check aria-hidden className="size-4" />
        Completed {formatDate(status.completedAt)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-fg">
      <Footprints aria-hidden className="size-4 text-muted" />
      {status.inBranch ? "Exploring a side question" : `Step ${status.step} of ${status.total}`}
    </span>
  );
}

function LibraryCard({ item, status, index }: { item: InvestigationSummary; status: LibraryStatus | null; index: number }) {
  const quickSteps = sessionSteps(item, "quick").length;
  const action = !status || status.kind === "not-started" ? "Start" : status.kind === "completed" ? "Review or study again" : "Continue";
  return (
    <article
      style={{ "--motion-index": index } as CSSProperties}
      className="motion-reveal group relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface transition-colors has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent hover:border-line-strong"
    >
      <ArtImage use={item.id} decorative sizes="(min-width: 48rem) 36rem, 100vw" priority={index === 0} />
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="kicker text-muted">{item.theme}</p>
        <h2 className="mt-1 font-serif text-[1.5rem] leading-[1.875rem] font-medium text-fg">
          <Link href={studyInvestigationHref(item.id)} className="outline-none after:absolute after:inset-0 after:rounded-xl group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
            {item.title}
          </Link>
        </h2>
        <p className="mt-2 font-serif text-[1.0625rem] leading-relaxed text-fg italic">{item.question}</p>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">{item.hook}</p>
        {item.primaryQuestion && (
          <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-muted">
            <Compass aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>
              <span className="sr-only">Rests on the primary question: </span>
              {PRIMARY_QUESTION_TEXT[item.primaryQuestion]}
            </span>
          </p>
        )}
        <div className="mt-auto flex flex-col gap-3 pt-5">
          <p className="text-sm text-muted">
            <span className="sr-only">Quick study: </span>Quick {item.estimatedMinutes.quick} min · Deep {item.estimatedMinutes.deep} min
            <span aria-hidden className="mx-1.5">
              ·
            </span>
            <span className="sr-only">Steps: </span>
            {quickSteps} {quickSteps === 1 ? "step" : "steps"}
            {item.branches > 0 && ` · ${item.branches} side ${item.branches === 1 ? "question" : "questions"}`}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
            <StatusText status={status} />
            <span className="ml-auto text-[0.9375rem] font-semibold text-accent">{action}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
