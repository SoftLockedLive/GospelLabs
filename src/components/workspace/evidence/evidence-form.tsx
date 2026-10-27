"use client";

import { useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import {
  parseEvidenceForm,
  toEvidenceFormValues,
  type EvidenceFormErrors,
  type EvidenceFormValues,
} from "@/domain/evidence-input";
import { useUnsavedDraft } from "@/lib/unsaved-work";
import { EVIDENCE_SOURCE_TYPES, SOURCE_TYPE_LABELS, type EvidenceInput, type EvidenceSourceType } from "@/domain/investigation";

interface EvidenceFormProps {
  heading: string;
  initial?: Partial<EvidenceInput>;
  submitLabel: string;
  onSubmit: (input: EvidenceInput) => void;
  onCancel: () => void;
}

export function EvidenceForm({ heading, initial, submitLabel, onSubmit, onCancel }: EvidenceFormProps) {
  const [initialValues] = useState<EvidenceFormValues>(() => toEvidenceFormValues(initial));
  const [values, setValues] = useState<EvidenceFormValues>(initialValues);
  const [errors, setErrors] = useState<EvidenceFormErrors>({});
  const formRef = useRef<HTMLFormElement>(null);
  useUnsavedDraft(JSON.stringify(values) !== JSON.stringify(initialValues), heading);
  // Start in the first field that still needs the user's input.
  const firstEmptyRef = useRef(initial?.sourceTitle ? "observation" : "sourceTitle");

  const set = <K extends keyof EvidenceFormValues>(field: K, value: EvidenceFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = parseEvidenceForm(values);
    if (result.ok) {
      onSubmit(result.input);
      return;
    }
    flushSync(() => setErrors(result.errors));
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  };

  const autoFocus = (field: string) => (element: HTMLElement | null) => {
    if (element && firstEmptyRef.current === field) {
      firstEmptyRef.current = "";
      element.focus();
    }
  };

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={submit}
      aria-label={heading}
      className="flex flex-col gap-5 rounded-xl border border-accent/40 bg-surface-sunken/60 p-4 sm:p-5"
    >
      <h3 className="text-sm font-semibold text-fg">{heading}</h3>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-[12rem_1fr]">
        <Field label="Source type">
          {(props) => (
            <Select
              {...props}
              value={values.sourceType}
              onChange={(event) => set("sourceType", event.target.value as EvidenceSourceType)}
            >
              {EVIDENCE_SOURCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {SOURCE_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Source title or reference" error={errors.sourceTitle}>
          {(props) => (
            <Input
              {...props}
              ref={autoFocus("sourceTitle")}
              placeholder="e.g. Alma 32:21–43"
              value={values.sourceTitle}
              onChange={(event) => set("sourceTitle", event.target.value)}
            />
          )}
        </Field>
      </div>

      <Field
        label="Link"
        optional
        error={errors.sourceUrl}
        hint="A link you add yourself. Gospel Labs doesn’t check or verify it."
      >
        {(props) => (
          <Input
            {...props}
            type="url"
            inputMode="url"
            placeholder="https://www.churchofjesuschrist.org/study/…"
            value={values.sourceUrl}
            onChange={(event) => set("sourceUrl", event.target.value)}
          />
        )}
      </Field>

      <Field label="Observation" error={errors.observation} hint="What does the source actually say or show?">
        {(props) => (
          <Textarea
            {...props}
            ref={autoFocus("observation")}
            rows={3}
            placeholder="In your own words"
            value={values.observation}
            onChange={(event) => set("observation", event.target.value)}
          />
        )}
      </Field>

      <Field label="Relevance" optional hint="How does this bear on your question? You can add this later.">
        {(props) => (
          <Textarea
            {...props}
            rows={2}
            value={values.relevance}
            onChange={(event) => set("relevance", event.target.value)}
          />
        )}
      </Field>

      <Field label="Tags" optional hint="Separate with commas.">
        {(props) => (
          <Input
            {...props}
            placeholder="faith, grace"
            value={values.tags}
            onChange={(event) => set("tags", event.target.value)}
          />
        )}
      </Field>

      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
