import { ChevronRight, NotebookTabs } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArtImage } from "@/components/ui/art-image";
import { ProgressPath, pathFromCounts } from "@/components/ui/progress-path";
import type { Investigation } from "@/domain/investigation";
import { studyPosition } from "@/domain/study/suggestions";
import type { StudyProgress } from "@/domain/study/user-data";
import { investigationHref, resumeInvestigationHref } from "@/lib/routes";
import { relativeDay } from "./time";
import type { InvestigationSummary } from "./types";

interface ContinueListProps {
  items: readonly { investigation: InvestigationSummary; progress: StudyProgress }[];
  /** The most recently edited 1.x research notebook, if any, and how many there are. */
  research?: { latest: Investigation; count: number };
  now: Date | null;
}

const rowClasses =
  "group relative flex items-center gap-4 rounded-lg py-3 transition-colors has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent";

/** Other investigations in progress, and a way back into the research notebook: a plain list with hairlines. */
export function ContinueList({ items, research, now }: ContinueListProps) {
  return (
    <ul className="flex flex-col divide-y divide-line border-y border-line">
      {items.map(({ investigation, progress }, index) => {
        const position = studyPosition(progress, investigation);
        return (
          <li key={investigation.id} className="motion-reveal" style={{ "--motion-index": index } as CSSProperties}>
            <article className={rowClasses}>
              <ArtImage use={investigation.id} ratio="square" decorative sizes="4rem" className="size-16 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <h3 className="text-[1.0625rem] leading-snug font-bold text-fg">
                  <Link href={resumeInvestigationHref(investigation.id)} className="outline-none after:absolute after:inset-0 after:rounded-lg group-hover:underline group-hover:underline-offset-4">
                    {investigation.title}
                  </Link>
                </h3>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
                  <span>{position.inBranch ? "In a side question" : `Step ${position.step} of ${position.total}`}</span>
                  <span aria-hidden>·</span>
                  <span>{progress.length === "deep" ? "Deep study" : "Quick study"}</span>
                  {now && (
                    <>
                      <span aria-hidden>·</span>
                      <span>Studied {relativeDay(progress.updatedAt, now)}</span>
                    </>
                  )}
                </p>
                <ProgressPath
                  size="sm"
                  steps={pathFromCounts(position.total, Math.max(position.step - 1, 0))}
                  label={`Step ${position.step} of ${position.total}`}
                  className="mt-2 max-w-48"
                />
              </div>
              <ChevronRight aria-hidden className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
            </article>
          </li>
        );
      })}
      {research && (
        <li className="motion-reveal" style={{ "--motion-index": items.length } as CSSProperties}>
          <article className={rowClasses}>
            <span aria-hidden className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-muted">
              <NotebookTabs className="size-6" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-muted">Research notebook</p>
              <h3 className="mt-0.5 truncate text-[1.0625rem] leading-snug font-bold text-fg">
                <Link href={investigationHref(research.latest.id)} className="outline-none after:absolute after:inset-0 after:rounded-lg group-hover:underline group-hover:underline-offset-4">
                  {research.latest.title.trim() || "Untitled notebook"}
                </Link>
              </h3>
              <p className="mt-0.5 text-sm text-muted">
                {now && <>Edited {relativeDay(research.latest.updatedAt, now)} · </>}
                {research.count === 1 ? "1 notebook" : `${research.count} notebooks`} on this device
              </p>
            </div>
            <Link
              href="/library"
              className="relative z-10 hidden min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-semibold text-accent hover:bg-accent-soft sm:inline-flex"
            >
              My Library
            </Link>
            <ChevronRight aria-hidden className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 sm:hidden" />
          </article>
        </li>
      )}
    </ul>
  );
}
