"use client";

/**
 * Every guided investigation, with where this learner is in each (from
 * progress stored on this device). The cards come from content summaries
 * the server page passes in; status loads in the browser.
 */
import { ArrowUpRight, Check, Clock, Compass, Footprints, Telescope } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Badge } from "@/components/ui/badge";
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
        description="Guided investigations are being written and checked against their sources. Until they're ready, the Question Bank and your research notebook are open."
      />
    );
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {items.map((item, index) => (
        <li key={item.id}>
          <LibraryCard item={item} status={progress.status === "ready" ? libraryStatus(item, byId.get(item.id)) : null} index={index} />
        </li>
      ))}
    </ul>
  );
}

function StatusBadge({ status }: { status: LibraryStatus | null }) {
  if (!status || status.kind === "not-started") return null;
  if (status.kind === "completed") {
    return (
      <Badge tone="green">
        <Check aria-hidden />
        Completed {formatDate(status.completedAt)}
      </Badge>
    );
  }
  return (
    <Badge tone="accent">
      <Footprints aria-hidden />
      {status.inBranch ? "Exploring a side question" : `Step ${status.step} of ${status.total}`}
    </Badge>
  );
}

function LibraryCard({ item, status, index }: { item: InvestigationSummary; status: LibraryStatus | null; index: number }) {
  const quickSteps = sessionSteps(item, "quick").length;
  const action = !status || status.kind === "not-started" ? "Start" : status.kind === "completed" ? "Review or study again" : "Continue";
  return (
    <article
      style={{ "--motion-index": index } as CSSProperties}
      className="motion-reveal group relative flex h-full flex-col rounded-2xl border border-line bg-surface p-5 shadow-soft transition-colors has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent hover:border-accent/40 hover:bg-surface-raised sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-accent uppercase">{item.theme}</p>
        <ArrowUpRight
          aria-hidden
          className="size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent"
        />
      </div>
      <h2 className="mt-2 text-lg leading-snug font-semibold tracking-tight text-fg">
        <Link href={studyInvestigationHref(item.id)} className="outline-none after:absolute after:inset-0 after:rounded-2xl">
          {item.title}
        </Link>
      </h2>
      <p className="mt-2 font-serif text-[1.02rem] leading-relaxed text-fg">{item.question}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{item.hook}</p>
      {item.primaryQuestion && (
        <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-subtle">
          <Compass aria-hidden className="mt-px size-3.5 shrink-0 text-accent" />
          <span>
            <span className="sr-only">Rests on the primary question: </span>
            {PRIMARY_QUESTION_TEXT[item.primaryQuestion]}
          </span>
        </p>
      )}
      <div className="mt-auto flex flex-col gap-3 pt-5">
        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Quick study</dt>
            <Clock aria-hidden className="size-3.5 text-subtle" />
            <dd>
              Quick {item.estimatedMinutes.quick} min · Deep {item.estimatedMinutes.deep} min
            </dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Steps</dt>
            <Footprints aria-hidden className="size-3.5 text-subtle" />
            <dd>
              {quickSteps} core {quickSteps === 1 ? "step" : "steps"}
              {item.branches > 0 && ` · ${item.branches} side ${item.branches === 1 ? "question" : "questions"}`}
            </dd>
          </div>
        </dl>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StatusBadge status={status} />
          <span className="text-sm font-medium text-accent">{action}</span>
        </div>
      </div>
    </article>
  );
}
