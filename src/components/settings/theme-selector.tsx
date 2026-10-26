"use client";

import { useId, useSyncExternalStore } from "react";
import { ChoiceCard } from "@/components/ui/choice-card";
import {
  THEME_DESCRIPTIONS,
  THEME_LABELS,
  THEME_PREFERENCES,
  readThemePreference,
  setThemePreference,
  subscribeToThemePreference,
  type Theme,
} from "@/lib/theme";

/** Theme cards, each with a small live preview drawn in that theme's own colors. */
export function ThemeSelector() {
  const current = useSyncExternalStore(subscribeToThemePreference, readThemePreference, () => "dark" as const);
  const name = useId();

  return (
    <fieldset>
      <legend className="sr-only">Theme</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {THEME_PREFERENCES.map((value) => (
          <ChoiceCard
            key={value}
            name={name}
            value={value}
            checked={current === value}
            onChange={() => setThemePreference(value)}
            label={THEME_LABELS[value]}
            description={THEME_DESCRIPTIONS[value]}
            preview={
              value === "system" ? (
                <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-line">
                  <ThemePreview theme="dark" bare />
                  <ThemePreview theme="light" bare />
                </div>
              ) : (
                <ThemePreview theme={value} />
              )
            }
          />
        ))}
      </div>
    </fieldset>
  );
}

/**
 * A miniature of the app in one theme. Tokens are scoped by data-theme, so
 * this renders in that theme whatever the page's current theme is.
 */
export function ThemePreview({ theme, bare }: { theme: Theme; bare?: boolean }) {
  return (
    <div data-theme={theme} className={bare ? "bg-canvas p-2" : "overflow-hidden rounded-lg border border-line bg-canvas p-2"}>
      <div className="flex h-16 gap-1.5">
        <div className="flex w-3.5 flex-col items-center gap-1 rounded-md bg-surface py-1.5">
          <span className="size-1.5 rounded-full bg-accent" />
          <span className="size-1.5 rounded-full bg-line-strong" />
          <span className="size-1.5 rounded-full bg-line-strong" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between rounded-md border border-line bg-surface p-1.5">
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-[13px] leading-none text-fg">Aa</span>
            <span className="h-1 flex-1 rounded-full bg-muted/50" />
          </div>
          <span className="h-1 w-4/5 rounded-full bg-subtle/40" />
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-7 rounded-sm bg-accent" />
            <span className="h-2.5 w-4 rounded-sm bg-highlight" />
            <span className="h-2.5 w-3 rounded-sm bg-sacred ring-1 ring-sacred-line" />
          </div>
        </div>
      </div>
    </div>
  );
}
