"use client";

/**
 * Sort: each item gets a radio group of the categories (tap a category to
 * place it). Category descriptions are shown first, since they define the
 * sorting; each item's `why` appears once the activity is finished.
 */
import { useId } from "react";
import type { SortResponse } from "@/domain/study/activities";
import { placeItem, sortItems } from "@/domain/study/activities/sort";
import type { ActivityOf } from "@/domain/study/content-schema";
import { cn } from "@/lib/cn";
import { WhyLabel } from "../shared/provenance";
import { feedbackFor, markFor, type BodyProps } from "./body";
import { ItemFeedbackText, MarkIcon, markSurface } from "./marks";

type Props = BodyProps<ActivityOf<"sort">, SortResponse>;

export function SortActivity(props: Props) {
  const { activity, response, onChange, finished } = props;
  const baseId = useId();
  const readOnly = !!finished;
  const placed = Object.keys(response.placements).length;
  const described = activity.categories.some((category) => category.description);

  return (
    <div className="flex flex-col gap-5">
      {described && (
        <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {activity.categories.map((category) => (
            <div key={category.id} className="rounded-xl border border-line bg-surface-sunken px-4 py-3">
              <dt className="text-sm font-semibold text-fg">{category.label}</dt>
              {category.description && <dd className="mt-0.5 text-sm leading-relaxed text-muted">{category.description}</dd>}
            </div>
          ))}
        </dl>
      )}

      <p className="flex justify-between gap-3 text-sm text-muted">
        <span>Choose where each one belongs.</span>
        <span aria-live="polite" className="font-mono text-xs text-subtle">
          {placed} of {activity.items.length} placed
        </span>
      </p>

      <ul className="flex flex-col gap-3">
        {sortItems(activity).map((item) => {
          const unchanged = (checked: SortResponse) => checked.placements[item.id] === response.placements[item.id];
          const mark = markFor(props, item.id, unchanged);
          const feedback = feedbackFor(props, item.id, unchanged);
          const legendId = `${baseId}-${item.id}`;
          return (
            <li key={item.id} className={cn("rounded-xl border bg-surface p-4", mark ? markSurface(mark, finished) : "border-line")}>
              <fieldset aria-labelledby={legendId} className="min-w-0">
                <div className="flex items-start gap-3">
                  <p id={legendId} className="min-w-0 flex-1 text-[0.975rem] leading-relaxed text-fg">
                    {item.text}
                  </p>
                  <MarkIcon mark={mark} finished={finished} className="mt-0.5" />
                </div>
                {/* gap-2.5: wrapped pills put the radios a hair under the 24px spacing small targets need (WCAG 2.5.8). */}
                <div className="mt-3 flex flex-wrap gap-2.5">
                  {activity.categories.map((category) => {
                    const selected = response.placements[item.id] === category.id;
                    return (
                      <label
                        key={category.id}
                        className={cn(
                          "flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm transition-colors",
                          selected ? "border-accent/60 bg-accent-soft text-fg" : "border-line bg-surface-sunken text-muted hover:border-line-strong hover:text-fg",
                          readOnly && "cursor-default",
                        )}
                      >
                        <input
                          type="radio"
                          name={legendId}
                          value={category.id}
                          checked={selected}
                          onChange={() => !readOnly && onChange(placeItem(response, item.id, category.id))}
                          className="size-4 shrink-0 accent-[var(--accent)]"
                        />
                        {category.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              <ItemFeedbackText message={feedback} />
              {finished && (
                <div className="motion-reveal mt-3 rounded-lg bg-surface-sunken px-3 py-2.5">
                  <WhyLabel />
                  <p className="mt-1 text-sm leading-relaxed text-muted">{item.why}</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
