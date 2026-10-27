import { ChevronRight, FlaskConical, GitBranch } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
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
  "group relative flex items-center gap-4 rounded-xl border bg-surface p-4 transition-colors has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent hover:border-accent/40 hover:bg-surface-raised sm:px-5";

/** Other investigations in progress, and a way back into the research notebook. */
export function ContinueList({ items, research, now }: ContinueListProps) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map(({ investigation, progress }, index) => {
        const position = studyPosition(progress, investigation);
        return (
          <li key={investigation.id} className="motion-reveal" style={{ "--motion-index": index } as CSSProperties}>
            <article className={`${rowClasses} border-line`}>
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] leading-snug font-semibold text-fg">
                  <Link href={resumeInvestigationHref(investigation.id)} className="outline-none after:absolute after:inset-0 after:rounded-xl">
                    {investigation.title}
                  </Link>
                </h3>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                  {position.inBranch ? (
                    <span className="inline-flex items-center gap-1">
                      <GitBranch aria-hidden className="size-3.5 text-accent" />
                      In a side question
                    </span>
                  ) : (
                    <span>
                      Step {position.step} of {position.total}
                    </span>
                  )}
                  <span aria-hidden className="text-subtle">
                    ·
                  </span>
                  <span>{progress.length === "deep" ? "Deep study" : "Quick study"}</span>
                  {now && (
                    <>
                      <span aria-hidden className="text-subtle">
                        ·
                      </span>
                      <span className="text-subtle">Studied {relativeDay(progress.updatedAt, now)}</span>
                    </>
                  )}
                </p>
                <ProgressPath
                  size="sm"
                  steps={pathFromCounts(position.total, Math.max(position.step - 1, 0))}
                  label={`Step ${position.step} of ${position.total}`}
                  className="mt-3 max-w-60"
                />
              </div>
              <ChevronRight aria-hidden className="size-5 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
            </article>
          </li>
        );
      })}
      {research && (
        <li className="motion-reveal" style={{ "--motion-index": items.length } as CSSProperties}>
          <article className={`${rowClasses} border-dashed border-line-strong`}>
            <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-muted">
              <FlaskConical className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-subtle">Research notebook</p>
              <h3 className="mt-0.5 truncate text-[15px] leading-snug font-semibold text-fg">
                <Link href={investigationHref(research.latest.id)} className="outline-none after:absolute after:inset-0 after:rounded-xl">
                  {research.latest.title.trim() || "Untitled notebook"}
                </Link>
              </h3>
              <p className="mt-1 text-xs text-muted">
                {now && <>Edited {relativeDay(research.latest.updatedAt, now)} · </>}
                {research.count === 1 ? "1 notebook" : `${research.count} notebooks`} on this device
              </p>
            </div>
            <Link
              href="/library"
              className="relative z-10 hidden min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-medium text-accent hover:bg-accent-soft sm:inline-flex"
            >
              My Library
            </Link>
            <ChevronRight aria-hidden className="size-5 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent sm:hidden" />
          </article>
        </li>
      )}
    </ul>
  );
}
