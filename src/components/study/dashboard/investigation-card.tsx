import Link from "next/link";
import type { CSSProperties } from "react";
import { ArtImage } from "@/components/ui/art-image";
import { describeReason, minutesFor, sessionSteps, type Suggestion } from "@/domain/study/suggestions";
import type { StudyLength } from "@/domain/study/vocabulary";
import { studyInvestigationHref } from "@/lib/routes";

/**
 * A suggested investigation, led by its painting: a row with a small square of it on phones, a card with the
 * painting across the top from `sm` up. The title is the link (so its accessible name is short); the whole card
 * is clickable through the link's stretched hit area.
 */
export function InvestigationCard({ suggestion, length, index = 0 }: { suggestion: Suggestion; length: StudyLength; index?: number }) {
  const { investigation, reason } = suggestion;
  const steps = sessionSteps(investigation, length).length;
  return (
    <article
      style={{ "--motion-index": index } as CSSProperties}
      className="motion-reveal group relative flex gap-4 rounded-xl transition-colors has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent sm:flex-col sm:gap-0 sm:overflow-hidden sm:border sm:border-line sm:bg-surface sm:hover:border-line-strong"
    >
      <ArtImage
        use={investigation.id}
        ratio="square"
        decorative
        sizes="(min-width: 40rem) 24rem, 6rem"
        className="size-24 shrink-0 rounded-lg sm:aspect-video sm:h-auto sm:w-full sm:rounded-none"
      />
      <div className="flex min-w-0 flex-1 flex-col sm:p-5">
        <p className="text-[13px] font-semibold text-muted">{investigation.theme}</p>
        <h3 className="mt-0.5 text-[1.0625rem] leading-snug font-bold text-fg sm:font-serif sm:text-xl sm:font-medium">
          <Link href={studyInvestigationHref(investigation.id)} className="outline-none after:absolute after:inset-0 after:rounded-xl group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
            {investigation.title}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-2 font-serif text-[0.9375rem] leading-relaxed text-muted italic sm:line-clamp-3">{investigation.question}</p>
        <p className="mt-2 text-[13px] text-muted sm:mt-auto sm:pt-4">
          <span className="sr-only">Time: </span>About {minutesFor(investigation, length)} min
          <span aria-hidden className="mx-1.5">
            ·
          </span>
          <span className="sr-only">Steps: </span>
          {steps} {steps === 1 ? "step" : "steps"}
          <span className="hidden sm:inline">
            <span aria-hidden className="mx-1.5">
              ·
            </span>
            {describeReason(reason, length)}
          </span>
        </p>
      </div>
    </article>
  );
}
