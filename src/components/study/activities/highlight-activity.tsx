"use client";

/**
 * Highlight: the passage is shown as flowing serif text in which every
 * phrase is a toggle. Phrases are inline elements with button semantics
 * (role="button", aria-pressed) rather than <button>s, because buttons can't
 * wrap across lines like the words of a verse. Enter and Space toggle them.
 */
import { Fragment, type KeyboardEvent } from "react";
import type { HighlightResponse } from "@/domain/study/activities";
import { targetsRequired, toggleChunk } from "@/domain/study/activities/highlight";
import type { ActivityOf } from "@/domain/study/content-schema";
import { cn } from "@/lib/cn";
import { SourceKindBadge } from "../shared/provenance";
import { SourceLink } from "../shared/source-card";
import { feedbackFor, markFor, type BodyProps } from "./body";

type Props = BodyProps<ActivityOf<"highlight">, HighlightResponse>;

export function HighlightActivity(props: Props) {
  const { activity, sources, response, onChange, finished } = props;
  const source = sources[activity.passage];
  const readOnly = !!finished;
  const selected = new Set(response.selected);
  const unchanged = (index: number) => (checked: HighlightResponse) => checked.selected.includes(index) === selected.has(index);
  const required = targetsRequired(activity);
  const wrongFeedback = response.selected.map((index) => feedbackFor(props, String(index), unchanged(index))).find(Boolean);

  // Group chunks by verse, keeping their indices.
  const verses: { number: number; chunks: { index: number; text: string }[] }[] = [];
  activity.chunks.forEach((chunk, index) => {
    const last = verses[verses.length - 1];
    if (last?.number === chunk.verse) last.chunks.push({ index, text: chunk.text });
    else verses.push({ number: chunk.verse, chunks: [{ index, text: chunk.text }] });
  });

  function toggle(index: number) {
    if (!readOnly) onChange(toggleChunk(response, index));
  }

  function onKeyDown(event: KeyboardEvent<HTMLSpanElement>, index: number) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle(index);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="flex flex-wrap justify-between gap-2 text-sm text-muted">
        <span>{readOnly ? "The phrases that answer the question are highlighted." : "Tap each phrase that answers the question. Tap again to unselect."}</span>
        <span aria-live="polite" className="font-mono text-xs text-subtle">
          {response.selected.length} selected{required > 1 && !readOnly ? ` · looking for ${required}` : ""}
        </span>
      </p>

      <figure className="rounded-xl border border-line bg-surface px-4 py-4 sm:px-6 sm:py-5">
        {source && (
          <figcaption className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-fg">{source.label}</span>
            <SourceKindBadge kind={source.kind} />
          </figcaption>
        )}
        <div className="flex flex-col gap-3 font-serif text-[1.05rem] leading-[2.15] text-fg">
          {verses.map((verse) => (
            <p key={`${verse.number}-${verse.chunks[0].index}`}>
              <sup className="mr-1 font-sans text-[0.7rem] font-semibold text-subtle">{verse.number}</sup>
              {verse.chunks.map((chunk, i) => {
                const isSelected = selected.has(chunk.index);
                const mark = isSelected ? markFor(props, String(chunk.index), unchanged(chunk.index)) : undefined;
                const revealed = finished === "revealed";
                return (
                  <Fragment key={chunk.index}>
                    {i > 0 && " "}
                    <span
                      role="button"
                      tabIndex={readOnly ? -1 : 0}
                      aria-pressed={isSelected}
                      aria-disabled={readOnly || undefined}
                      onClick={() => toggle(chunk.index)}
                      onKeyDown={(event) => onKeyDown(event, chunk.index)}
                      className={cn(
                        "rounded-md px-0.5 py-1 [box-decoration-break:clone] transition-colors [-webkit-box-decoration-break:clone]",
                        !readOnly && "cursor-pointer hover:bg-surface-raised",
                        // A faint dotted underline marks each tappable phrase, so its boundaries show on touch screens (no hover).
                        !readOnly && !isSelected && "underline decoration-line-strong decoration-dotted decoration-1 underline-offset-[5px]",
                        isSelected && "bg-accent-soft underline decoration-accent decoration-2 underline-offset-[5px]",
                        mark === "correct" && (revealed ? "bg-accent-soft decoration-accent" : "bg-green-soft decoration-green"),
                        mark === "incorrect" && "bg-danger-soft decoration-danger decoration-wavy",
                      )}
                    >
                      {chunk.text}
                      {mark === "incorrect" && <span className="sr-only"> (look again)</span>}
                      {mark === "correct" && <span className="sr-only"> ({revealed ? "answer" : "fits"})</span>}
                    </span>
                  </Fragment>
                );
              })}
            </p>
          ))}
        </div>
        {source && <SourceLink source={source} className="mt-3" />}
      </figure>
      {wrongFeedback && <p className="motion-reveal text-sm leading-relaxed text-fg">{wrongFeedback}</p>}
    </div>
  );
}
