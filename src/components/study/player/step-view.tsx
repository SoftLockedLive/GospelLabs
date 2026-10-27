"use client";

/**
 * One step of an investigation: its phase and method (from `sm` up), framing,
 * the activity (at the learner's difficulty), and once it's done, what it
 * brings out, the concepts it touched, any side question it opens, and the
 * way on.
 */
import { ArrowLeft, ArrowRight, ChevronDown, CornerDownLeft, Flag, Lightbulb } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { activitySourceIds, resolveActivity } from "@/domain/study/content-registry";
import type { Source } from "@/domain/study/content-schema";
import type { InvestigationBundle } from "@/domain/study/engine/bundle";
import type { DifficultySuggestion } from "@/domain/study/engine/difficulty";
import { branchesOffered, findBranch, findStep, isStepDone, refKey, stepDifficulty, stepStateAt, stepsAround } from "@/domain/study/engine/path";
import { canOpenStep, completionState, statusOf } from "@/domain/study/engine/status";
import type { StudyProgress } from "@/domain/study/user-data";
import type { StudyAssistant } from "@/lib/assist";
import { cn } from "@/lib/cn";
import type { Preferences } from "@/lib/preferences";
import { ActivityRenderer } from "../activities/activity-renderer";
import { EvidencePanel } from "../activities/evidence-panel";
import type { ActivityState } from "../activities/types";
import { ProvenanceLabel } from "../shared/provenance";
import { BranchOffer } from "./branch-offer";
import { DifficultySuggestionBanner } from "./difficulty-suggestion";
import { StepConceptList, WordsInStep } from "./step-concepts";
import { StepTags } from "./step-tags";
import type { StudySession } from "./use-study-session";

interface StepViewProps {
  bundle: InvestigationBundle;
  progress: StudyProgress;
  preferences: Preferences;
  assistant: StudyAssistant;
  dispatch: StudySession["dispatch"];
  onFinish: () => void;
  finishing: boolean;
  suggestion: DifficultySuggestion | null;
  onAcceptSuggestion: () => void;
  onDismissSuggestion: () => void;
  dismissedBranches: ReadonlySet<string>;
  onDismissBranch: (branchId: string) => void;
  /** Progress is being saved, so stopping after this step loses nothing (and the learner can be told so). */
  saved?: boolean;
}

