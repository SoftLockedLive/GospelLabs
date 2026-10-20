"use client";

import { useId } from "react";
import { CHALLENGE_TYPE_INFO, CHALLENGE_TYPES, type ChallengeType } from "@/domain/research-challenges";
import { cn } from "@/lib/cn";
import { CHALLENGE_ICONS } from "./challenge-icons";

interface ChallengeTypeFilterProps {
  value: ChallengeType | null;
  /** Responses written so far, per type. */
  counts: Record<ChallengeType, number>;
  onChange: (type: ChallengeType | null) => void;
}

/** Chips for choosing which kind of challenge to show. Radio inputs give arrow-key navigation for free. */
export function ChallengeTypeFilter({ value, counts, onChange }: ChallengeTypeFilterProps) {
  const name = useId();
  const options: (ChallengeType | null)[] = [null, ...CHALLENGE_TYPES];

  return (
    // A fieldset won't shrink below its content by default, which would widen the page on phones.
    <fieldset className="min-w-0">
      <legend className="sr-only">Challenge type</legend>
      {/*
        One scrolling row on phones; wraps on wider screens. Vertical padding leaves room for focus
        outlines. Each chip is `relative` so its visually hidden radio stays inside the scrolling row.
      */}
      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {options.map((type) => {
          const selected = value === type;
          const label = type ? CHALLENGE_TYPE_INFO[type].label : "Any type";
          const count = type ? counts[type] : 0;
          const Icon = type ? CHALLENGE_ICONS[type] : null;
          return (
            <label
              key={type ?? "any"}
              title={type ? CHALLENGE_TYPE_INFO[type].description : undefined}
              className={cn(
                "relative inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                selected
                  ? "border-accent/60 bg-accent-soft text-fg"
                  : "border-line-strong text-muted hover:border-accent/40 hover:text-fg",
              )}
            >
              <input
                type="radio"
                name={name}
                checked={selected}
                onChange={() => onChange(type)}
                aria-label={count > 0 ? `${label}, ${count} ${count === 1 ? "response" : "responses"}` : label}
                className="sr-only"
              />
              {Icon && <Icon aria-hidden className="size-3.5" />}
              <span aria-hidden>{label}</span>
              {count > 0 && (
                <span aria-hidden className="font-mono text-xs text-accent">
                  {count}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
