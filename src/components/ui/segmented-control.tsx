"use client";

import type { LucideIcon } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Extra text after the label, e.g. "5–10 min". Read as part of the option's name. */
  detail?: string;
  icon?: LucideIcon;
}

interface SegmentedControlProps<T extends string> {
  /** Names the group for assistive technology (and is shown when `showLabel`). */
  label: string;
  showLabel?: boolean;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "md" | "lg";
  className?: string;
}

/**
 * A small set of mutually exclusive choices shown side by side (for example
 * Quick / Deep). Built on native radio buttons, so arrow keys move between
 * options and screen readers announce "1 of 2, selected".
 */
export function SegmentedControl<T extends string>({
  label,
  showLabel,
  options,
  value,
  onChange,
  size = "md",
  className,
}: SegmentedControlProps<T>) {
  const name = useId();
  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className={cn(showLabel ? "mb-2 text-sm font-medium text-fg" : "sr-only")}>{label}</legend>
      <div className="inline-flex w-full rounded-xl border border-line-strong bg-surface-sunken p-1 sm:w-auto">
        {options.map((option) => {
          const selected = option.value === value;
          const Icon = option.icon;
          return (
            <label
              key={option.value}
              className={cn(
                "motion-press relative flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors select-none sm:flex-none sm:px-4",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                size === "lg" ? "min-h-12" : "min-h-11",
                selected ? "bg-surface text-fg shadow-soft ring-1 ring-accent/80" : "text-muted hover:text-fg",
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {Icon && <Icon aria-hidden className={cn("hidden size-4 shrink-0 min-[400px]:block", selected && "text-accent")} />}
              <span className="truncate">{option.label}</span>
              {option.detail && <span className={cn("text-xs font-normal", selected ? "text-muted" : "text-subtle")}>{option.detail}</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
