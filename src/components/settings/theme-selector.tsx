"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import {
  readThemePreference,
  setThemePreference,
  subscribeToThemePreference,
  type ThemePreference,
} from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeSelector() {
  const current = useSyncExternalStore(subscribeToThemePreference, readThemePreference, () => "dark" as const);

  return (
    <fieldset>
      <legend className="sr-only">Theme</legend>
      <div className="grid grid-cols-3 gap-2 sm:max-w-md">
        {OPTIONS.map(({ value, label, icon: Icon }) => {
          const selected = current === value;
          return (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-2 rounded-lg border px-3 py-3.5 text-sm font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                selected
                  ? "border-accent/60 bg-accent-soft text-fg"
                  : "border-line-strong text-muted hover:border-accent/40 hover:text-fg",
              )}
            >
              <input
                type="radio"
                name="theme"
                value={value}
                checked={selected}
                onChange={() => setThemePreference(value)}
                className="sr-only"
              />
              <Icon aria-hidden className={cn("size-5", selected && "text-accent")} />
              {label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
