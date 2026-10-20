"use client";

import { TextListEditor } from "../text-list-editor";
import type { SectionProps } from "../types";

export function HypothesisSection({ investigation, actions }: SectionProps) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm leading-relaxed text-muted">
        Writing down what you currently think makes it easier to notice when your study changes your mind. Record
        several possibilities, or skip this step entirely. You can come back and revise them at any time.
      </p>
      <TextListEditor
        items={investigation.hypotheses.map((h) => ({ id: h.id, text: h.statement }))}
        onAdd={actions.addHypothesis}
        onUpdate={actions.updateHypothesis}
        onRemove={actions.removeHypothesis}
        itemLabel="Hypothesis"
        placeholder="My current thinking is…"
        addLabel={investigation.hypotheses.length === 0 ? "Add a hypothesis" : "Add another"}
      />
    </div>
  );
}
