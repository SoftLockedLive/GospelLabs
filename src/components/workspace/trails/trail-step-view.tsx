"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Check,
  CornerDownRight,
  ExternalLink,
  Plus,
  Scale,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { Ref } from "react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import type { TrailStep } from "@/domain/discovery-trails";
import { evidenceDraftFromReference } from "@/domain/evidence-input";
import type { EvidenceCard, EvidenceInput, SectionId, TrailStepProgress } from "@/domain/investigation";
import { getSection } from "@/domain/sections";

interface TrailStepViewProps {
  step: TrailStep;
  index: number;
  total: number;
  /** The user's notes on this step, if any. */
  notes?: TrailStepProgress;
  evidence: readonly EvidenceCard[];
  /** Titles of the other steps, for connection links. */
  stepTitles: ReadonlyMap<string, { index: number; title: string }>;
  headingRef: Ref<HTMLHeadingElement>;
  onDiscoveriesChange: (text: string) => void;
  onExploredChange: (explored: boolean) => void;
  onGoToStep: (index: number) => void;
  onRecord: (draft: Partial<EvidenceInput>) => void;
  onNavigate: (section: SectionId) => void;
}

function TrailList({ icon: Icon, title, hint, items }: { icon: LucideIcon; title: string; hint: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h5 className="flex items-center gap-2 text-sm font-medium text-fg">
        <Icon aria-hidden className="size-4 text-accent" />
        {title}
      </h5>
      <p className="mt-0.5 text-xs text-subtle">{hint}</p>
      <ul className="mt-2.5 flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-muted marker:text-subtle">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/** One step of a discovery trail: what to read, what the text states, what's open, and the user's notes. */
export function TrailStepView({
  step,
  index,
  total,
  notes,
  evidence,
  stepTitles,
  headingRef,
  onDiscoveriesChange,
  onExploredChange,
  onGoToStep,
  onRecord,
  onNavigate,
}: TrailStepViewProps) {
  const isRecorded = (url: string | undefined, label: string) =>
    evidence.some((card) => (url && card.sourceUrl === url) || card.sourceTitle === label);
  const headingId = `trail-step-${step.id}`;

  return (
    <article aria-labelledby={headingId} className="min-w-0 rounded-lg border border-line bg-surface p-3.5 sm:p-5">
      <p className="font-mono text-[11px] tracking-[0.14em] text-accent uppercase">
        Step {index + 1} of {total}
      </p>
      <h4
        ref={headingRef}
        id={headingId}
        tabIndex={-1}
        className="mt-2 scroll-mt-40 text-lg font-semibold tracking-tight text-fg focus:outline-none"
      >
        {step.title}
      </h4>
      <p className="mt-1.5 leading-relaxed text-fg">{step.question}</p>

      <div className="mt-5 flex flex-col gap-5">
        {step.references.length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-fg">Read</h5>
            <ul className="mt-1.5 flex flex-col divide-y divide-line">
              {step.references.map((reference) => (
                <li key={reference.label} className="flex flex-wrap items-center justify-between gap-2 py-1.5 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    {reference.url ? (
                      <a
                        href={reference.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-sm py-0.5 text-fg hover:text-accent hover:underline"
                      >
                        {reference.label}
                        <ExternalLink aria-hidden className="size-3 text-subtle" />
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    ) : (
                      <span className="text-fg">{reference.label}</span>
                    )}
                    {isRecorded(reference.url, reference.label) && (
                      <span className="inline-flex items-center gap-1 text-xs text-green">
                        <Check aria-hidden className="size-3" />
                        Recorded
                      </span>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    aria-label={`Record evidence from ${reference.label}`}
                    onClick={() => onRecord(evidenceDraftFromReference(reference))}
                  >
                    <Plus aria-hidden />
                    Record as evidence
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <TrailList
          icon={BookOpenText}
          title="Stated in the text"
          hint="What the passages say, with verse numbers. Quotation marks show exact words."
          items={step.stated}
        />
        <TrailList
          icon={Scale}
          title="Open to interpretation"
          hint="Questions the text leaves for you to weigh. Gospel Labs doesn’t answer them."
          items={step.interpretation}
        />
        <TrailList icon={Sparkles} title="To reflect on" hint="Optional and personal." items={step.reflection} />

        {step.connections.length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-fg">Connects to</h5>
            <ul className="mt-1.5 flex flex-col gap-2">
              {step.connections.map((connection) => {
                const target = stepTitles.get(connection.stepId);
                if (!target) return null;
                return (
                  <li key={connection.stepId} className="flex gap-2 text-sm">
                    <CornerDownRight aria-hidden className="mt-1.5 size-3.5 shrink-0 text-subtle" />
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onGoToStep(target.index)}
                        className="rounded-sm py-0.5 text-left font-medium text-accent hover:underline"
                      >
                        Step {target.index + 1}: {target.title}
                      </button>
                      <p className="text-muted">{connection.note}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <Field label="Your notes" hint="Saved with this notebook as you type. Write as much or as little as you like.">
          {(props) => (
            <Textarea
              {...props}
              rows={4}
              placeholder="What I noticed, what surprised me, what I’m still unsure about…"
              value={notes?.discoveries ?? ""}
              onChange={(event) => onDiscoveriesChange(event.target.value)}
            />
          )}
        </Field>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex min-h-8 cursor-pointer items-center gap-2.5 rounded-lg text-sm text-fg">
            <input
              type="checkbox"
              checked={notes?.explored ?? false}
              onChange={(event) => onExploredChange(event.target.checked)}
              className="size-4 accent-accent"
            />
            I&rsquo;ve explored this step
          </label>
          {step.recordIn && (
            <Button variant="ghost" size="sm" onClick={() => onNavigate(step.recordIn!)}>
              Continue in {getSection(step.recordIn).title}
              <ArrowRight aria-hidden />
            </Button>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <Button variant="secondary" size="sm" disabled={index === 0} onClick={() => onGoToStep(index - 1)}>
          <ArrowLeft aria-hidden />
          Previous
        </Button>
        <Button variant="secondary" size="sm" disabled={index === total - 1} onClick={() => onGoToStep(index + 1)}>
          Next
          <ArrowRight aria-hidden />
        </Button>
      </div>
    </article>
  );
}
