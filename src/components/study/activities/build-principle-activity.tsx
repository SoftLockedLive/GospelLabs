"use client";

/**
 * Build the Principle: tap pieces to add them to the statement, then order
 * them with Move up / Move down, or take one out. The assembled sentence is
 * shown as it will read. Focus follows the piece being moved or removed.
 */
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { BuildPrincipleResponse } from "@/domain/study/activities";
import { assembleSentence, fragmentOptions, moveFragment } from "@/domain/study/activities/build-principle";
import type { ActivityOf } from "@/domain/study/content-schema";
import { cn } from "@/lib/cn";
import { feedbackFor, markFor, type BodyProps } from "./body";
import { ItemFeedbackText, MarkIcon, markSurface } from "./marks";

type Props = BodyProps<ActivityOf<"build-principle">, BuildPrincipleResponse>;

/** Where focus should go after a change, as a selector inside this activity. */
type FocusTarget = { selector: string; fallback?: string } | null;

const iconButton =
  "flex size-11 shrink-0 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-surface-raised hover:text-fg disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent sm:size-9";

export function BuildPrincipleActivity(props: Props) {
  const { activity, response, onChange, finished } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const [focusTarget, setFocusTarget] = useState<FocusTarget>(null);
  const [announcement, setAnnouncement] = useState("");
  const textOf = (id: string) => activity.fragments.find((fragment) => fragment.id === id)?.text ?? "";
  const pieces = fragmentOptions(activity).filter((fragment) => !response.order.includes(fragment.id));
  const sentence = assembleSentence(response.order.map(textOf));
  const readOnly = !!finished;
  // Fragment marks only depend on the fragment itself (distractor or not), but still go stale once the order changes.
  const unchanged = (checked: BuildPrincipleResponse) => checked.order.join(" ") === response.order.join(" ");

  // Each change sets a new target object, so this runs once per change, after the list has updated.
  useEffect(() => {
    if (!focusTarget) return;
    const root = rootRef.current;
    const element = root?.querySelector<HTMLElement>(focusTarget.selector) ?? (focusTarget.fallback ? root?.querySelector<HTMLElement>(focusTarget.fallback) : null);
    element?.focus();
  }, [focusTarget]);

  function add(id: string, index: number) {
    onChange({ order: [...response.order, id] });
    setAnnouncement(`Added “${textOf(id)}”.`);
    // The tapped piece leaves the list; focus the piece that takes its place.
    const next = pieces[index + 1] ?? pieces[index - 1];
    setFocusTarget(next ? { selector: `[data-piece="${next.id}"]` } : { selector: `[data-placed="${id}"][data-action="remove"]` });
  }

  function move(index: number, delta: -1 | 1) {
    const id = response.order[index];
    onChange(moveFragment(response, index, delta));
    setAnnouncement(`Moved “${textOf(id)}” to position ${index + delta + 1} of ${response.order.length}.`);
    const action = delta < 0 ? "up" : "down";
    const other = delta < 0 ? "down" : "up";
    setFocusTarget({ selector: `[data-placed="${id}"][data-action="${action}"]:not(:disabled)`, fallback: `[data-placed="${id}"][data-action="${other}"]` });
  }

  function remove(index: number) {
    const id = response.order[index];
    const order = response.order.filter((_, i) => i !== index);
    onChange({ order });
    setAnnouncement(`Took out “${textOf(id)}”.`);
    const neighbor = order[index] ?? order[index - 1];
    setFocusTarget(neighbor ? { selector: `[data-placed="${neighbor}"][data-action="remove"]` } : { selector: `[data-piece="${id}"]` });
  }

  return (
    <div ref={rootRef} className="flex flex-col gap-5">
      <section aria-labelledby={`${activity.id}-statement`} className="rounded-xl border border-line bg-surface-sunken p-4 sm:p-5">
        <h4 id={`${activity.id}-statement`} className="text-xs font-semibold tracking-wide text-muted uppercase">
          Your principle
        </h4>
        <p aria-live="polite" className={cn("mt-2 min-h-7 font-serif text-lg leading-relaxed", sentence ? "text-fg" : "text-subtle")}>
          {sentence || "Tap the pieces below to build a statement the evidence supports."}
        </p>

        {response.order.length > 0 && (
          <ol className="mt-4 flex flex-col gap-2">
            {response.order.map((id, index) => {
              const mark = markFor(props, id, unchanged);
              const feedback = feedbackFor(props, id, unchanged);
              return (
                <li key={id} className={cn("rounded-lg border bg-surface", mark ? markSurface(mark, finished) : "border-line")}>
                  <div className="flex items-center gap-2 py-1 pr-1 pl-3">
                    <span aria-hidden className="w-5 shrink-0 font-mono text-xs text-accent">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 py-1.5 text-sm leading-relaxed text-fg">{textOf(id)}</span>
                    <MarkIcon mark={mark} finished={finished} />
                    {!readOnly && (
                      <span className="flex shrink-0">
                        <button
                          type="button"
                          data-placed={id}
                          data-action="up"
                          disabled={index === 0}
                          onClick={() => move(index, -1)}
                          aria-label={`Move “${textOf(id)}” earlier`}
                          className={iconButton}
                        >
                          <ArrowUp aria-hidden className="size-4" />
                        </button>
                        <button
                          type="button"
                          data-placed={id}
                          data-action="down"
                          disabled={index === response.order.length - 1}
                          onClick={() => move(index, 1)}
                          aria-label={`Move “${textOf(id)}” later`}
                          className={iconButton}
                        >
                          <ArrowDown aria-hidden className="size-4" />
                        </button>
                        <button
                          type="button"
                          data-placed={id}
                          data-action="remove"
                          onClick={() => remove(index)}
                          aria-label={`Take out “${textOf(id)}”`}
                          className={iconButton}
                        >
                          <X aria-hidden className="size-4" />
                        </button>
                      </span>
                    )}
                  </div>
                  {feedback && (
                    <div className="px-3 pb-2.5">
                      <ItemFeedbackText message={feedback} />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {!readOnly && (
        <section aria-labelledby={`${activity.id}-pieces`}>
          <h4 id={`${activity.id}-pieces`} className="mb-2.5 text-xs font-semibold tracking-wide text-muted uppercase">
            Pieces
          </h4>
          {pieces.length ? (
            <ul className="flex flex-wrap gap-2">
              {pieces.map((fragment, index) => (
                <li key={fragment.id} className="max-w-full">
                  <button
                    type="button"
                    data-piece={fragment.id}
                    onClick={() => add(fragment.id, index)}
                    className="flex min-h-11 max-w-full items-start gap-2 rounded-lg border border-line-strong bg-surface px-3 py-2.5 text-left text-sm leading-snug text-fg transition-colors hover:border-accent/50 hover:bg-surface-raised"
                  >
                    <Plus aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
                    <span className="min-w-0">
                      <span className="sr-only">Add: </span>
                      {fragment.text}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-subtle">Every piece is in use. Take one out to change your principle.</p>
          )}
        </section>
      )}

      {finished && (
        <p className="motion-reveal rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 font-serif text-lg leading-relaxed text-fg">
          {activity.statement}
        </p>
      )}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
