"use client";

import { Compass, FileText, Route, Spline, type LucideIcon } from "lucide-react";
import { useRef, type KeyboardEvent } from "react";
import type { ResearchActivity } from "@/domain/investigation";
import { cn } from "@/lib/cn";

export interface ActivityTab {
  id: ResearchActivity;
  /** A short count or progress shown on the tab, e.g. "4" or "2/5". */
  count?: string;
  /** What the count means, for screen readers, e.g. "4 cards". */
  countLabel?: string;
}

const LABELS: Record<ResearchActivity, { label: string; icon: LucideIcon }> = {
  discover: { label: "Discover", icon: Route },
  challenges: { label: "Challenges", icon: Compass },
  evidence: { label: "Evidence", icon: FileText },
  connections: { label: "Connections", icon: Spline },
};

export const activityTabId = (id: ResearchActivity) => `research-tab-${id}`;
export const activityPanelId = (id: ResearchActivity) => `research-panel-${id}`;

interface ResearchActivityTabsProps {
  tabs: readonly ActivityTab[];
  active: ResearchActivity;
  onSelect: (id: ResearchActivity) => void;
}

/**
 * Tabs for the Research activities (ARIA tabs pattern): one tab stop, arrow
 * keys and Home/End move between tabs and select them. All panels stay
 * mounted, so switching never loses unsaved input.
 */
export function ResearchActivityTabs({ tabs, active, onSelect }: ResearchActivityTabsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (event: KeyboardEvent) => {
    const index = tabs.findIndex((tab) => tab.id === active);
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % tabs.length
        : event.key === "ArrowLeft"
          ? (index - 1 + tabs.length) % tabs.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? tabs.length - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    onSelect(tabs[next].id);
    listRef.current?.querySelector<HTMLElement>(`#${activityTabId(tabs[next].id)}`)?.focus();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Research activities"
      onKeyDown={onKeyDown}
      className={cn(
        "grid gap-1 rounded-xl border border-line bg-surface-sunken/60 p-1",
        tabs.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3",
      )}
    >
      {tabs.map((tab) => {
        const { label, icon: Icon } = LABELS[tab.id];
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            id={activityTabId(tab.id)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={activityPanelId(tab.id)}
            aria-label={tab.countLabel ? `${label}, ${tab.countLabel}` : label}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(tab.id)}
            className={cn(
              "flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[11px] font-medium transition-colors sm:flex-row sm:gap-2 sm:px-3 sm:text-sm",
              selected ? "bg-surface text-fg shadow-sm ring-1 ring-accent/40" : "text-muted hover:bg-surface hover:text-fg",
            )}
          >
            <span aria-hidden className="flex items-center gap-1.5">
              <Icon className={cn("size-4 shrink-0", selected ? "text-accent" : "text-subtle")} />
              {tab.count && <span className="font-semibold tabular-nums text-[11px] text-accent sm:hidden">{tab.count}</span>}
            </span>
            <span aria-hidden className="max-w-full truncate">
              {label}
            </span>
            {tab.count && (
              <span aria-hidden className="hidden font-semibold tabular-nums text-muted sm:inline">
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
