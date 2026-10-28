"use client";

import { ArrowRight, BookOpen, ChevronRight, Footprints, Hourglass } from "lucide-react";
import Link from "next/link";
import { Wordmark } from "@/components/layout/brand";
import { ArtImage } from "@/components/ui/art-image";
import { ButtonLink } from "@/components/ui/button";
import { ProgressPath, pathFromCounts } from "@/components/ui/progress-path";
import { SegmentedControl, type SegmentedOption } from "@/components/ui/segmented-control";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { describeReason, minutesFor, sessionSteps, type StudyPositionSummary, type Suggestion } from "@/domain/study/suggestions";
import type { StudyProgress } from "@/domain/study/user-data";
import { studyLengthMinutes, type StudyLength } from "@/domain/study/vocabulary";
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

/** The 1200 file on wide screens, the 600 file on phones (a 2× phone still gets the 1200 one). */
const HERO_SIZES = "(min-width: 80rem) 30rem, (min-width: 40rem) 40rem, 100vw";

interface DashboardHeroProps {
  now: Date | null;
  length: StudyLength;
  onLengthChange: (length: StudyLength) => void;
  focus: HeroFocus;
}

/**
 * The top of the home page. On a phone: the name, a greeting, the title, then one painting-led card with the next
 * thing to study and its button, all on the first screen; then a way in for someone with only a few minutes, and
 * the quick-or-deep choice. On wide screens the card sits beside the rest.
 */
export function DashboardHero({ now, length, onLengthChange, focus }: DashboardHeroProps) {
  return (
    <section
      aria-labelledby="dashboard-title"
      className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] xl:gap-x-12 xl:gap-y-8"
    >
      <div className="min-w-0 xl:col-start-1 xl:row-start-1 xl:self-end">
        <Wordmark className="mb-5 flex lg:hidden" />
        {/* The hour is only known in the browser; the line keeps its height until then. */}
        <p className="kicker min-h-5 text-muted">
          {now && (
            <span className="motion-reveal inline-block">
              {greetingFor(now)}
              <span className="hidden sm:inline">
                <span aria-hidden className="mx-2">
                  ·
                </span>
                {formatLongDate(now)}
              </span>
            </span>
          )}
        </p>
        {/* "Search the scriptures" (John 5:39) and come to know Jesus Christ (John 17:3). */}
        <h1 id="dashboard-title" className="text-title mt-1 max-w-xl text-fg">
          Search the scriptures. Know&nbsp;Him.
        </h1>
      </div>

      <FocusCard focus={focus} length={length} />

      <div className="flex min-w-0 flex-col gap-6 xl:col-start-1 xl:row-start-2">
        {/* Even a quick investigation takes a while; someone with a few minutes gets a way in too. */}
        <Link
          href={connectHref()}
          className="group flex min-h-16 w-full max-w-xl items-center gap-4 rounded-xl border border-sacred-line bg-sacred p-2 pr-4 text-sacred-fg transition-colors hover:border-sacred-accent/50"
        >
          <ArtImage use="connect" ratio="square" decorative sizes="4rem" className="size-14 shrink-0 rounded-lg" />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Only a few minutes?</span>
            <span className="block text-sm text-sacred-muted">Spend them with the Savior in Connect with Christ.</span>
          </span>
          <ChevronRight aria-hidden className="size-5 shrink-0 text-sacred-muted transition-transform group-hover:translate-x-0.5" />
        </Link>
        <div>
          <SegmentedControl label="How much time do you have?" showLabel options={LENGTH_OPTIONS} value={length} onChange={onLengthChange} />
          <p className="mt-2 text-sm leading-relaxed text-muted" aria-live="polite">
            {LENGTH_HELP[length]}
          </p>
        </div>
      </div>
    </section>
  );
}

