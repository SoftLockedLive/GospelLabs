/**
 * How marks look after a check. Color is never the only signal: every mark
 * has an icon and screen-reader text. Revealed answers use the accent color
 * rather than green, since the learner was shown them rather than finding them.
 */
import { Check, Eye, Search } from "lucide-react";
import type { ItemMark } from "@/domain/study/activities";
import { cn } from "@/lib/cn";
import type { FinishedAs } from "./activity-state";

/** Border and background for an item card with a mark. */
export function markSurface(mark: ItemMark | undefined, finished: FinishedAs): string {
  if (mark === "incorrect") return "border-danger/50 bg-danger-soft";
  if (mark === "correct") return finished === "revealed" ? "border-accent/40 bg-accent-soft" : "border-green/45 bg-green-soft";
  return "";
}

export function MarkIcon({ mark, finished, className }: { mark: ItemMark | undefined; finished: FinishedAs; className?: string }) {
  if (!mark) return null;
  if (mark === "incorrect") {
    return (
      <span className={cn("inline-flex shrink-0 items-center gap-1 text-xs font-medium text-danger", className)}>
        <Search aria-hidden className="size-3.5" />
        Look again
      </span>
    );
  }
  const revealed = finished === "revealed";
  const Icon = revealed ? Eye : Check;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 text-xs font-medium", revealed ? "text-accent" : "text-green", className)}>
      <Icon aria-hidden className="size-3.5" />
      <span className={revealed ? "sr-only" : "sr-only sm:not-sr-only"}>{revealed ? "Answer shown" : "Fits"}</span>
    </span>
  );
}

/** Feedback for one item, pointing back to the evidence. */
export function ItemFeedbackText({ message, id }: { message?: string; id?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="motion-reveal mt-2 text-sm leading-relaxed text-fg">
      {message}
    </p>
  );
}
