"use client";

import { ArrowRightLeft, Pencil, Trash2 } from "lucide-react";
import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import {
  isDirectional,
  RELATIONSHIP_PHRASES,
  SOURCE_TYPE_LABELS,
  type ConnectionInput,
  type EvidenceCard,
  type EvidenceConnection,
} from "@/domain/investigation";
import { RelationshipPicker, RelationshipTag } from "./relationship";

interface ConnectionItemProps {
  connection: EvidenceConnection;
  from: EvidenceCard;
  to: EvidenceCard;
  labels: ReadonlyMap<string, string>;
  onChange: (input: ConnectionInput) => void;
  onRemove: () => void;
  onOpenEvidence: (evidenceId: string) => void;
}

function EvidenceEnd({ card, label, onOpen }: { card: EvidenceCard; label: string; onOpen: () => void }) {
  const type = SOURCE_TYPE_LABELS[card.sourceType];
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${label}, ${type}: ${card.sourceTitle}`}
      className="flex min-w-0 flex-col items-start gap-0.5 rounded-lg border border-line bg-surface px-3 py-2 text-left transition-colors hover:border-accent/50"
    >
      <span className="flex items-center gap-2 text-xs">
        <span className="font-mono text-accent">{label}</span>
        <span className="text-subtle">{type}</span>
      </span>
      <span className="line-clamp-2 max-w-full text-sm font-medium break-words text-fg">{card.sourceTitle}</span>
    </button>
  );
}

/**
 * One connection: two evidence cards joined by a labeled relationship. In
 * edit mode, every change is applied (and autosaved) as it's made.
 */
export function ConnectionItem({ connection, from, to, labels, onChange, onRemove, onOpenEvidence }: ConnectionItemProps) {
  const [editing, setEditing] = useState(false);
  const editRef = useRef<HTMLButtonElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const sentenceId = useId();
  const fromLabel = labels.get(from.id) ?? "";
  const toLabel = labels.get(to.id) ?? "";
  const sentence = `${fromLabel} ${from.sourceTitle} ${RELATIONSHIP_PHRASES[connection.relationship]} ${toLabel} ${to.sourceTitle}`;
  const current: ConnectionInput = {
    fromEvidenceId: connection.fromEvidenceId,
    toEvidenceId: connection.toEvidenceId,
    relationship: connection.relationship,
    explanation: connection.explanation,
  };

  const startEditing = () => {
    flushSync(() => setEditing(true));
    editorRef.current?.querySelector<HTMLInputElement>("input:checked")?.focus();
  };
  const stopEditing = () => {
    flushSync(() => setEditing(false));
    editRef.current?.focus();
  };

  return (
    <article
      id={`connection-${connection.id}`}
      tabIndex={-1}
      aria-labelledby={sentenceId}
      className="scroll-mt-40 rounded-xl border border-line bg-surface-sunken/40 p-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:p-4"
    >
      <p id={sentenceId} className="sr-only">
        {sentence}
      </p>
      <div className="flex flex-col items-stretch gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-3">
        <EvidenceEnd card={from} label={fromLabel} onOpen={() => onOpenEvidence(from.id)} />
        <div className="flex justify-center">
          <RelationshipTag relationship={connection.relationship} />
        </div>
        <EvidenceEnd card={to} label={toLabel} onOpen={() => onOpenEvidence(to.id)} />
      </div>

      {editing ? (
        <div ref={editorRef} className="mt-3 flex flex-col gap-4 border-t border-line pt-3">
          <RelationshipPicker
            value={connection.relationship}
            onChange={(relationship) => onChange({ ...current, relationship })}
          />
          {isDirectional(connection.relationship) && (
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() =>
                onChange({ ...current, fromEvidenceId: connection.toEvidenceId, toEvidenceId: connection.fromEvidenceId })
              }
            >
              <ArrowRightLeft aria-hidden />
              Swap direction
            </Button>
          )}
          <Field label="Explanation" optional hint="Changes are saved as you make them.">
            {(props) => (
              <Textarea
                {...props}
                rows={2}
                value={connection.explanation}
                onChange={(event) => onChange({ ...current, explanation: event.target.value })}
              />
            )}
          </Field>
          <Button variant="secondary" size="sm" className="self-end" onClick={stopEditing}>
            Done
          </Button>
        </div>
      ) : (
        <div className="mt-2 flex items-start justify-between gap-2">
          {connection.explanation ? (
            <p className="min-w-0 pt-1.5 text-sm leading-relaxed break-words whitespace-pre-line text-muted">
              {connection.explanation}
            </p>
          ) : (
            <span />
          )}
          <div className="flex shrink-0 gap-1">
            <Button
              ref={editRef}
              variant="ghost"
              size="sm"
              className="size-8 px-0"
              aria-label={`Edit connection: ${sentence}`}
              onClick={startEditing}
            >
              <Pencil aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="size-8 px-0 hover:text-danger"
              aria-label={`Delete connection: ${sentence}`}
              onClick={onRemove}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}
