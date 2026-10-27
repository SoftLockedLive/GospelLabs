"use client";

import { ArrowRight, BookOpen, Clock, Compass, FlaskConical, Footprints, GitBranch, HeartHandshake, Hourglass, Sparkles } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { ProgressPath, pathFromCounts } from "@/components/ui/progress-path";
import { SegmentedControl, type SegmentedOption } from "@/components/ui/segmented-control";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { describeReason, minutesFor, sessionSteps, type StudyPositionSummary, type Suggestion } from "@/domain/study/suggestions";
import type { StudyProgress } from "@/domain/study/user-data";
import { studyLengthMinutes, type StudyLength } from "@/domain/study/vocabulary";
import { cn } from "@/lib/cn";
import { connectHref, investigateHref, newInvestigationHref, resumeInvestigationHref, studyInvestigationHref } from "@/lib/routes";
import { formatLongDate, greetingFor } from "./time";
import type { InvestigationSummary } from "./types";

export type HeroFocus =
  | { kind: "loading" }
  | { kind: "continue"; investigation: InvestigationSummary; progress: StudyProgress; position: StudyPositionSummary }
  | { kind: "start"; suggestion: Suggestion }
  /** Nothing to suggest: no guided investigations are published yet (or, defensively, none can be offered). */
  | { kind: "browse"; hasInvestigations: boolean };

const LENGTH_OPTIONS: readonly SegmentedOption<StudyLength>[] = [
  { value: "quick", label: "Quick", detail: studyLengthMinutes("quick"), icon: Hourglass },
  { value: "deep", label: "Deep", detail: studyLengthMinutes("deep"), icon: Footprints },
];

const LENGTH_HELP: Record<StudyLength, string> = {
  quick: "A quick study follows an investigation’s main path.",
  deep: "A deep study adds deeper steps, side questions, and time to reflect.",
};

interface DashboardHeroProps {
  now: Date | null;
  length: StudyLength;
  onLengthChange: (length: StudyLength) => void;
  focus: HeroFocus;
}

export function DashboardHero({ now, length, onLengthChange, focus }: DashboardHeroProps) {
  return (
    <section aria-labelledby="dashboard-title" className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] xl:items-center xl:gap-12">
      <div className="min-w-0">
        {/* The hour is only known in the browser; the line keeps its height until then. */}
        <p className="min-h-5 text-sm text-muted">
          {now && (
            <span className="motion-reveal inline-block">
              {greetingFor(now)}
              <span aria-hidden className="mx-2 text-subtle">
                ·
              </span>
              <span className="text-subtle">{formatLongDate(now)}</span>
            </span>
          )}
        </p>
        <h1 id="dashboard-title" className="mt-2 max-w-xl font-serif text-[2rem] leading-[1.15] font-medium tracking-tight text-balance text-fg sm:text-[2.6rem]">
          What would you like to study today?
        </h1>
        <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted sm:text-base">
          Search the scriptures with a question in mind, notice what they teach, and come to know Jesus Christ a little
          better each time.
        </p>
        <div className="mt-7">
          <SegmentedControl label="How much time do you have?" showLabel options={LENGTH_OPTIONS} value={length} onChange={onLengthChange} />
          <p className="mt-2.5 text-xs leading-relaxed text-subtle" aria-live="polite">
            {LENGTH_HELP[length]}
          </p>
          {/* Even a quick investigation takes 20 minutes or more; someone with a few minutes gets a way in too. */}
          <Link
            href={connectHref()}
            className="mt-4 flex min-h-12 w-full max-w-md items-center gap-3 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm transition-colors hover:border-accent/50 hover:bg-surface-raised"
          >
            <HeartHandshake aria-hidden className="size-5 shrink-0 text-accent" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-fg">Only a few minutes?</span>
              <span className="block text-xs text-muted">Spend them with the Savior in Connect with Christ.</span>
            </span>
            <ArrowRight aria-hidden className="size-4 shrink-0 text-subtle" />
          </Link>
        </div>
      </div>
      <FocusCard focus={focus} length={length} />
    </section>
  );
}

function FocusCard({ focus, length }: { focus: HeroFocus; length: StudyLength }) {
  return (
    <div className="relative w-full max-w-2xl min-w-0 overflow-hidden rounded-2xl border border-line-strong bg-surface p-5 shadow-lifted sm:p-6 xl:max-w-none">
      <div aria-hidden className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative">
        {focus.kind === "loading" && <FocusSkeleton />}
        {focus.kind === "continue" && <ContinueFocus {...focus} />}
        {focus.kind === "start" && <StartFocus suggestion={focus.suggestion} length={length} />}
        {focus.kind === "browse" && <BrowseFocus hasInvestigations={focus.hasInvestigations} />}
      </div>
    </div>
  );
}

