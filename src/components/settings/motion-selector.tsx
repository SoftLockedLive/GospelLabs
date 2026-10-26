"use client";

import { Check, Play, Sparkles } from "lucide-react";
import { useId, useState, useSyncExternalStore, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { ChoiceCard } from "@/components/ui/choice-card";
import { HelpText } from "@/components/ui/help-text";
import { MOTION_LABELS, MOTION_PREFERENCES, updatePreferences, usePreferences, type MotionPreference } from "@/lib/preferences";

const MOTION_DESCRIPTIONS: Record<MotionPreference, string> = {
  system: "Subtle motion, or none when your device asks for reduced motion.",
  full: "Gentle but expressive: content rises into place, confirmations settle, and new discoveries glow.",
  subtle: "Shorter, smaller movements. Feedback without distraction.",
  off: "No animation. Everything simply appears in place.",
};

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Whether the device asks for reduced motion; null while rendering ahead of time. */
function useDeviceReducesMotion(): boolean | null {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => null,
  );
}

export function MotionSelector() {
  const { motion } = usePreferences();
  const reduced = useDeviceReducesMotion();
  const name = useId();
  const [demo, setDemo] = useState(0);

  return (
    <div className="flex flex-col gap-5">
      <fieldset>
        <legend className="sr-only">Motion</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {MOTION_PREFERENCES.map((value) => (
            <ChoiceCard
              key={value}
              name={name}
              value={value}
              checked={motion === value}
              onChange={() => updatePreferences({ motion: value })}
              label={MOTION_LABELS[value]}
              description={MOTION_DESCRIPTIONS[value]}
            />
          ))}
        </div>
      </fieldset>

      {reduced && (
        <HelpText>
          Your device is set to reduce motion, and Gospel Labs always respects that: animation stays off whichever option you
          choose here.
        </HelpText>
      )}

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface-sunken p-3.5">
        <Button variant="secondary" onClick={() => setDemo((n) => n + 1)}>
          <Play aria-hidden />
          Preview motion
        </Button>
        {/* Re-keyed on each press so the animations play again. */}
        <div key={demo} aria-hidden className="flex items-center gap-2">
          <span className="motion-reveal flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-medium text-fg">
            <Sparkles className="size-3.5 text-accent" />
            New card
          </span>
          <span
            style={{ "--motion-index": 2 } as CSSProperties}
            className="motion-reveal flex size-9 items-center justify-center rounded-full bg-green-soft text-green"
          >
            <Check className={demo > 0 ? "motion-success size-4" : "size-4"} strokeWidth={2.5} />
          </span>
          <span className={demo > 0 ? "motion-glow size-9 rounded-full border border-accent/40 bg-accent-soft" : "size-9 rounded-full border border-accent/40 bg-accent-soft"} />
        </div>
      </div>
    </div>
  );
}
