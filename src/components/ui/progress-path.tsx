import { cn } from "@/lib/cn";

export type PathStepStatus = "complete" | "current" | "upcoming";

export interface PathStep {
  id: string;
  /** Shown to assistive technology (and as a tooltip-free title in the detailed variant). */
  label: string;
  status: PathStepStatus;
}

interface ProgressPathProps {
  steps: readonly PathStep[];
  /** Summary read by screen readers, e.g. "Step 3 of 6". Defaults to the current step's position. */
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Where a learner is on a path of steps: completed steps are filled, the
 * current step is ringed, and upcoming steps are hollow. Shows the shape of
 * a study, not a score. Assistive technology hears one summary sentence.
 */
export function ProgressPath({ steps, label, size = "md", className }: ProgressPathProps) {
  const current = steps.findIndex((step) => step.status === "current");
  const summary = label ?? (current >= 0 ? `Step ${current + 1} of ${steps.length}` : `${steps.filter((s) => s.status === "complete").length} of ${steps.length} steps done`);
  const dot = size === "sm" ? "size-2" : "size-2.5";
  return (
    <div role="img" aria-label={summary} className={cn("flex items-center", className)}>
      {steps.map((step, index) => (
        <div key={step.id} className={cn("flex items-center", index > 0 && "flex-1")}>
          {index > 0 && (
            <span
              aria-hidden
              className={cn(
                "h-px min-w-2 flex-1",
                size === "sm" ? "mx-0.5" : "mx-1",
                step.status === "upcoming" ? "bg-line-strong" : "bg-accent/70",
              )}
            />
          )}
          <span
            aria-hidden
            className={cn(
              "shrink-0 rounded-full transition-colors",
              dot,
              step.status === "complete" && "bg-accent",
              step.status === "current" && "bg-accent ring-4 ring-accent-soft",
              step.status === "upcoming" && "border border-line-strong bg-transparent",
            )}
          />
        </div>
      ))}
    </div>
  );
}

/** Builds path steps from counts: `done` completed, then the current step, then the rest. */
export function pathFromCounts(total: number, currentIndex: number): PathStep[] {
  return Array.from({ length: Math.max(total, 0) }, (_, index) => ({
    id: String(index),
    label: `Step ${index + 1}`,
    status: index < currentIndex ? "complete" : index === currentIndex ? "current" : "upcoming",
  }));
}
