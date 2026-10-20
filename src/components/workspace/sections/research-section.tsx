"use client";

import { FileSearch, Plus } from "lucide-react";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { EvidenceInput } from "@/domain/investigation";
import { countCitations } from "@/domain/investigation-reducer";
import { evidenceLabels } from "../evidence/evidence-label";
import { EvidenceCardView } from "../evidence/evidence-card-view";
import { EvidenceForm } from "../evidence/evidence-form";
import type { SectionProps } from "../types";
import { SuggestedReferences } from "./suggested-references";

type Editor = { mode: "new"; initial?: Partial<EvidenceInput> } | { mode: "edit"; id: string } | null;

export function ResearchSection({ investigation, actions, sourceQuestion }: SectionProps) {
  const [editor, setEditor] = useState<Editor>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const { evidence } = investigation;
  const labels = evidenceLabels(evidence);
  const citations = countCitations(investigation);

  /** Closes the form, then moves focus somewhere that still exists. */
  const closeEditor = (focusEvidenceId?: string) => {
    flushSync(() => setEditor(null));
    const target = focusEvidenceId ? document.getElementById(`evidence-card-${focusEvidenceId}`) : addButtonRef.current;
    target?.focus();
  };

  const startNew = (initial?: Partial<EvidenceInput>) => setEditor({ mode: "new", initial });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm leading-relaxed text-muted">
          Record what each source says and why it matters to your question. Each card is your own observation.
        </p>
        <Button
          ref={addButtonRef}
          size="sm"
          className="self-start"
          disabled={editor?.mode === "new"}
          onClick={() => startNew()}
        >
          <Plus aria-hidden />
          Add evidence
        </Button>
      </div>

      {sourceQuestion && sourceQuestion.suggestedReferences.length > 0 && (
        <SuggestedReferences references={sourceQuestion.suggestedReferences} evidence={evidence} onRecord={startNew} />
      )}

      {editor?.mode === "new" && (
        <EvidenceForm
          key={editor.initial?.sourceTitle ?? "blank"}
          heading="New evidence"
          initial={editor.initial}
          submitLabel="Add evidence"
          onSubmit={(input) => closeEditor(actions.addEvidence(input))}
          onCancel={() => closeEditor()}
        />
      )}

      {evidence.length === 0 && editor?.mode !== "new" ? (
        <EmptyState
          icon={FileSearch}
          title="No evidence yet"
          description="Each evidence card holds a source, what you observed in it, and why it's relevant."
          action={
            <Button variant="secondary" onClick={() => startNew()}>
              <Plus aria-hidden />
              Add your first evidence
            </Button>
          }
        />
      ) : (
        <ul aria-label="Evidence" className="flex flex-col gap-3">
          {evidence.map((card) => (
            <li key={card.id}>
              {editor?.mode === "edit" && editor.id === card.id ? (
                <EvidenceForm
                  heading={`Edit ${labels.get(card.id)}`}
                  initial={card}
                  submitLabel="Save changes"
                  onSubmit={(input) => {
                    actions.updateEvidence(card.id, input);
                    closeEditor(card.id);
                  }}
                  onCancel={() => closeEditor(card.id)}
                />
              ) : (
                <EvidenceCardView
                  card={card}
                  label={labels.get(card.id) ?? ""}
                  citationCount={citations.get(card.id) ?? 0}
                  onEdit={() => setEditor({ mode: "edit", id: card.id })}
                  onDelete={() => actions.removeEvidence(card.id)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
