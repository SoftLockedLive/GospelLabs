"use client";

/**
 * A light difficulty suggestion (see engine/difficulty.ts). It describes the
 * kind of thinking the other level asks for, never the learner, and is only
 * ever applied by the learner's own choice.
 */
import { Lightbulb } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { DifficultySuggestion } from "@/domain/study/engine/difficulty";
import { DIFFICULTY_DESCRIPTIONS, DIFFICULTY_LABELS } from "@/domain/study/vocabulary";

interface DifficultySuggestionBannerProps {
  suggestion: DifficultySuggestion;
  onAccept: () => void;
  onDismiss: () => void;
}

export function DifficultySuggestionBanner({ suggestion, onAccept, onDismiss }: DifficultySuggestionBannerProps) {
  const next = DIFFICULTY_LABELS[suggestion.difficulty];
  const what = DIFFICULTY_DESCRIPTIONS[suggestion.difficulty].toLowerCase();
  return (
    <aside aria-label="A difficulty suggestion" className="motion-reveal rounded-xl border border-line bg-surface-raised p-4 sm:p-5">
      <p className="flex items-start gap-2.5 text-sm leading-relaxed text-fg">
        <Lightbulb aria-hidden className="mt-0.5 size-4 shrink-0 text-amber" />
        <span>
          {suggestion.direction === "up"
            ? `Recent steps have come together readily. ${next} asks you to ${what}. Would you like to try it for the steps ahead?`
            : `${next} asks you to ${what}, which can be a good way into the steps ahead. Would you like to switch?`}
        </span>
      </p>
      <p className="mt-1.5 pl-6.5 text-xs text-subtle">
        Steps you&rsquo;ve finished stay as they are. You can turn these suggestions off in{" "}
        <Link href="/settings/study" className="text-accent hover:underline">
          Settings
        </Link>
        .
      </p>
      <div className="mt-3.5 flex flex-col gap-2 pl-0 sm:flex-row sm:pl-6.5">
        <Button variant="secondary" onClick={onAccept} className="w-full sm:w-auto">
          Switch to {next}
        </Button>
        <Button variant="ghost" onClick={onDismiss} className="w-full sm:w-auto">
          Stay at {DIFFICULTY_LABELS[suggestion.from]}
        </Button>
      </div>
    </aside>
  );
}
