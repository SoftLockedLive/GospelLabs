"use client";

/** Scripture Connections: passages side by side (stacked on phones), then up to three questions. */
import type { ScriptureConnectResponse } from "@/domain/study/activities";
import { questionKey } from "@/domain/study/activities/scripture-connect";
import type { ActivityOf } from "@/domain/study/content-schema";
import { cn } from "@/lib/cn";
import { SourceCard } from "../shared/source-card";
import { feedbackFor, markFor, type BodyProps } from "./body";
import { ChoiceQuestion } from "./choice-question";
import { MarkIcon } from "./marks";

type Props = BodyProps<ActivityOf<"scripture-connect">, ScriptureConnectResponse>;

export function ScriptureConnectActivity(props: Props) {
  const { activity, sources, response, onChange, finished } = props;
  const passages = activity.passages.map((id) => sources[id]).filter((source) => !!source);
  const several = activity.questions.length > 1;

  return (
    <div className="flex flex-col gap-6">
      <div className={cn("grid gap-3", passages.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3")}>
        {passages.map((source) => (
          <SourceCard key={source.id} source={source} headingLevel="h4" className="bg-surface-raised" />
        ))}
      </div>

      <div className="flex flex-col gap-5">
        {activity.questions.map((question, index) => {
          const prefix = questionKey(question.id);
          const selected = response.answers[question.id] ?? [];
          const unchanged = (checked: ScriptureConnectResponse) =>
            JSON.stringify([...(checked.answers[question.id] ?? [])].sort()) === JSON.stringify([...selected].sort());
          return (
            <div key={question.id} className="rounded-xl border border-line bg-surface-sunken p-4 sm:p-5">
              {several && (
                <div className="mb-1 flex justify-end">
                  <MarkIcon mark={markFor(props, question.id, unchanged)} finished={finished} />
                </div>
              )}
              <ChoiceQuestion
                question={question}
                seed={`${activity.id}:${question.id}`}
                number={several ? index + 1 : undefined}
                selected={selected}
                onChange={(next) => onChange({ answers: { ...response.answers, [question.id]: next } })}
                markFor={(id) => markFor(props, prefix + id, unchanged)}
                feedbackFor={(id) => feedbackFor(props, prefix + id, unchanged)}
                finished={finished}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