export function StepView(props: StepViewProps) {
  const { bundle, progress, preferences, assistant, dispatch, onFinish, finishing, suggestion } = props;
  const { investigation, sources } = bundle;
  const ref = progress.position;
  const key = refKey(ref);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // A new step: bring its heading into view and give it focus, so keyboard and screen reader users start there.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [key]);

  const step = findStep(investigation, ref);
  if (!step) return null;
  const { activity, difficulty } = resolveActivity(step, stepDifficulty(progress, ref));
  const state = stepStateAt(progress, ref);
  const status = statusOf(state);
  const done = isStepDone(state);
  const inBranch = !!ref.branchId;
  const steps = stepsAround(investigation, progress, ref.branchId);
  const index = steps.findIndex((s) => s.id === step.id);
  const isLast = index === steps.length - 1;
  const completion = completionState(investigation, progress);
  const concepts = step.concepts.map((id) => bundle.concepts[id]).filter((concept) => !!concept);
  const activitySources = new Set(activitySourceIds(activity));
  const stepSources = step.sourceIds.filter((id) => !activitySources.has(id)).map((id) => sources[id]).filter((source): source is Source => !!source);
  const branches = !inBranch && done ? branchesOffered(investigation, progress, step, preferences.activity) : [];
  const branch = ref.branchId ? findBranch(investigation, ref.branchId) : undefined;

  const initialState: Partial<ActivityState> | undefined = state && {
    attempts: state.attempts,
    hintsShown: state.hintsShown,
    response: state.response,
    revealed: state.revealed,
    completed: state.status === "complete",
    reflection: state.reflection,
  };

  function onComplete(result: { skipped: boolean; revealed: boolean; attempts: number; hintsShown: number; response?: unknown; reflection?: string }) {
    if (!result.skipped) {
      dispatch({ type: "complete", step: ref, outcome: result });
      return;
    }
    // "Continue anyway" moves on at once.
    const finishingPath = !inBranch && isLast;
    dispatch(finishingPath ? [{ type: "complete", step: ref, outcome: result }] : [{ type: "complete", step: ref, outcome: result }, { type: "next" }]);
    if (finishingPath) onFinish();
  }

  const remaining = investigation.steps.filter(
    (s) => completion.remaining.includes(s.id) && s.id !== step.id && canOpenStep(investigation, progress, { stepId: s.id }),
  );

  return (
    <article aria-labelledby={`step-${key}`} className="flex flex-col gap-7">
      <header className="motion-reveal flex flex-col gap-3">
        <StepTags phase={step.phase} method={step.method} />
        <h2 id={`step-${key}`} ref={headingRef} tabIndex={-1} className="text-xl font-semibold tracking-tight text-fg outline-none sm:text-2xl">
          {step.title}
        </h2>
        {step.intro && <p className="text-[0.975rem] leading-relaxed text-muted">{step.intro}</p>}
      </header>

      {stepSources.length > 0 && <EvidencePanel sources={stepSources} title="Sources for this step" />}

      <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft sm:p-6">
        <ActivityRenderer
          key={`${key}:${activity.id}`}
          activity={activity}
          sources={sources}
          difficulty={difficulty}
          initialState={initialState}
          allowSkip
          reflectionInput={preferences.activity.showReflections}
          moreHelp={(a, s) => assistant.moreHelp(a, s, { sources })}
          onStateChange={(next) =>
            dispatch(
              { type: "sync", step: ref, snapshot: { attempts: next.attempts, hintsShown: next.hintsShown, response: next.response, reflection: next.reflection } },
              // Only writing a reflection waits for a pause in typing. Choices, examined clues, hints, and checks are
              // discrete actions and save at once, so leaving or reloading right after one doesn't lose it.
              { typing: (next.reflection ?? "") !== (state?.reflection ?? "") },
            )
          }
          onComplete={onComplete}
        />
      </div>

      {!done && <WordsInStep concepts={concepts} assistant={assistant} />}

      {status === "skipped" && (
        <p className="rounded-xl border border-dashed border-line-strong px-4 py-3 text-sm leading-relaxed text-muted">
          You moved on from this step. You can try it again here any time.
        </p>
      )}

      {(status === "complete" || status === "revealed") && (
        <section aria-label="What this step brings out" className="motion-reveal flex flex-col gap-4 rounded-2xl border border-accent/25 bg-accent-soft p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
              <Lightbulb aria-hidden className="size-4 text-accent" />
              What this step brings out
            </h3>
            <ProvenanceLabel provenance="suggested" />
          </div>
          <StepInsight key={key} text={step.insight} />
          <StepConceptList concepts={concepts} demonstrated={status === "complete"} />
        </section>
      )}

      {done && !inBranch && suggestion && (
        <DifficultySuggestionBanner suggestion={suggestion} onAccept={props.onAcceptSuggestion} onDismiss={props.onDismissSuggestion} />
      )}

      {branches
        .filter((offer) => progress.visitedBranches.includes(offer.id) || !props.dismissedBranches.has(offer.id))
        .map((offer) => (
          <BranchOffer
            key={offer.id}
            branch={offer}
            visited={progress.visitedBranches.includes(offer.id)}
            onExplore={() => dispatch({ type: "enterBranch", branchId: offer.id })}
            onDismiss={() => props.onDismissBranch(offer.id)}
          />
        ))}

      {done && inBranch && isLast && branch?.returnNote && (
        <p className="motion-reveal rounded-xl border border-line bg-surface-sunken px-4 py-3 text-sm leading-relaxed text-fg">{branch.returnNote}</p>
      )}

      {done && !inBranch && isLast && !completion.complete && remaining.length > 0 && (
        <section aria-label="Steps still open" className="rounded-xl border border-line bg-surface-sunken p-4">
          <p className="text-sm leading-relaxed text-fg">A few steps on this path are still open. Finish them (or move past them) to complete the investigation.</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {remaining.map((s) => (
              <li key={s.id}>
                <Button variant="secondary" size="sm" onClick={() => dispatch({ type: "open", step: { stepId: s.id } })}>
                  {s.title}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav aria-label="Step navigation" className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        {/* At the end of a one-step side question, "Return to the investigation" (below) already goes back. */}
        {(index > 0 || inBranch) && !(inBranch && index === 0 && done && isLast) ? (
          <Button variant="ghost" size="lg" onClick={() => dispatch({ type: "previous" })} className="w-full sm:w-auto">
            {inBranch && index === 0 ? <CornerDownLeft aria-hidden /> : <ArrowLeft aria-hidden />}
            {inBranch && index === 0 ? "Back to the investigation" : "Previous step"}
          </Button>
        ) : (
          <span aria-hidden className="hidden sm:block" />
        )}
        {done &&
          (inBranch ? (
            <Button size="lg" onClick={() => dispatch(isLast ? { type: "returnFromBranch" } : { type: "next" })} className="w-full sm:w-auto">
              {isLast ? "Return to the investigation" : "Next step"}
              {isLast ? <CornerDownLeft aria-hidden /> : <ArrowRight aria-hidden />}
            </Button>
          ) : isLast ? (
            <Button size="lg" onClick={onFinish} disabled={!completion.complete || finishing} className="w-full sm:w-auto">
              <Flag aria-hidden />
              {finishing ? "Saving your discovery…" : "See your discovery"}
            </Button>
          ) : (
            <Button size="lg" onClick={() => dispatch({ type: "next" })} className="w-full sm:w-auto">
              Next step
              <ArrowRight aria-hidden />
            </Button>
          ))}
      </nav>
      {/* Short sessions are fine: say so where someone might stop, rather than making a whole investigation feel required. */}
      {done && !isLast && !inBranch && props.saved && (
        <p className="-mt-2 text-center text-sm text-muted sm:text-right">A good place to stop if you need to. Your place is saved for next time.</p>
      )}
    </article>
  );
}

/**
 * What the step brings out. On phones it's cut to three lines with "Read more", so the way on ("Next step") stays
 * close to the success message instead of a long paragraph below it; from `sm` up it's shown in full. The full text
 * is always in the page (the clamp is only visual), so screen readers and find-in-page get all of it.
 */
function StepInsight({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  // Whether the clamp actually cuts the text: short insights, and every insight from `sm` up, need no toggle.
  const [clamped, setClamped] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const textId = useId();

  useEffect(() => {
    const element = textRef.current;
    if (!element || expanded) return;
    // Reports once on observe, then whenever the size changes (rotating the phone, crossing `sm`).
    const observer = new ResizeObserver(() => setClamped(element.scrollHeight > element.clientHeight + 1));
    observer.observe(element);
    return () => observer.disconnect();
  }, [expanded]);

  return (
    <div className="flex flex-col items-start gap-1">
      <p ref={textRef} id={textId} className={cn("font-serif text-[1.05rem] leading-relaxed text-fg", !expanded && "line-clamp-3 sm:line-clamp-none")}>
        {text}
      </p>
      {(clamped || expanded) && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={textId}
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-medium text-accent hover:text-accent-strong sm:hidden"
        >
          {expanded ? "Show less" : "Read more"}
          <ChevronDown aria-hidden className={cn("size-4 transition-transform", expanded && "rotate-180")} />
        </button>
      )}
    </div>
  );
}