function FocusSkeleton() {
  return (
    <div role="status" aria-label="Loading your study" className="flex flex-col gap-4">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-6 w-4/5" />
      <SkeletonText lines={2} />
      <Skeleton className="mt-2 h-12 w-full rounded-xl" />
    </div>
  );
}

function FocusLabel({ icon: Icon, children }: { icon: typeof Compass; children: string }) {
  return (
    <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-accent uppercase">
      <Icon aria-hidden className="size-3.5" />
      {children}
    </p>
  );
}

function ContinueFocus({ investigation, progress, position }: Extract<HeroFocus, { kind: "continue" }>) {
  const lengthLabel = progress.length === "deep" ? "Deep study" : "Quick study";
  return (
    <div className="motion-reveal">
      <FocusLabel icon={Compass}>Pick up where you left off</FocusLabel>
      <p className="mt-4 text-xs font-medium text-subtle">{investigation.theme}</p>
      <h2 className="mt-1 text-xl leading-snug font-semibold tracking-tight text-fg">{investigation.title}</h2>
      <p className="mt-2 font-serif text-[15px] leading-relaxed text-muted italic">{investigation.question}</p>
      <div className="mt-5">
        <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs">
          <span className="font-medium text-fg">
            {position.inBranch ? (
              <>
                <GitBranch aria-hidden className="mr-1 inline size-3.5 align-[-2px] text-accent" />
                Exploring a side question
              </>
            ) : (
              `Step ${position.step} of ${position.total}`
            )}
          </span>
          <span className="text-subtle">{lengthLabel}</span>
        </div>
        <ProgressPath steps={pathFromCounts(position.total, Math.max(position.step - 1, 0))} label={`Step ${position.step} of ${position.total}`} />
      </div>
      <ButtonLink href={resumeInvestigationHref(investigation.id)} size="lg" className="mt-6 w-full">
        Continue studying
        <ArrowRight aria-hidden />
      </ButtonLink>
    </div>
  );
}

function StartFocus({ suggestion, length }: { suggestion: Suggestion; length: StudyLength }) {
  const { investigation, reason } = suggestion;
  const steps = sessionSteps(investigation, length).length;
  return (
    <div className="motion-reveal">
      <FocusLabel icon={Sparkles}>{length === "deep" ? "For a deep study" : "For a quick study"}</FocusLabel>
      <p className="mt-4 text-xs font-medium text-subtle">{investigation.theme}</p>
      <h2 className="mt-1 text-xl leading-snug font-semibold tracking-tight text-fg">{investigation.title}</h2>
      <p className="mt-2 font-serif text-[15px] leading-relaxed text-muted italic">{investigation.question}</p>
      <dl className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted">
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Time</dt>
          <Clock aria-hidden className="size-3.5 text-subtle" />
          <dd>About {minutesFor(investigation, length)} min</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Steps</dt>
          <Footprints aria-hidden className="size-3.5 text-subtle" />
          <dd>
            {steps} {steps === 1 ? "step" : "steps"}
          </dd>
        </div>
      </dl>
      {reason.kind === "related" && <p className="mt-2 text-xs text-subtle">{describeReason(reason, length)}</p>}
      <ButtonLink href={studyInvestigationHref(investigation.id)} size="lg" className="mt-6 w-full">
        Start this investigation
        <ArrowRight aria-hidden />
      </ButtonLink>
    </div>
  );
}

function BrowseFocus({ hasInvestigations }: { hasInvestigations: boolean }) {
  if (hasInvestigations) {
    return (
      <div className="motion-reveal">
        <FocusLabel icon={Compass}>Investigate</FocusLabel>
        <h2 className="mt-4 text-xl leading-snug font-semibold tracking-tight text-fg">Find your next question</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Browse every investigation, revisit one you&rsquo;ve finished at a new depth, or explore a passage of scripture.
        </p>
        <ButtonLink href={investigateHref()} size="lg" className="mt-6 w-full">
          Browse investigations
          <ArrowRight aria-hidden />
        </ButtonLink>
      </div>
    );
  }
  // Guided investigations aren't published yet: offer the research notebook instead.
  return (
    <div className="motion-reveal">
      <FocusLabel icon={FlaskConical}>Research</FocusLabel>
      <h2 className="mt-4 text-xl leading-snug font-semibold tracking-tight text-fg">Bring a question of your own</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Gather what the scriptures and Church resources say, and reach your own understanding at your own pace.
      </p>
      <ButtonLink href={newInvestigationHref()} size="lg" className="mt-6 w-full">
        Start a research notebook
        <ArrowRight aria-hidden />
      </ButtonLink>
      <Link
        href="/questions"
        className={cn("mt-3 flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-medium text-accent hover:text-accent-strong")}
      >
        <BookOpen aria-hidden className="size-4" />
        Browse the Question Bank
      </Link>
    </div>
  );
}
