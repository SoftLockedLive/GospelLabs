"use client";

/**
 * A step's phase (Question → Evidence → Discovery → Understanding) and, when
 * tagged, the method of learning it practices (Elder Corbridge's four
 * methods), whose description opens in place. The phase has no number: next
 * to "Step 4 of 6" a "3" read as another step count.
 *
 * Shown from `sm` up only: on a phone a step opens with just its title, intro,
 * and activity, so the question is the first thing in view rather than labels
 * around it.
 */
import { Info } from "lucide-react";
import { useId, useState } from "react";
import { LEARNING_METHOD_DESCRIPTIONS, LEARNING_METHOD_LABELS, PHASE_LABELS, type LearningMethod, type Phase } from "@/domain/study/vocabulary";
import { cn } from "@/lib/cn";

export function StepTags({ phase, method }: { phase: Phase; method?: LearningMethod }) {
  const [open, setOpen] = useState(false);
  const descriptionId = useId();
  return (
    <div className="hidden flex-col gap-2 sm:flex">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent-soft px-2.5 py-0.5 font-mono text-[11px] tracking-wide text-accent uppercase">
          <span className="sr-only">Phase: </span>
          {PHASE_LABELS[phase]}
        </span>
        {method && (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={descriptionId}
            onClick={() => setOpen((value) => !value)}
            className={cn(
              "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
              open ? "border-line-strong bg-surface-raised text-fg" : "border-line text-muted hover:border-line-strong hover:text-fg",
            )}
          >
            <span className="sr-only">Method of learning: </span>
            {LEARNING_METHOD_LABELS[method]}
            <Info aria-hidden className="size-3.5" />
          </button>
        )}
      </div>
      {method && open && (
        <p id={descriptionId} className="motion-reveal max-w-xl text-xs leading-relaxed text-muted">
          {LEARNING_METHOD_DESCRIPTIONS[method]} One of the methods of learning Elder Lawrence E. Corbridge described, which all begin with a
          question.
        </p>
      )}
    </div>
  );
}
