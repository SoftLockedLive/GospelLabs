"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  /** A count or short status after the label. */
  badge?: ReactNode;
  panel: ReactNode;
}

interface TabsProps<T extends string> {
  /** Names the tab list for assistive technology. */
  label: string;
  items: readonly TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Keep inactive panels mounted (hidden), so their state survives switching. Defaults to true. */
  keepMounted?: boolean;
  className?: string;
  listClassName?: string;
}

/**
 * Tabs following the WAI-ARIA tabs pattern: one tab stop for the list,
 * arrow keys (and Home/End) move between tabs and select them, and each
 * panel is labelled by its tab.
 */
export function Tabs<T extends string>({ label, items, value, onChange, keepMounted = true, className, listClassName }: TabsProps<T>) {
  const baseId = useId();
  const tabRefs = useRef(new Map<T, HTMLButtonElement>());
  const tabId = (item: T) => `${baseId}-tab-${item}`;
  const panelId = (item: T) => `${baseId}-panel-${item}`;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = items.findIndex((item) => item.value === value);
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % items.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else return;
    event.preventDefault();
    const target = items[next].value;
    onChange(target);
    tabRefs.current.get(target)?.focus();
  };

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className={cn("scrollbar-none flex gap-1 overflow-x-auto border-b border-line", listClassName)}
      >
        {items.map((item) => {
          const selected = item.value === value;
          return (
            <button
              key={item.value}
              ref={(element) => {
                if (element) tabRefs.current.set(item.value, element);
                else tabRefs.current.delete(item.value);
              }}
              type="button"
              role="tab"
              id={tabId(item.value)}
              aria-selected={selected}
              aria-controls={panelId(item.value)}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(item.value)}
              className={cn(
                "relative -mb-px flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors",
                selected ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg",
              )}
            >
              {item.label}
              {item.badge !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-px font-mono text-[11px] tabular-nums",
                    selected ? "bg-accent-soft text-accent" : "bg-surface-raised text-subtle",
                  )}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {items.map((item) => {
        const selected = item.value === value;
        if (!selected && !keepMounted) return null;
        return (
          <div
            key={item.value}
            role="tabpanel"
            id={panelId(item.value)}
            aria-labelledby={tabId(item.value)}
            hidden={!selected}
            tabIndex={0}
            className="pt-5 focus-visible:outline-offset-4"
          >
            {item.panel}
          </div>
        );
      })}
    </div>
  );
}
