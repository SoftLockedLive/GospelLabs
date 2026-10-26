"use client";

import { useId } from "react";
import { CONNECT_FORMAT_DESCRIPTIONS, CONNECT_FORMAT_LABELS, CONNECT_FORMATS, type ConnectFormat } from "@/domain/study/content-schema";
import { cn } from "@/lib/cn";

/** "See Christ" → ["See", " Christ"], so phones can show the short word while the full name is still read aloud. */
function splitLabel(format: ConnectFormat): [string, string] {
  const label = CONNECT_FORMAT_LABELS[format];
  const space = label.indexOf(" ");
  return space < 0 ? [label, ""] : [label.slice(0, space), label.slice(space)];
}

interface FormatPickerProps {
  value: ConnectFormat;
  /** Today's format in the rotation, marked "Today". */
  today: ConnectFormat;
  onChange: (format: ConnectFormat) => void;
  /** Formats that have sessions. Others are left out. */
  available: readonly ConnectFormat[];
}

/**
 * The three ways to spend these minutes, as native radio buttons (arrow keys
 * move between them). The chosen format's description is shown below.
 */
export function FormatPicker({ value, today, onChange, available }: FormatPickerProps) {
  const name = useId();
  const formats = CONNECT_FORMATS.filter((format) => available.includes(format));
  return (
    <fieldset className="mt-8 min-w-0">
      <legend className="sr-only">Choose a way to spend these minutes</legend>
      <div
        className="mx-auto grid max-w-md gap-1 rounded-2xl border border-sacred-line p-1"
        style={{ gridTemplateColumns: `repeat(${formats.length}, minmax(0, 1fr))` }}
      >
        {formats.map((format) => {
          const selected = format === value;
          const [first, rest] = splitLabel(format);
          return (
            <label
              key={format}
              className={cn(
                "motion-press flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-xl px-1 py-1.5 text-center text-sm font-medium transition-colors select-none",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                selected ? "bg-surface text-fg shadow-soft" : "text-sacred-muted hover:text-sacred-fg",
              )}
            >
              <input
                type="radio"
                name={name}
                value={format}
                checked={selected}
                onChange={() => onChange(format)}
                className="sr-only"
              />
              <span>
                {first}
                <span className="sr-only sm:not-sr-only">{rest}</span>
              </span>
              {format === today && (
                <span className={cn("text-[0.6875rem] leading-tight font-normal", selected ? "text-muted" : "text-sacred-muted")}>
                  <span className="sr-only">, </span>Today
                </span>
              )}
            </label>
          );
        })}
      </div>
      <p className="mt-3 text-center text-sm leading-relaxed text-pretty text-sacred-muted">{CONNECT_FORMAT_DESCRIPTIONS[value]}</p>
    </fieldset>
  );
}
