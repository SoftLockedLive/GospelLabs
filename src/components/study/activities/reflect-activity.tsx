"use client";

/**
 * An optional reflection. Never checked, scored, or required: "Continue" is
 * always enabled, and writing stays editable afterwards. The text is private
 * to this device and saved through onStateChange.
 */
import { ArrowRight, Feather } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import type { ActivityOf } from "@/domain/study/content-schema";
import { cn } from "@/lib/cn";
import { EvidencePanel } from "./evidence-panel";
import { INITIAL_ACTIVITY_STATE, type ActivityRendererProps, type ActivityState } from "./types";

type Props = Omit<ActivityRendererProps, "activity"> & { activity: ActivityOf<"reflect"> };

export function ReflectActivity({ activity, sources, initialState, onStateChange, onComplete, compact, reflectionInput = true }: Props) {
  const [state, setState] = useState<ActivityState>(() => ({ ...INITIAL_ACTIVITY_STATE, ...initialState }));
  const completedRef = useRef(!!initialState?.completed);
  const promptId = useId();
  const fieldId = useId();
  const evidence = activity.sourceIds.map((id) => sources[id]).filter((source) => !!source);

  function update(next: ActivityState) {
    setState(next);
    onStateChange?.(next);
  }

  function finish() {
    const next = { ...state, completed: true };
    update(next);
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete({ demonstrated: false, revealed: false, skipped: false, attempts: 0, hintsShown: 0, reflection: next.reflection });
  }

  return (
    <section aria-labelledby={promptId} className={cn("flex flex-col", compact ? "gap-4" : "gap-5")}>
      <header>
        <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-accent uppercase">
          <Feather aria-hidden className="size-3.5" />
          Reflection · optional
        </p>
        <h3 id={promptId} className="mt-2 font-serif text-lg leading-relaxed text-fg sm:text-xl">
          {activity.prompt}
        </h3>
      </header>

      <EvidencePanel sources={evidence} />

      {activity.suggestions.length > 0 && (
        <div>
          <p className="text-sm font-medium text-fg">You might think about</p>
          <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-muted marker:text-subtle">
            {activity.suggestions.map((suggestion) => (
              <li key={suggestion}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}

      {reflectionInput ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={fieldId} className="flex items-baseline gap-2 text-sm font-medium text-fg">
            Your thoughts
            <span className="text-xs font-normal text-subtle">Optional</span>
          </label>
          <Textarea
            id={fieldId}
            rows={4}
            value={state.reflection ?? ""}
            onChange={(event) => update({ ...state, reflection: event.target.value })}
            placeholder="Write as much or as little as you like, or simply ponder."
            className="font-serif text-base leading-relaxed"
          />
          <p className="text-xs leading-relaxed text-subtle">Private to this device. Never checked or scored.</p>
        </div>
      ) : (
        <p className="rounded-xl border border-line bg-surface-sunken px-4 py-3 text-sm leading-relaxed text-muted">
          Take a quiet moment with this question. Writing prompts are turned off in Settings.
        </p>
      )}

      {!state.completed && (
        <div>
          <Button size="lg" onClick={finish} className="w-full sm:w-auto">
            Continue
            <ArrowRight aria-hidden />
          </Button>
        </div>
      )}
    </section>
  );
}
