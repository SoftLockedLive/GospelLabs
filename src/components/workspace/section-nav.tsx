"use client";

import { Check } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Investigation, SectionId } from "@/domain/investigation";
import { sectionHasContent } from "@/domain/progress";
import { SECTIONS } from "@/domain/sections";
import { cn } from "@/lib/cn";

interface SectionNavProps {
  investigation: Investigation;
  current: SectionId;
  onSelect: (section: SectionId) => void;
}

/**
 * Step navigation for the five sections. Every section is always reachable;
 * the check mark only indicates that something has been written there.
 */
export function SectionNav({ investigation, current, onSelect }: SectionNavProps) {
  const listRef = useRef<HTMLOListElement>(null);

  // On narrow screens the steps scroll horizontally; keep the active one visible.
  useEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!list || !active || list.scrollWidth <= list.clientWidth) return;
    list.scrollLeft = active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2;
  }, [current]);

  return (
    <nav aria-label="Notebook sections">
      <ol
        ref={listRef}
        className="scrollbar-none relative -ml-4 flex gap-1 overflow-x-auto pl-4 sm:-ml-6 sm:pl-6 lg:-ml-10 lg:pl-10 xl:ml-0 xl:flex-col xl:pl-0"
      >
        {SECTIONS.map((section) => {
          const active = section.id === current;
          const filled = sectionHasContent(investigation, section.id);
          return (
            <li key={section.id} className="shrink-0">
              <button
                type="button"
                aria-current={active ? "step" : undefined}
                onClick={() => onSelect(section.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors xl:py-2.5",
                  active ? "bg-accent-soft text-fg" : "text-muted hover:bg-surface-raised hover:text-fg",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border font-semibold tabular-nums text-[11px]",
                    active
                      ? "border-accent bg-accent text-accent-fg"
                      : filled
                        ? "border-accent/50 text-accent"
                        : "border-line-strong text-subtle",
                  )}
                >
                  {filled && !active ? <Check className="size-3" /> : section.step}
                </span>
                <span className="font-medium whitespace-nowrap">{section.title}</span>
                {filled && <span className="sr-only">(has notes)</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
