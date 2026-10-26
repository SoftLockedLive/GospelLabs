"use client";

/**
 * The concepts and words a step works with. Before the step is finished,
 * "Words in this step" explains them from Gospel Labs' curated descriptions
 * (through the study assistant); afterwards they're listed with whether the
 * learner worked them out or saw them suggested.
 */
import { BookText, Sparkles } from "lucide-react";
import { useState } from "react";
import { Disclosure } from "@/components/ui/disclosure";
import type { BundledConcept } from "@/domain/study/engine/bundle";
import { ASSIST_SOURCE_NOTE, type StudyAssistant } from "@/lib/assist";
import { cn } from "@/lib/cn";
import { ProvenanceLabel } from "../shared/provenance";

export function WordsInStep({ concepts, assistant }: { concepts: readonly BundledConcept[]; assistant: StudyAssistant }) {
  const [explanations, setExplanations] = useState<Record<string, string>>({});

  // Explanations come from the study assistant when the panel is first opened.
  function onToggle(open: boolean) {
    if (!open || Object.keys(explanations).length) return;
    Promise.all(concepts.map(async (concept) => [concept.ref, (await assistant.explainTerm(concept.label))?.text ?? concept.description] as const)).then(
      (entries) => setExplanations(Object.fromEntries(entries)),
      () => undefined,
    );
  }

  if (concepts.length === 0) return null;
  return (
    <Disclosure
      onToggle={onToggle}
      summary={
        <span className="flex items-center gap-2">
          <BookText aria-hidden className="size-4 text-accent" />
          Words in this step
        </span>
      }
    >
      <dl className="flex flex-col gap-3">
        {concepts.map((concept) => (
          <div key={concept.ref}>
            <dt className="text-sm font-semibold text-fg">{concept.label}</dt>
            <dd className="mt-0.5 text-sm leading-relaxed text-muted">{explanations[concept.ref] ?? concept.description}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle">
        <ProvenanceLabel provenance="suggested" />
        <span aria-hidden>·</span>
        {ASSIST_SOURCE_NOTE[assistant.kind]}
      </p>
    </Disclosure>
  );
}

/** Concepts of a finished step, with provenance. */
export function StepConceptList({ concepts, demonstrated }: { concepts: readonly BundledConcept[]; demonstrated: boolean }) {
  if (concepts.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold tracking-wide text-muted uppercase">Concepts</span>
        <ProvenanceLabel provenance={demonstrated ? "demonstrated" : "suggested"} />
      </div>
      <ul className="flex flex-wrap gap-2">
        {concepts.map((concept) => (
          <li
            key={concept.ref}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
              demonstrated ? "border-green/35 bg-green-soft text-fg" : "border-line-strong text-muted",
            )}
          >
            {demonstrated && <Sparkles aria-hidden className="size-3 text-green" />}
            {concept.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
