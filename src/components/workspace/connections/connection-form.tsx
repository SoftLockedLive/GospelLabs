"use client";

import { useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/input";
import {
  RELATIONSHIP_PHRASES,
  type ConnectionInput,
  type ConnectionRelationship,
  type Investigation,
} from "@/domain/investigation";
import { canConnect, findConnectionBetween } from "@/domain/investigation-reducer";
import { useUnsavedDraft } from "@/lib/unsaved-work";
import { RelationshipPicker } from "./relationship";

interface ConnectionFormProps {
  investigation: Investigation;
  labels: ReadonlyMap<string, string>;
  /** Preselects the first card (when started from an evidence card's Connect button). */
  initialFromId?: string;
  onSubmit: (input: ConnectionInput) => void;
  onCancel: () => void;
}

type Errors = Partial<Record<"from" | "to" | "relationship", string>>;

const shorten = (text: string, max = 60) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** Creates a connection: first card, relationship, second card, and an optional explanation. */
export function ConnectionForm({ investigation, labels, initialFromId, onSubmit, onCancel }: ConnectionFormProps) {
  const { evidence } = investigation;
  const [fromId, setFromId] = useState(initialFromId ?? "");
  const [toId, setToId] = useState("");
  const [relationship, setRelationship] = useState<ConnectionRelationship | "">("");
  const [explanation, setExplanation] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const formRef = useRef<HTMLFormElement>(null);
  useUnsavedDraft(
    fromId !== (initialFromId ?? "") || toId !== "" || relationship !== "" || explanation !== "",
    "New connection",
  );
  // Start where the user has something to choose. Cleared after the first focus: ref callbacks
  // run on every render, and focus must not jump back here while the user works on the form.
  const autoFocusField = useRef<"from" | "to" | null>(initialFromId ? "to" : "from");
  const describe = (id: string) => {
    const card = evidence.find((item) => item.id === id);
    return card ? `${labels.get(id)} ${card.sourceTitle}` : "";
  };

  const chooseFrom = (id: string) => {
    setFromId(id);
    // The second card can't be the same card, or one it's already connected to.
    if (toId && (toId === id || findConnectionBetween(investigation, id, toId))) setToId("");
    setErrors((current) => ({ ...current, from: undefined }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: Errors = {
      from: fromId ? undefined : "Choose the first piece of evidence.",
      to: toId ? undefined : "Choose the second piece of evidence.",
      relationship: relationship ? undefined : "Choose how they relate.",
    };
    const input = relationship && { fromEvidenceId: fromId, toEvidenceId: toId, relationship, explanation };
    if (input && fromId && toId && !canConnect(investigation, input)) {
      next.to = "These two are already connected. Edit that connection instead.";
    }
    if (input && !next.from && !next.to) return onSubmit(input);
    flushSync(() => setErrors(next));
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], fieldset[data-invalid] input')?.focus();
  };

  const focusOnMount = (field: "from" | "to") => (element: HTMLSelectElement | null) => {
    if (element && autoFocusField.current === field) {
      autoFocusField.current = null;
      element.focus();
    }
  };

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={submit}
      aria-label="New connection"
      className="flex flex-col gap-4 rounded-xl border border-accent/40 bg-surface-sunken/60 p-3 sm:p-4"
    >
      <h4 className="text-sm font-semibold text-fg">New connection</h4>

      <Field label="First piece of evidence" error={errors.from}>
        {(props) => (
          <Select {...props} ref={focusOnMount("from")} value={fromId} onChange={(event) => chooseFrom(event.target.value)}>
            <option value="">Choose evidence…</option>
            {evidence.map((card) => (
              <option key={card.id} value={card.id}>
                {labels.get(card.id)} · {shorten(card.sourceTitle)}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <RelationshipPicker
        value={relationship}
        error={errors.relationship}
        onChange={(value) => {
          setRelationship(value);
          setErrors((current) => ({ ...current, relationship: undefined }));
        }}
      />

      <Field label="Second piece of evidence" error={errors.to}>
        {(props) => (
          <Select
            {...props}
            ref={focusOnMount("to")}
            value={toId}
            onChange={(event) => {
              setToId(event.target.value);
              setErrors((current) => ({ ...current, to: undefined }));
            }}
          >
            <option value="">Choose evidence…</option>
            {evidence
              .filter((card) => card.id !== fromId)
              .map((card) => {
                const taken = Boolean(fromId && findConnectionBetween(investigation, fromId, card.id));
                return (
                  <option key={card.id} value={card.id} disabled={taken}>
                    {labels.get(card.id)} · {shorten(card.sourceTitle)}
                    {taken ? " (already connected)" : ""}
                  </option>
                );
              })}
          </Select>
        )}
      </Field>

      {fromId && toId && relationship && (
        <p className="rounded-lg border border-line bg-surface px-3 py-2 text-sm leading-relaxed text-muted">
          Reads as: <span className="text-fg">{describe(fromId)}</span> {RELATIONSHIP_PHRASES[relationship]}{" "}
          <span className="text-fg">{describe(toId)}</span>
        </p>
      )}

      <Field label="Explanation" optional hint="Why do you see this relationship? In your own words.">
        {(props) => (
          <Textarea {...props} rows={2} value={explanation} onChange={(event) => setExplanation(event.target.value)} />
        )}
      </Field>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Create connection</Button>
      </div>
    </form>
  );
}
