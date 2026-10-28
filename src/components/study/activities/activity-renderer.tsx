"use client";

/**
 * Renders any study activity with the shared chrome: prompt, evidence,
 * Check, feedback that points back to the evidence, progressive hints,
 * "Show me" after a couple of tries, a quiet "Continue anyway" from the start
 * (where the host allows skipping), and a calm success state with the
 * explanation (labeled as suggested by Gospel Labs). When each is offered is
 * the help policy's call (engine/hints.ts).
 *
 * The component owns the activity's state while it is on screen, restores it
 * from `initialState`, and reports every meaningful change through
 * `onStateChange` and the end through `onComplete` (once). Answer checking
 * itself is pure (src/domain/study/activities) and tested there.
 */
import { ArrowRight, ChevronDown, CircleCheck, Compass, Eye, Lightbulb } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import { Button } from "@/components/ui/button";
import { isComplete, parseResponse } from "@/domain/study/activities";
import { ACTIVITY_TYPE_LABELS, type Activity, type CheckedActivity as CheckedActivityType, type Source } from "@/domain/study/content-schema";
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

/** The evidence an activity shows beside its question: its sources, less any passage its body already shows. */
export function activityEvidence(activity: Activity, sources: Readonly<Record<string, Source>>): Source[] {
  const hidden = new Set(shownInBody(activity));
  return activity.sourceIds.filter((id) => !hidden.has(id)).map((id) => sources[id]).filter((source): source is Source => !!source);
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

function CheckedActivityView({ activity, sources, difficulty, initialState, onStateChange, onComplete, allowSkip, compact, moreHelp, evidenceElsewhere }: CheckedProps) {
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

  const evidence = activityEvidence(activity, sources);

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
    // The last hint takes its button away; focus goes to the hint instead of being lost.
    if (state.hintsShown + 1 >= hintsOf(activity).length) focusNewHelp.current = true;
    update(applyHint(state, hintsOf(activity).length));
  }

  async function onMoreHelp() {
    setHelpLoading(true);
    try {
      const reply = moreHelp
        ? await moreHelp(activity, state)
        : ({ provenance: "suggested", ...evidencePointer(activity, sources) } satisfies AssistResponse);
      if (reply.hintIndex !== undefined && reply.hintIndex >= state.hintsShown) onHint();
      else {
        focusNewHelp.current = true;
        setExtraHelp(reply);
      }
    } catch {
      focusNewHelp.current = true;
      setExtraHelp({ provenance: "suggested", ...evidencePointer(activity, sources) });
    } finally {
      setHelpLoading(false);
    }
  }

  // Help that replaced the button the learner used ("Another hint" after the last hint, "More help") gets focus.
  const hintList = useRef<HTMLOListElement>(null);
  const focusNewHelp = useRef(false);
  const shownHelp = hints.length + (extraHelp ? 1 : 0);
  useEffect(() => {
    if (!focusNewHelp.current) return;
    focusNewHelp.current = false;
    const items = hintList.current?.querySelectorAll<HTMLElement>(":scope > li");
    const newest = items?.[items.length - 1];
    if (!newest) return;
    newest.tabIndex = -1;
    newest.focus();
  }, [shownHelp]);

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
        <p className="kicker text-muted">
          {ACTIVITY_TYPE_LABELS[activity.type]}
          {difficulty && <> · {DIFFICULTY_LABELS[difficulty]}</>}
        </p>
        <h3 id={promptId} className={cn("mt-1.5 font-bold text-fg", compact ? "text-base leading-relaxed" : "text-[1.0625rem] leading-[1.625rem] sm:text-lg")}>
          {activity.prompt}
        </h3>
      </header>

      {!evidenceElsewhere && <EvidencePanel sources={evidence} collapsible={compact} />}

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
          <p key={state.attempts} className="motion-reveal rounded-lg border-l-4 border-amber bg-amber-soft px-4 py-3 text-[0.975rem] leading-relaxed text-fg">
            {checked.result.summary}
          </p>
        )}
      </div>

      {/* Always mounted, so each new hint is announced as it appears. */}
      {!finished && (
        <ol ref={hintList} aria-label="Hints" aria-live="polite" className="flex flex-col gap-2 empty:hidden">
          {hints.map((hint, index) => (
            <li key={index} className="motion-reveal rounded-lg bg-surface-sunken px-4 py-3 text-[0.975rem] leading-relaxed text-fg">
              <span>
                <span className="font-semibold text-muted">Hint {index + 1}: </span>
                {hint}
              </span>
            </li>
          ))}
          {extraHelp && (
            <li className="motion-reveal flex gap-3 rounded-lg bg-surface-sunken px-4 py-3 text-[0.975rem] leading-relaxed text-fg">
              <Compass aria-hidden className="mt-1 size-4 shrink-0 text-muted" />
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
          {/* Only once "Show me" is offered: before that, the choices are Check, a hint, or quietly moving on. */}
          {help.canReveal && (
            <p className="text-sm leading-relaxed text-muted">
              You can keep looking, see the answer with an explanation{help.canSkip ? ", or continue and come back later" : ""}.
            </p>
          )}
          {(help.canReveal || (help.hintsExhausted && !extraHelp)) && (
            <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
              {help.canReveal && (
                <Button variant="secondary" size="lg" onClick={onReveal} className="w-full sm:w-auto">
                  <Eye aria-hidden />
                  Show me
                </Button>
              )}
              {help.hintsExhausted && !extraHelp && (
                <Button variant="ghost" size="lg" onClick={onMoreHelp} disabled={helpLoading} className="w-full sm:w-auto">
                  <Compass aria-hidden />
                  More help
                </Button>
              )}
            </div>
          )}
          {staleWrong && <p className="text-sm text-muted">Change your answer, then check again.</p>}
          {!ready && !checked && <p className="text-sm text-muted">{incompleteNote(activity)}</p>}
          {/* Check and a hint stay in reach at the bottom of a phone screen while the learner reads and taps; the
              tab bar is hidden during a step, so the bar sits on the bottom edge. In embedded activities (and from
              `sm` up) it's an ordinary row. */}
          <div
            className={cn(
              "flex items-center gap-2.5",
              compact
                ? "flex-col sm:flex-row"
                : "max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:-mx-5 max-sm:border-t max-sm:border-line max-sm:bg-canvas max-sm:px-4 max-sm:pt-3 max-sm:[padding-bottom:max(0.75rem,env(safe-area-inset-bottom))]",
            )}
          >
            {/* aria-disabled rather than disabled: after a check that didn't fit, focus stays on Check instead of being lost. */}
            <Button
              size="lg"
              onClick={() => ready && !staleWrong && onCheck()}
              aria-disabled={!ready || staleWrong}
              className={cn(compact ? "w-full sm:w-auto" : "flex-1 sm:flex-none")}
            >
              Check
            </Button>
            {help.canRequestHint && (
              <Button
                variant={help.offerHint ? "secondary" : "link"}
                size="lg"
                onClick={onHint}
                className={compact ? "w-full sm:w-auto" : "shrink-0"}
              >
                <Lightbulb aria-hidden />
                {state.hintsShown === 0 ? "Need a hint?" : "Another hint"}
              </Button>
            )}
          </div>
          {/* Offered from the start so nobody is held on a step, but kept quiet (a plain link-style button, after
              everything else) so it doesn't tempt anyone before they've tried. Still 44px tall on touch screens. */}
          {help.canSkip && (
            <Button variant="ghost" onClick={onSkip} className="self-center sm:self-start">
              Continue anyway
              <ArrowRight aria-hidden />
            </Button>
          )}
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
        "rounded-lg border-l-4 p-4 outline-none sm:p-5",
        revealed ? "motion-reveal border-accent bg-accent-soft" : "motion-success border-green bg-green-soft",
      )}
    >
      <p role="status" className="flex items-center gap-2 text-base font-semibold text-fg">
        {revealed ? <Eye aria-hidden className="size-5 text-accent" /> : <CircleCheck aria-hidden className="size-5 text-green" />}
        {revealed ? "Here is the answer, and why" : "That fits the evidence"}
      </p>
      {revealed && (
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          Because you chose to see the answer, this is saved as “Suggested by Gospel Labs” rather than “You discovered.”
        </p>
      )}
      {revealed ? (
        <Explanation>{children}</Explanation>
      ) : (
        // Worked out: the learner already knows why, so the reasoning is one tap away instead of another
        // paragraph to scroll past. Shown answers keep it open, since that's what was asked for.
        <details className="group mt-2">
          <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-1.5 rounded-md text-sm font-medium text-fg hover:text-accent sm:min-h-0 sm:py-1 [&::-webkit-details-marker]:hidden">
            <ChevronDown aria-hidden className="size-4 text-subtle transition-transform group-open:rotate-180" />
            Why it fits
          </summary>
          <Explanation>{children}</Explanation>
        </details>
      )}
    </div>
  );
}

function Explanation({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 border-t border-line pt-3">
      <ProvenanceLabel provenance="suggested" />
      <p className="mt-1.5 font-serif text-[1.0625rem] leading-relaxed text-fg">{children}</p>
    </div>
  );
}

