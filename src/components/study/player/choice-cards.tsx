"use client";

/** A radio group of ChoiceCards with a legend (difficulty, session length). */
import { useId } from "react";
import { ChoiceCard } from "@/components/ui/choice-card";
import { cn } from "@/lib/cn";

export interface ChoiceCardOption<T extends string> {
  value: T;
  label: string;
  description: string;
}

interface ChoiceCardsProps<T extends string> {
  legend: string;
  hint?: string;
  options: readonly ChoiceCardOption<T>[];
  value: T;
  onChange: (value: T) => void;
  columns?: 2 | 4;
}

export function ChoiceCards<T extends string>({ legend, hint, options, value, onChange, columns = 2 }: ChoiceCardsProps<T>) {
  const name = useId();
  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-semibold text-fg">{legend}</legend>
      {hint && <p className="mt-1 text-xs leading-relaxed text-subtle">{hint}</p>}
      <div className={cn("mt-3 grid gap-2.5", columns === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2")}>
        {options.map((option) => (
          <ChoiceCard
            key={option.value}
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
            label={option.label}
            description={option.description}
          />
        ))}
      </div>
    </fieldset>
  );
}
