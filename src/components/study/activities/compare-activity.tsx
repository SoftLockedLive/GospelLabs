"use client";

/**
 * Compare Perspectives: one radio group per perspective with the three
 * verdicts. A perspective's rationale appears once it is judged correctly,
 * and for every perspective once the activity is finished.
 */
import { useId } from "react";
import type { CompareResponse } from "@/domain/study/activities";
import type { ActivityOf } from "@/domain/study/content-schema";
import { VERDICT_LABELS, VERDICTS, type Verdict } from "@/domain/study/vocabulary";
import { cn } from "@/lib/cn";
import { WhyLabel } from "../shared/provenance";
import { feedbackFor, markFor, type BodyProps } from "./body";
import { ItemFeedbackText, MarkIcon, markSurface } from "./marks";

type Props = BodyProps<ActivityOf<"compare">, CompareResponse>;

export function CompareActivity(props: Props) {
  const { activity, response, onChange, finished } = props;
  const baseId = useId();
  const readOnly = !!finished;

  return (
    <ol className="flex flex-col gap-4">
      {activity.perspectives.map((perspective, index) => {
        const unchanged = (checked: CompareResponse) => checked.verdicts[perspective.id] === response.verdicts[perspective.id];
        const mark = markFor(props, perspective.id, unchanged);
        const feedback = feedbackFor(props, perspective.id, unchanged);
        const chosen = response.verdicts[perspective.id];
        const legendId = `${baseId}-${perspective.id}`;
        return (
          <li key={perspective.id} className={cn("rounded-xl border bg-surface p-4 sm:p-5", mark ? markSurface(mark, finished) : "border-line")}>
            <fieldset aria-labelledby={legendId} className="min-w-0">
              <div id={legendId} className="flex items-start gap-3">
                <span aria-hidden className="mt-0.5 font-semibold tabular-nums text-muted">
                  {`${index + 1}.`}
                </span>
                <div className="min-w-0 flex-1">
                  {perspective.voice && <p className="kicker text-muted">{perspective.voice}</p>}
                  <p className="mt-0.5 text-[0.975rem] leading-relaxed text-fg">{perspective.text}</p>
                </div>
                <MarkIcon mark={mark} finished={finished} className="mt-0.5" />
              </div>
              <div className="mt-3.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {VERDICTS.map((verdict: Verdict) => {
                  const selected = chosen === verdict;
                  return (
                    <label
                      key={verdict}
                      className={cn(
                        "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm leading-snug transition-colors",
                        selected ? "border-accent/60 bg-accent-soft text-fg" : "border-line bg-surface-sunken text-muted hover:border-line-strong hover:text-fg",
                        readOnly && "cursor-default",
                      )}
                    >
                      <input
                        type="radio"
                        name={legendId}
                        value={verdict}
                        checked={selected}
                        onChange={() => !readOnly && onChange({ verdicts: { ...response.verdicts, [perspective.id]: verdict } })}
                        className="size-4 shrink-0 accent-[var(--accent)]"
                      />
                      {VERDICT_LABELS[verdict]}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <ItemFeedbackText message={feedback} />
            {(finished || mark === "correct") && (
              <div className="motion-reveal mt-3 rounded-lg bg-surface-sunken px-3 py-2.5">
                <WhyLabel />
                <p className="mt-1 text-sm leading-relaxed text-muted">{perspective.rationale}</p>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
