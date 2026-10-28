"use client";

/** Vocabulary Matching: terms with meanings, scriptural examples, or both (one board each). */
import type { VocabMatchResponse } from "@/domain/study/activities";
import { asksExamples, asksMeanings, exampleOptions, matchTerm, meaningOptions, type VocabPart } from "@/domain/study/activities/vocab-match";
import type { ActivityOf } from "@/domain/study/content-schema";
import { feedbackFor, markFor, type BodyProps } from "./body";
import { MatchBoard } from "./match-board";

type Props = BodyProps<ActivityOf<"vocab-match">, VocabMatchResponse>;

export function VocabMatchActivity(props: Props) {
  const { activity, sources, response, onChange, finished } = props;
  const both = activity.match === "both";
  const field = (part: VocabPart) => (part === "meaning" ? "meanings" : "examples");
  const unchanged = (part: VocabPart, id: string) => (checked: VocabMatchResponse) => checked[field(part)][id] === response[field(part)][id];

  const board = (part: VocabPart) => {
    const options = (part === "meaning" ? meaningOptions(activity) : exampleOptions(activity)).map((option) => ({
      id: option.key,
      text: option.text,
      detail: option.sourceId ? sources[option.sourceId]?.label : undefined,
    }));
    const terms = part === "meaning" ? activity.pairs : activity.pairs.filter((pair) => pair.example);
    return (
      <MatchBoard
        leftLabel="Term"
        rightLabel={part === "meaning" ? "Meaning" : "Example"}
        left={terms.map((pair) => ({ id: pair.id, text: pair.term }))}
        right={options}
        value={response[field(part)]}
        exclusive
        serifRight={part === "example"}
        onToggle={(termId, optionKey) => onChange(matchTerm(response, part, termId, optionKey))}
        markFor={(id) => markFor(props, `${id}:${part}`, unchanged(part, id))}
        feedbackFor={(id) => feedbackFor(props, `${id}:${part}`, unchanged(part, id))}
        finished={finished}
      />
    );
  };

  if (!both) return board(asksMeanings(activity) ? "meaning" : "example");
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby={`${activity.id}-meanings`}>
        <h4 id={`${activity.id}-meanings`} className="mb-3 text-sm font-semibold text-fg">
          <span className="mr-2 font-semibold tabular-nums text-muted">1.</span>Match each term with its meaning
        </h4>
        {board("meaning")}
      </section>
      {asksExamples(activity) && (
        <section aria-labelledby={`${activity.id}-examples`}>
          <h4 id={`${activity.id}-examples`} className="mb-3 text-sm font-semibold text-fg">
            <span className="mr-2 font-semibold tabular-nums text-muted">2.</span>Match each term with a scriptural example
          </h4>
          {board("example")}
        </section>
      )}
    </div>
  );
}
