"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import type { EvidenceCard, HighlightInput } from "@/domain/investigation";
import { useUnsavedDraft } from "@/lib/unsaved-work";

interface DiscoveryDialogProps {
  open: boolean;
  title: string;
  description?: string;
  submitLabel: string;
  initial?: HighlightInput;
  evidence: readonly EvidenceCard[];
  labels: ReadonlyMap<string, string>;
  onSubmit: (input: HighlightInput) => void;
  onClose: () => void;
}

export const DISCOVERY_TITLE_MAX = 100;

/** Saves or edits a discovery: a short title, the insight, and optionally the evidence it came from. */
export function DiscoveryDialog({ open, title, description, submitLabel, ...formProps }: DiscoveryDialogProps) {
  const formId = useId();
  return (
    <Dialog
      open={open}
      onClose={formProps.onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={formProps.onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            {submitLabel}
          </Button>
        </>
      }
    >
      {/* The dialog renders its content only while open, so the form starts fresh each time. */}
      <DiscoveryForm id={formId} label={title} {...formProps} />
    </Dialog>
  );
}

function DiscoveryForm({
  id,
  label,
  initial,
  evidence,
  labels,
  onSubmit,
}: Pick<DiscoveryDialogProps, "initial" | "evidence" | "labels" | "onSubmit"> & { id: string; label: string }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [insight, setInsight] = useState(initial?.insight ?? "");
  const [linked, setLinked] = useState<ReadonlySet<string>>(() => new Set(initial?.evidenceIds));
  const [error, setError] = useState<string>();
  useUnsavedDraft(
    title !== (initial?.title ?? "") ||
      insight !== (initial?.insight ?? "") ||
      [...linked].sort().join() !== [...(initial?.evidenceIds ?? [])].sort().join(),
    label,
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("Give your discovery a short title.");
      event.currentTarget.querySelector<HTMLInputElement>("input[type=text]")?.focus();
      return;
    }
    onSubmit({
      title: title.trim(),
      insight: insight.trim(),
      // Keep the evidence list's order, whatever order the boxes were ticked in.
      evidenceIds: evidence.filter((card) => linked.has(card.id)).map((card) => card.id),
    });
  };

  const toggle = (evidenceId: string, checked: boolean) =>
    setLinked((current) => {
      const next = new Set(current);
      if (checked) next.add(evidenceId);
      else next.delete(evidenceId);
      return next;
    });

  return (
    <form id={id} noValidate onSubmit={submit} className="flex flex-col gap-5">
      <Field label="Title" error={error} hint={`A few words to recognize it by, up to ${DISCOVERY_TITLE_MAX} characters.`}>
        {(props) => (
          <Input
            {...props}
            type="text"
            data-autofocus
            maxLength={DISCOVERY_TITLE_MAX}
            placeholder="e.g. Forgiveness came before the cross"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (error) setError(undefined);
            }}
          />
        )}
      </Field>

      <Field label="Insight" optional hint="What did you notice or come to understand?">
        {(props) => <Textarea {...props} rows={4} value={insight} onChange={(event) => setInsight(event.target.value)} />}
      </Field>

      <fieldset className="min-w-0">
        <legend className="flex items-baseline gap-2 text-sm font-medium text-fg">
          Related evidence <span className="text-xs font-normal text-subtle">Optional</span>
        </legend>
        {evidence.length === 0 ? (
          <p className="mt-1.5 text-xs leading-relaxed text-subtle">
            No evidence yet. You can link evidence later by editing this discovery.
          </p>
        ) : (
          <ul className="mt-2 flex max-h-48 flex-col gap-1 overflow-y-auto rounded-lg border border-line p-1">
            {evidence.map((card) => (
              <li key={card.id}>
                <label className="flex min-h-9 cursor-pointer items-center gap-3 rounded-md px-2.5 py-1.5 text-sm hover:bg-surface-raised">
                  <input
                    type="checkbox"
                    checked={linked.has(card.id)}
                    onChange={(event) => toggle(card.id, event.target.checked)}
                    className="size-4 shrink-0 accent-accent"
                  />
                  <span className="font-mono text-xs text-accent">{labels.get(card.id)}</span>
                  <span className="min-w-0 truncate text-fg">{card.sourceTitle}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
    </form>
  );
}
