"use client";

/**
 * Renders any study activity with the shared chrome: prompt, evidence,
 * Check, feedback that points back to the evidence, progressive hints,
 * "Show me" and "Continue anyway" after three attempts, and a calm success
 * state with the explanation (labeled as suggested by Gospel Labs).
 *
 * The component owns the activity's state while it is on screen, restores it
 * from `initialState`, and reports every meaningful change through
 * `onStateChange` and the end through `onComplete` (once). Answer checking
 * itself is pure (src/domain/study/activities) and tested there.
 */
import { ArrowRight, CircleCheck, Compass, Eye, Lightbulb } from "lucide-react";
import { useId, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import { Button } from "@/components/ui/button";
import { isComplete, parseResponse } from "@/domain/study/activities";
import { ACTIVITY_TYPE_LABELS, type Activity, type CheckedActivity as CheckedActivityType } from "@/domain/study/content-schema";
import { evidencePointer, helpOptions, hintsOf } from "@/domain/study/engine/hints";
import { DIFFICULTY_LABELS } from "@/domain/study/vocabulary";
import { ASSIST_SOURCE_NOTE, type AssistResponse } from "@/lib/assist";
import { cn } from "@/lib/cn";
import { ProvenanceLabel } from "../shared/provenance";
import {
  applyCheck,
  applyHint,
  applyReveal,
  finishedAs,
  isStaleWrong,
  restoreActivityState,
  restoredCheck,
  resultOf,
  type CheckedResponse,
} from "./activity-state";
import type { BodyProps } from "./body";
import { BuildPrincipleActivity } from "./build-principle-activity";
import { ClueActivity } from "./clue-activity";
import { CompareActivity } from "./compare-activity";
import { EvidenceConnectActivity } from "./evidence-connect-activity";
import { EvidencePanel } from "./evidence-panel";
import { HighlightActivity } from "./highlight-activity";
import { ReflectActivity } from "./reflect-activity";
import { ScriptureConnectActivity } from "./scripture-connect-activity";
import { SortActivity } from "./sort-activity";
import type { ActivityRendererProps, ActivityState } from "./types";
import { VocabMatchActivity } from "./vocab-match-activity";

export function ActivityRenderer(props: ActivityRendererProps) {
  const { activity } = props;
  if (activity.type === "reflect") return <ReflectActivity {...props} activity={activity} />;
  return <CheckedActivityView {...props} activity={activity} />;
}

/** Sources the body shows itself (passages), so the evidence panel doesn't repeat them. */
function shownInBody(activity: Activity): string[] {
  if (activity.type === "highlight") return [activity.passage];
  if (activity.type === "scripture-connect") return activity.passages;
  return [];
}

/** Renders the body for the activity's type. Each body narrows `response` to its own format. */
function Body(props: BodyProps<CheckedActivityType, unknown>) {
  const { activity } = props;
  // The response was parsed for this activity (parseResponse), so it has the type's format.
  const cast = <A, R>(p: BodyProps<CheckedActivityType, unknown>) => p as unknown as BodyProps<A, R>;
  switch (activity.type) {
    case "evidence-connect":
      return <EvidenceConnectActivity {...cast(props)} activity={activity} />;
    case "clue":
      return <ClueActivity {...cast(props)} activity={activity} />;
    case "build-principle":
      return <BuildPrincipleActivity {...cast(props)} activity={activity} />;
    case "compare":
      return <CompareActivity {...cast(props)} activity={activity} />;
    case "scripture-connect":
      return <ScriptureConnectActivity {...cast(props)} activity={activity} />;
    case "vocab-match":
      return <VocabMatchActivity {...cast(props)} activity={activity} />;
    case "sort":
      return <SortActivity {...cast(props)} activity={activity} />;
    case "highlight":
      return <HighlightActivity {...cast(props)} activity={activity} />;
  }
}

type CheckedProps = Omit<ActivityRendererProps, "activity"> & { activity: CheckedActivityType };

function CheckedActivityView({ activity, sources, difficulty, initialState, onStateChange, onComplete, allowSkip, compact, moreHelp }: CheckedProps) {
  const [state, setState] = useState<ActivityState>(() => restoreActivityState(activity, initialState));
  const [checked, setChecked] = useState<CheckedResponse | null>(() => restoredCheck(activity, restoreActivityState(activity, initialState)));
  const [extraHelp, setExtraHelp] = useState<AssistResponse | null>(null);
  const [helpLoading, setHelpLoading] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const completedRef = useRef(!!initialState?.completed);
  const finishRef = useRef<HTMLDivElement>(null);
  const promptId = useId();

  const response = useMemo(() => parseResponse(activity, state.response), [activity, state.response]);
  const finished = finishedAs(state);
  const staleWrong = isStaleWrong(checked, state.response);
  const help = helpOptions(activity, { ...state, lastCheckWrong: staleWrong }, { allowSkip: allowSkip && !skipped });
  const hints = hintsOf(activity).slice(0, state.hintsShown);
  const ready = isComplete(activity, response);
  const showSummary = !!checked && (finished !== null || staleWrong);

  const hidden = new Set(shownInBody(activity));
  const evidence = activity.sourceIds.filter((id) => !hidden.has(id)).map((id) => sources[id]).filter((source) => !!source);

  function update(next: ActivityState) {
    setState(next);
    onStateChange?.(next);
  }

  function complete(next: ActivityState) {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete(resultOf(next));
    // Focus moves to the result, since the buttons the learner used are gone.
    requestAnimationFrame(() => finishRef.current?.focus());
  }

  function onCheck() {
    const { state: next, checked: result } = applyCheck(activity, state);
    setChecked(result);
    update(next);
    if (next.completed) complete(next);
  }

  function onHint() {
    update(applyHint(state, hintsOf(activity).length));
  }

  async function onMoreHelp() {
    setHelpLoading(true);
    try {
      const reply = moreHelp
        ? await moreHelp(activity, state)
        : ({ provenance: "suggested", ...evidencePointer(activity, sources) } satisfies AssistResponse);
      if (reply.hintIndex !== undefined && reply.hintIndex >= state.hintsShown) onHint();
      else setExtraHelp(reply);
    } catch {
      setExtraHelp({ provenance: "suggested", ...evidencePointer(activity, sources) });
    } finally {
      setHelpLoading(false);
    }
  }

  function onReveal() {
    const { state: next, checked: result } = applyReveal(activity, state);
    setChecked(result);
    update(next);
    complete(next);
  }

  function onSkip() {
    setSkipped(true);
    onComplete(resultOf(state, { skipped: true }));
  }

  return (
    <section aria-labelledby={promptId} className={cn("flex min-w-0 flex-col", compact ? "gap-4" : "gap-6")}>
      <header>
        <p className="font-mono text-[11px] tracking-[0.14em] text-accent uppercase">
          {ACTIVITY_TYPE_LABELS[activity.type]}
          {difficulty && <span className="text-subtle"> · {DIFFICULTY_LABELS[difficulty]}</span>}
        </p>
        <h3 id={promptId} className={cn("mt-2 leading-relaxed font-medium text-fg", compact ? "text-base" : "text-base sm:text-lg")}>
          {activity.prompt}
        </h3>
      </header>

      <EvidencePanel sources={evidence} collapsible={compact} />

      <Body
        activity={activity}
        sources={sources}
        response={response}
        onChange={(next) => !finished && update({ ...state, response: next })}
        checked={checked}
        finished={finished}
        compact={compact}
      />

      <div aria-live="polite" className="empty:hidden">
        {showSummary && !finished && (
          <p key={state.attempts} className="motion-reveal rounded-xl border border-amber/30 bg-amber-soft px-4 py-3 text-sm leading-relaxed text-fg">
            {checked.result.summary}
          </p>
        )}
      </div>

      {/* Always mounted, so each new hint is announced as it appears. */}
      {!finished && (
        <ol aria-label="Hints" aria-live="polite" className="flex flex-col gap-2 empty:hidden">
          {hints.map((hint, index) => (
            <li key={index} className="motion-reveal flex gap-3 rounded-xl border border-line bg-surface-sunken px-4 py-3 text-sm leading-relaxed text-fg">
              <Lightbulb aria-hidden className="mt-0.5 size-4 shrink-0 text-amber" />
              <span>
                <span className="sr-only">Hint {index + 1}: </span>
                {hint}
              </span>
            </li>
          ))}
          {extraHelp && (
            <li className="motion-reveal flex gap-3 rounded-xl border border-line bg-surface-sunken px-4 py-3 text-sm leading-relaxed text-fg">
              <Compass aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
              <span className="flex flex-col gap-1.5">
                <span>{extraHelp.text}</span>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle">
                  <ProvenanceLabel provenance={extraHelp.provenance} />
                  <span aria-hidden>·</span>
                  {ASSIST_SOURCE_NOTE[extraHelp.provenance === "ai" ? "ai" : "local"]}
                </span>
              </span>
            </li>
          )}
        </ol>
      )}

      {!finished && (
        <div className="flex flex-col gap-3">
          {help.canReveal && (
            <p className="text-sm leading-relaxed text-muted">
              You can keep looking, see the answer with an explanation{help.canSkip ? ", or continue and come back later" : ""}.
            </p>
          )}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
            <Button size="lg" onClick={onCheck} disabled={!ready || staleWrong} className="w-full sm:w-auto">
              Check
            </Button>
            {help.canRequestHint && (
              <Button variant={help.offerHint ? "secondary" : "ghost"} size="lg" onClick={onHint} className="w-full sm:w-auto">
                <Lightbulb aria-hidden />
                {state.hintsShown === 0 ? "Need a hint?" : "Another hint"}
              </Button>
            )}
            {help.hintsExhausted && !extraHelp && (
              <Button variant="ghost" size="lg" onClick={onMoreHelp} disabled={helpLoading} className="w-full sm:w-auto">
                <Compass aria-hidden />
                More help
              </Button>
            )}
            {help.canReveal && (
              <Button variant="secondary" size="lg" onClick={onReveal} className="w-full sm:w-auto">
                <Eye aria-hidden />
                Show me
              </Button>
            )}
            {help.canSkip && (
              <Button variant="ghost" size="lg" onClick={onSkip} className="w-full sm:w-auto">
                Continue anyway
                <ArrowRight aria-hidden />
              </Button>
            )}
          </div>
          {staleWrong && <p className="text-xs text-subtle">Change your answer, then check again.</p>}
          {!ready && !checked && <p className="text-xs text-subtle">{incompleteNote(activity)}</p>}
        </div>
      )}

      {finished && (
        <FinishedPanel ref={finishRef} revealed={finished === "revealed"}>
          {activity.explanation}
        </FinishedPanel>
      )}
    </section>
  );
}

/** What "Check" is waiting for, in plain words. */
function incompleteNote(activity: CheckedActivityType): string {
  switch (activity.type) {
    case "evidence-connect":
    case "vocab-match":
      return "Check becomes available once everything is matched.";
    case "sort":
      return "Check becomes available once every item is placed.";
    case "compare":
      return "Check becomes available once every perspective has a verdict.";
    case "clue":
      return "Examine the clues, then choose an answer.";
    case "build-principle":
      return "Add at least two pieces to check your principle.";
    case "highlight":
      return "Tap at least one phrase to check.";
    case "scripture-connect":
      return "Answer each question to check.";
  }
}

function FinishedPanel({ ref, revealed, children }: { ref: Ref<HTMLDivElement>; revealed: boolean; children: ReactNode }) {
  return (
    <div
      ref={ref}
      tabIndex={-1}
      className={cn(
        "rounded-xl border p-4 outline-none sm:p-5",
        revealed ? "motion-reveal border-accent/30 bg-accent-soft" : "motion-success border-green/40 bg-green-soft",
      )}
    >
      <p role="status" className="flex items-center gap-2 text-base font-semibold text-fg">
        {revealed ? <Eye aria-hidden className="size-5 text-accent" /> : <CircleCheck aria-hidden className="size-5 text-green" />}
        {revealed ? "Here is the answer, and why" : "That fits the evidence"}
      </p>
      {revealed && (
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          Because you chose to see it, what this step connects is saved as suggested rather than discovered.
        </p>
      )}
      <div className="mt-3 border-t border-line pt-3">
        <ProvenanceLabel provenance="suggested" />
        <p className="mt-1.5 text-[0.975rem] leading-relaxed text-fg">{children}</p>
      </div>
    </div>
  );
}

