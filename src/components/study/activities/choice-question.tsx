"use client";

/**
 * One choice question (Follow the Clues, Scripture Connections): native
 * radio buttons or checkboxes in large tappable cards, so keyboard, screen
 * reader, and touch behavior come from the platform.
 */
import { useId } from "react";
import type { ItemMark } from "@/domain/study/activities";
import { choiceOptions, toggleChoice } from "@/domain/study/activities/choice";
import type { ChoiceQuestion as Question } from "@/domain/study/content-schema";
import { cn } from "@/lib/cn";
import type { FinishedAs } from "./activity-state";
import { ItemFeedbackText, MarkIcon, markSurface } from "./marks";

interface ChoiceQuestionProps {
  question: Question;
  /** Identifies the question across the app ("<activity id>:<question id>"); fixes its shuffled option order. */
  seed: string;
  selected: readonly string[];
  onChange: (selected: string[]) => void;
  markFor: (optionId: string) => ItemMark | undefined;
  feedbackFor: (optionId: string) => string | undefined;
  finished: FinishedAs;
  disabled?: boolean;
  /** Shown under the prompt, e.g. why the question can't be answered yet. */
  note?: string;
  number?: number;
}

export function ChoiceQuestion({ question, seed, selected, onChange, markFor, feedbackFor, finished, disabled, note, number }: ChoiceQuestionProps) {
  const name = useId();
  const readOnly = !!finished;
  return (
    <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-3 disabled:opacity-60">
      <legend className="mb-3 text-base leading-relaxed font-medium text-fg">
        {number !== undefined && <span className="mr-2 font-semibold tabular-nums text-muted">{`${number}.`}</span>}
        {question.prompt}
        {question.multiple && <span className="mt-1 block text-sm font-normal text-muted">Choose all that apply.</span>}
        {note && <span className="mt-1 block text-sm font-normal text-muted">{note}</span>}
      </legend>
      {choiceOptions(question, seed).map((option) => {
        const checked = selected.includes(option.id);
        const mark = markFor(option.id);
        const feedback = feedbackFor(option.id);
        const feedbackId = `${name}-${option.id}-feedback`;
        return (
          <div key={option.id}>
            <label
              className={cn(
                "flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-relaxed transition-colors",
                checked ? "border-accent/60 bg-accent-soft text-fg" : "border-line bg-surface text-fg hover:border-line-strong hover:bg-surface-raised",
                markSurface(mark, finished),
                readOnly && "cursor-default",
              )}
            >
              <input
                type={question.multiple ? "checkbox" : "radio"}
                name={name}
                value={option.id}
                checked={checked}
                aria-describedby={feedback ? feedbackId : undefined}
                onChange={() => !readOnly && onChange(toggleChoice(question, selected, option.id))}
                className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
              />
              <span className="min-w-0 flex-1">{option.text}</span>
              <MarkIcon mark={checked ? mark : undefined} finished={finished} className="mt-0.5" />
            </label>
            {checked && <ItemFeedbackText id={feedbackId} message={feedback} />}
          </div>
        );
      })}
    </fieldset>
  );
}
