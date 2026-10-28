"use client";

import Link from "next/link";
import { useId, useSyncExternalStore } from "react";
import { ChoiceCard } from "@/components/ui/choice-card";
import {
  DEFAULT_THEME_PREFERENCE,
  readThemePreference,
  setThemePreference,
  subscribeToThemePreference,
  SYSTEM_THEMES,
  THEME_DESCRIPTIONS,
  THEME_LABELS,
  THEME_PREFERENCES,
  type Theme,
  type ThemePreference,
} from "@/lib/theme";

const useThemePreference = () => useSyncExternalStore(subscribeToThemePreference, readThemePreference, () => DEFAULT_THEME_PREFERENCE);

/** Theme cards, each with a small live preview drawn in that theme's own colors. */
export function ThemeSelector() {
  const current = useThemePreference();
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
            preview={<ThemeChoicePreview value={value} />}
          />
        ))}
      </div>
    </fieldset>
  );
}

/** The looks offered where a learner first meets the new design: their device's choice, Daylight, and Evening. */
const QUICK_LOOKS: readonly ThemePreference[] = ["system", "light", "evening"];

/**
 * "Choose your look", in the welcome and in What's new for 3.0: follow the device, Daylight, or Evening, so
 * nobody has to go looking for a darker screen at night. Someone on Lab or Parchment sees theirs as a fourth
 * choice, already selected. Every look is in Settings › Appearance.
 */
export function LookChoice() {
  const current = useThemePreference();
  const name = useId();
  const looks = QUICK_LOOKS.includes(current) ? QUICK_LOOKS : [...QUICK_LOOKS, current];
  return (
    <fieldset>
      <legend className="text-[0.9375rem] font-semibold text-fg">Choose your look</legend>
      <div className={looks.length > 3 ? "mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4" : "mt-2 grid grid-cols-3 gap-2"}>
        {looks.map((value) => (
          <ChoiceCard
            key={value}
            name={name}
            value={value}
            checked={current === value}
            onChange={() => setThemePreference(value)}
            label={THEME_LABELS[value]}
            preview={<ThemeChoicePreview value={value} />}
            className="gap-2 p-2"
          />
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">
        Change it any time in{" "}
        <Link href="/settings/appearance" className="text-accent underline underline-offset-2 hover:text-accent-strong">
          Settings › Appearance
        </Link>
        , where Lab and Parchment are too.
      </p>
    </fieldset>
  );
}

/** A preview for a choice: the theme itself, or both of the device's themes side by side. */
function ThemeChoicePreview({ value }: { value: ThemePreference }) {
  if (value !== "system") return <ThemePreview theme={value} />;
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-line">
      <ThemePreview theme={SYSTEM_THEMES.light} bare />
      <ThemePreview theme={SYSTEM_THEMES.dark} bare />
    </div>
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
