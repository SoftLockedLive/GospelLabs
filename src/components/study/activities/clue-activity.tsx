"use client";

/**
 * Clue Investigation: clues are examined one at a time (opening one records
 * it), and the question unlocks once enough have been examined.
 */
import { ChevronDown, Search } from "lucide-react";
import { useId, useState } from "react";
import type { ClueResponse } from "@/domain/study/activities";
import { canAnswerClue, cluesRequired, examineClue } from "@/domain/study/activities/clue";
import type { ActivityOf } from "@/domain/study/content-schema";
import { cn } from "@/lib/cn";
import { SourceKindBadge } from "../shared/provenance";
import { SourceLink } from "../shared/source-card";
import { feedbackFor, markFor, type BodyProps } from "./body";
import { ChoiceQuestion } from "./choice-question";

type Props = BodyProps<ActivityOf<"clue">, ClueResponse>;

export function ClueActivity(props: Props) {
  const { activity, sources, response, onChange, finished } = props;
  const baseId = useId();
  // Examined clues start open; the learner may fold them away again.
  const [closed, setClosed] = useState<ReadonlySet<string>>(() => new Set());
  const required = cluesRequired(activity);
  const examined = new Set(response.examined);
  const ready = canAnswerClue(activity, response) || !!finished;
  const unchanged = (checked: ClueResponse) => JSON.stringify([...checked.answer].sort()) === JSON.stringify([...response.answer].sort());

  function toggle(clueId: string) {
    if (!examined.has(clueId)) {
      if (!finished) onChange(examineClue(response, clueId));
      setClosed((current) => new Set([...current].filter((id) => id !== clueId)));
      return;
    }
    setClosed((current) => {
      const next = new Set(current);
      if (next.has(clueId)) next.delete(clueId);
      else next.add(clueId);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-3 flex flex-wrap items-baseline justify-between gap-2 text-sm text-muted">
          <span>Open each clue and notice what it adds.</span>
          <span aria-live="polite" className="font-mono text-xs text-subtle">
            {examined.size} of {activity.clues.length} examined
          </span>
        </p>
        <ol className="grid gap-2.5 sm:grid-cols-2">
          {activity.clues.map((clue, index) => {
            const isExamined = examined.has(clue.id);
            const isOpen = isExamined && !closed.has(clue.id);
            const panelId = `${baseId}-${clue.id}`;
            const source = clue.sourceId ? sources[clue.sourceId] : undefined;
            return (
              <li key={clue.id} className={cn("rounded-xl border bg-surface", isExamined ? "border-accent/35" : "border-line border-dashed")}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(clue.id)}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full border",
                      isExamined ? "border-accent/50 bg-accent-soft text-accent" : "border-line-strong text-subtle",
                    )}
                  >
                    <Search className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[11px] tracking-wide text-subtle uppercase">Clue {index + 1}</span>
                    <span className="font-medium text-fg">{clue.title}</span>
                  </span>
                  <ChevronDown aria-hidden className={cn("size-4 shrink-0 text-subtle transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <div id={panelId} className="motion-reveal border-t border-line px-3.5 pt-3 pb-3.5">
                    <p className="text-sm leading-relaxed text-fg">{clue.text}</p>
                    {source && (
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <SourceKindBadge kind={source.kind} />
                        <SourceLink source={source}>{source.label}</SourceLink>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className={cn("rounded-xl border border-line bg-surface-sunken p-4 sm:p-5", !ready && "opacity-90")}>
        <ChoiceQuestion
          question={activity.question}
          selected={response.answer}
          onChange={(answer) => onChange({ ...response, answer })}
          markFor={(id) => markFor(props, id, unchanged)}
          feedbackFor={(id) => feedbackFor(props, id, unchanged)}
          finished={finished}
          disabled={!ready}
          note={
            ready
              ? undefined
              : required === activity.clues.length
                ? "Examine every clue to answer."
                : `Examine at least ${required} clues to answer.`
          }
        />
      </div>
    </div>
  );
}
