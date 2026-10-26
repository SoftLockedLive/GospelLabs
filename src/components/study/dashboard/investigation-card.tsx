import { ArrowUpRight, Clock, Footprints } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { describeReason, minutesFor, sessionSteps, type Suggestion } from "@/domain/study/suggestions";
import type { StudyLength } from "@/domain/study/vocabulary";
import { studyInvestigationHref } from "@/lib/routes";

/**
 * A suggested investigation. The title is the link (so its accessible name
 * is short); the whole card is clickable through the link's stretched hit area.
 */
export function InvestigationCard({ suggestion, length, index = 0 }: { suggestion: Suggestion; length: StudyLength; index?: number }) {
  const { investigation, reason } = suggestion;
  const steps = sessionSteps(investigation, length).length;
  return (
    <article
      style={{ "--motion-index": index } as CSSProperties}
      className="motion-reveal group relative flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-soft transition-colors has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent hover:border-accent/40 hover:bg-surface-raised"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-subtle">{investigation.theme}</p>
        <ArrowUpRight
          aria-hidden
          className="size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent"
        />
      </div>
      <h3 className="mt-2 text-base leading-snug font-semibold tracking-tight text-fg">
        <Link href={studyInvestigationHref(investigation.id)} className="outline-none after:absolute after:inset-0 after:rounded-2xl">
          {investigation.title}
        </Link>
      </h3>
      <p className="mt-2 line-clamp-3 font-serif text-[15px] leading-relaxed text-muted italic">{investigation.question}</p>
      <div className="mt-auto pt-5">
        <p className="text-xs text-subtle">{describeReason(reason, length)}</p>
        <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Time</dt>
            <Clock aria-hidden className="size-3.5 text-subtle" />
            <dd>About {minutesFor(investigation, length)} min</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Steps</dt>
            <Footprints aria-hidden className="size-3.5 text-subtle" />
            <dd>
              {steps} {steps === 1 ? "step" : "steps"}
            </dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