function FocusCard({ focus, length }: { focus: HeroFocus; length: StudyLength }) {
  const art = focus.kind === "continue" ? focus.investigation.id : focus.kind === "start" ? focus.suggestion.investigation.id : "home";
  return (
    <div className="w-full max-w-2xl min-w-0 overflow-hidden rounded-xl border border-line bg-surface xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:max-w-none">
      {focus.kind === "loading" ? (
        <div aria-hidden className="aspect-video bg-surface-sunken" />
      ) : (
        <ArtImage key={art} use={art} priority sizes={HERO_SIZES} />
      )}
      <div className="p-5 sm:p-6">
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
    <div role="status" aria-label="Loading your study" className="flex flex-col gap-3">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="h-7 w-4/5" />
      <SkeletonText lines={2} />
      <Skeleton className="mt-3 h-12 w-full" />
    </div>
  );
}

/** The title and question, set like the top of a chapter: kicker, serif title, italic question. */
function FocusTitle({ kicker, investigation }: { kicker: string; investigation: InvestigationSummary }) {
  return (
    <>
      <p className="kicker text-muted">{kicker}</p>
      <h2 className="mt-1.5 font-serif text-[1.375rem] leading-[1.75rem] font-medium text-balance text-fg sm:text-2xl">{investigation.title}</h2>
      <p className="mt-1.5 line-clamp-2 font-serif text-base leading-relaxed text-muted italic sm:line-clamp-none">{investigation.question}</p>
    </>
  );
}

function ContinueFocus({ investigation, progress, position }: Extract<HeroFocus, { kind: "continue" }>) {
  const lengthLabel = progress.length === "deep" ? "Deep study" : "Quick study";
  return (
    <div className="motion-reveal">
      <FocusTitle kicker="Pick up where you left off" investigation={investigation} />
      <div className="mt-4">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
          <span className="font-semibold text-fg">{position.inBranch ? "Exploring a side question" : `Step ${position.step} of ${position.total}`}</span>
          <span className="text-muted">{lengthLabel}</span>
        </div>
        <ProgressPath steps={pathFromCounts(position.total, Math.max(position.step - 1, 0))} label={`Step ${position.step} of ${position.total}`} />
      </div>
      <ButtonLink href={resumeInvestigationHref(investigation.id)} size="lg" className="mt-5 w-full">
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
      <FocusTitle kicker={length === "deep" ? "For a deep study" : "For a quick study"} investigation={investigation} />
      <p className="mt-3 text-sm text-muted">
        <span className="sr-only">Time: </span>About {minutesFor(investigation, length)} min
        <span aria-hidden className="mx-1.5">
          ·
        </span>
        <span className="sr-only">Steps: </span>
        {steps} {steps === 1 ? "step" : "steps"}
        {reason.kind === "related" && (
          <>
            <span aria-hidden className="mx-1.5">
              ·
            </span>
            {describeReason(reason, length)}
          </>
        )}
      </p>
      <ButtonLink href={studyInvestigationHref(investigation.id)} size="lg" className="mt-5 w-full">
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
        <p className="kicker text-muted">Investigate</p>
        <h2 className="mt-1.5 font-serif text-[1.375rem] leading-[1.75rem] font-medium text-fg sm:text-2xl">Find your next question</h2>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">
          Browse every investigation, revisit one you&rsquo;ve finished at a new depth, or explore a passage of scripture.
        </p>
        <ButtonLink href={investigateHref()} size="lg" className="mt-5 w-full">
          Browse investigations
          <ArrowRight aria-hidden />
        </ButtonLink>
      </div>
    );
  }
  // Guided investigations aren't published yet: offer the research notebook instead.
  return (
    <div className="motion-reveal">
      <p className="kicker text-muted">Research</p>
      <h2 className="mt-1.5 font-serif text-[1.375rem] leading-[1.75rem] font-medium text-fg sm:text-2xl">Bring a question of your own</h2>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">
        Gather what the scriptures and Church resources say, and reach your own understanding at your own pace.
      </p>
      <ButtonLink href={newInvestigationHref()} size="lg" className="mt-5 w-full">
        Start a research notebook
        <ArrowRight aria-hidden />
      </ButtonLink>
      <Link href="/questions" className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold text-accent hover:text-accent-strong">
        <BookOpen aria-hidden className="size-4" />
        Browse the Question Bank
      </Link>
    </div>
  );
}
