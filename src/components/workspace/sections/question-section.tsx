"use client";

import { Field, Input, Textarea } from "@/components/ui/input";
import { StartingPoints } from "../starting-points";
import { TextListEditor } from "../text-list-editor";
import type { SectionProps } from "../types";

export function QuestionSection({ investigation, actions, sourceQuestion }: SectionProps) {
  return (
    <div className="flex flex-col gap-6">
      {sourceQuestion && <StartingPoints question={sourceQuestion} />}

      <Field label="Question" hint="Phrase it in your own words. A good question is one you genuinely want answered.">
        {(props) => (
          <Textarea
            {...props}
            rows={3}
            placeholder="What do you want to understand?"
            value={investigation.question}
            onChange={(event) => actions.setText("question", event.target.value)}
          />
        )}
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Title" optional>
          {(props) => (
            <Input
              {...props}
              placeholder="A short name for this investigation"
              value={investigation.title}
              onChange={(event) => actions.setText("title", event.target.value)}
            />
          )}
        </Field>
        <Field label="Category" optional>
          {(props) => (
            <Input
              {...props}
              placeholder="e.g. Doctrine of Christ"
              value={investigation.category}
              onChange={(event) => actions.setText("category", event.target.value)}
            />
          )}
        </Field>
      </div>

      <Field label="Context" optional hint="What prompted this question? What do you already know or assume?">
        {(props) => (
          <Textarea
            {...props}
            placeholder="Background, circumstances, or prior understanding"
            value={investigation.context}
            onChange={(event) => actions.setText("context", event.target.value)}
          />
        )}
      </Field>

      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-medium text-fg">
            Subquestions <span className="ml-1 text-xs font-normal text-subtle">Optional</span>
          </h3>
          <p className="mt-1 text-xs text-subtle">Break a large question into smaller ones you can study separately.</p>
        </div>
        <TextListEditor
          items={investigation.subquestions}
          onAdd={actions.addSubquestion}
          onUpdate={actions.updateSubquestion}
          onRemove={actions.removeSubquestion}
          itemLabel="Subquestion"
          placeholder="A narrower question"
          addLabel={investigation.subquestions.length === 0 ? "Add a subquestion" : "Add another"}
        />
      </div>
    </div>
  );
}
