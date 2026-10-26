"use client";

/**
 * The main path of the investigation as a row of steps. Any visited step,
 * and the next unfinished one, can be opened; the rest are shown but can't be
 * jumped to yet. Status is shown by icon and text, never color alone.
 */
import { ArrowRight, Check, Eye } from "lucide-react";
import { useEffect, useRef } from "react";
import type { StudyInvestigation } from "@/domain/study/content-schema";
import { mainPath, mainPathIndex } from "@/domain/study/engine/path";
import { canOpenStep, stepStatus, type StepStatus } from "@/domain/study/engine/status";
import type { StudyProgress } from "@/domain/study/user-data";
import { cn } from "@/lib/cn";

const STATUS_TEXT: Record<StepStatus, string> = {
  unvisited: "not started",
  started: "in progress",
  complete: "completed",
  revealed: "completed with the answer shown",
  skipped: "moved on",
};

interface ProgressPathProps {
  investigation: StudyInvestigation;
  progress: StudyProgress;
  onOpen: (stepId: string) => void;
}

export function ProgressPath({ investigation, progress, onOpen }: ProgressPathProps) {
  const listRef = useRef<HTMLOListElement>(null);
  const path = mainPath(investigation, progress.length);
  const currentIndex = mainPathIndex(investigation, progress);
  const inBranch = !!progress.position.branchId;

  // On narrow screens the path scrolls sideways; keep the current step in view.
  useEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>("[data-current]");
    if (!list || !active || list.scrollWidth <= list.clientWidth) return;
    list.scrollLeft = active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2;
  }, [currentIndex]);

  return (
    <nav aria-label="Investigation steps">
      {/* `relative` keeps each step's screen-reader text (absolutely positioned) inside this scrolling list;
          without it, the hidden text of steps scrolled out of view widens the whole page. */}
      <ol ref={listRef} className="scrollbar-none relative -mx-1 flex items-center gap-1 overflow-x-auto px-1 py-1">
        {path.map((step, index) => {
          const ref = { stepId: step.id };
          const status = stepStatus(progress, ref);
          const current = index === currentIndex;
          const here = current && !inBranch;
          const openable = canOpenStep(investigation, progress, ref) && !here;
          return (
            <li key={step.id} className="flex shrink-0 items-center gap-1">
              {index > 0 && <span aria-hidden className={cn("h-px w-3 sm:w-5", status === "unvisited" ? "bg-line-strong" : "bg-accent/50")} />}
              <button
                type="button"
                data-current={current || undefined}
                aria-current={here ? "step" : undefined}
                disabled={!openable && !here}
                onClick={() => openable && onOpen(step.id)}
                className={cn(
                  "group flex min-h-11 min-w-11 items-center gap-2 rounded-full px-1 text-left text-xs transition-colors disabled:cursor-not-allowed lg:pr-3",
                  here ? "bg-accent-soft text-fg" : openable ? "text-muted hover:bg-surface-raised hover:text-fg" : "text-subtle",
                )}
              >
                <StepDot n={index + 1} status={status} current={current} />
                <span className={cn("hidden max-w-[11rem] truncate lg:inline", here && "font-medium")}>{step.title}</span>
                <span className="sr-only">
                  {`Step ${index + 1}: ${step.title}, ${STATUS_TEXT[status]}${here ? " (current)" : current ? " (you'll return here)" : ""}`}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StepDot({ n, status, current }: { n: number; status: StepStatus; current: boolean }) {
  const base = "flex size-8 shrink-0 items-center justify-center rounded-full border font-mono text-[11px]";
  if (status === "complete")
    return (
      <span aria-hidden className={cn(base, "border-green/50 bg-green-soft text-green", current && "ring-2 ring-accent/50")}>
        <Check className="size-3.5" />
      </span>
    );
  if (status === "revealed")
    return (
      <span aria-hidden className={cn(base, "border-accent/40 bg-accent-soft text-accent", current && "ring-2 ring-accent/50")}>
        <Eye className="size-3.5" />
      </span>
    );
  if (status === "skipped")
    return (
      <span aria-hidden className={cn(base, "border-dashed border-line-strong text-muted", current && "ring-2 ring-accent/50")}>
        <ArrowRight className="size-3.5" />
      </span>
    );
  return (
    <span
      aria-hidden
      className={cn(base, current ? "border-accent bg-accent text-accent-fg" : status === "started" ? "border-accent/60 text-accent" : "border-line-strong text-subtle")}
    >
      {n}
    </span>
  );
}
