"use client";

import { ArrowDown, ArrowLeftRight, ArrowRight, ArrowUpDown } from "lucide-react";
import { useId } from "react";
import {
  CONNECTION_RELATIONSHIPS,
  isDirectional,
  RELATIONSHIP_LABELS,
  RELATIONSHIP_PHRASES,
  type ConnectionRelationship,
} from "@/domain/investigation";
import { cn } from "@/lib/cn";

const TONES: Record<ConnectionRelationship, string> = {
  supports: "border-green/40 bg-green-soft text-green",
  challenges: "border-amber/40 bg-amber-soft text-amber",
  "raises-question": "border-accent/40 bg-accent-soft text-accent",
  "connects-to": "border-line-strong bg-surface text-muted",
};

/** The relationship between two cards, with an arrow pointing across (wide screens) or down (phones). */
export function RelationshipTag({ relationship }: { relationship: ConnectionRelationship }) {
  const directional = isDirectional(relationship);
  const [Down, Across] = directional ? [ArrowDown, ArrowRight] : [ArrowUpDown, ArrowLeftRight];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONES[relationship],
      )}
    >
      {RELATIONSHIP_PHRASES[relationship]}
      <Down aria-hidden className="size-3.5 sm:hidden" />
      <Across aria-hidden className="hidden size-3.5 sm:block" />
    </span>
  );
}

interface RelationshipPickerProps {
  value: ConnectionRelationship | "";
  onChange: (relationship: ConnectionRelationship) => void;
  error?: string;
}

/** Radio chips for choosing a relationship. Nothing is preselected: the user decides. */
export function RelationshipPicker({ value, onChange, error }: RelationshipPickerProps) {
  const name = useId();
  const errorId = `${name}-error`;
  return (
    // The error is announced through the fieldset; data-invalid lets a form move focus here.
    <fieldset aria-describedby={error ? errorId : undefined} data-invalid={error ? "" : undefined} className="min-w-0">
      <legend className="text-sm font-medium text-fg">Relationship</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {CONNECTION_RELATIONSHIPS.map((relationship) => {
          const selected = value === relationship;
          return (
            <label
              key={relationship}
              className={cn(
                // relative keeps the visually hidden radio inside the chip.
                "relative inline-flex h-8 cursor-pointer items-center rounded-full border px-3 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                selected
                  ? "border-accent/60 bg-accent-soft text-fg"
                  : "border-line-strong text-muted hover:border-accent/40 hover:text-fg",
              )}
            >
              <input
                type="radio"
                name={name}
                value={relationship}
                checked={selected}
                onChange={() => onChange(relationship)}
                className="sr-only"
              />
              {RELATIONSHIP_LABELS[relationship]}
            </label>
          );
        })}
      </div>
      {error && (
        <p id={errorId} className="mt-2 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
