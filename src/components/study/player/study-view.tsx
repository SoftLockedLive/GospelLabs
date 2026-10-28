"use client";

/**
 * The investigation while studying: a slim bar (the way back and the study
 * settings) that stays at the top on phones and tablets, where the tab bar is
 * hidden so the step has the screen; the progress path; any notices; the
 * side-question banner while in a branch; and the current step.
 */
import { ChevronLeft, CornerDownLeft, Info } from "lucide-react";
import { useState } from "react";
import { useFocusMode } from "@/components/layout/focus-mode";
import { Button } from "@/components/ui/button";
import type { InvestigationBundle } from "@/domain/study/engine/bundle";
import { findBranch } from "@/domain/study/engine/path";
import type { StudyProgress } from "@/domain/study/user-data";
import { ProgressPath } from "./progress-path";
import { SaveStatusText, StorageNotice } from "./save-status";
import { StepView } from "./step-view";
import { StudySettings } from "./study-settings";
import type { StudySession } from "./use-study-session";

type StepProps = Omit<Parameters<typeof StepView>[0], "progress" | "bundle" | "dispatch">;

interface StudyViewProps extends StepProps {
  bundle: InvestigationBundle;
  progress: StudyProgress;
  session: StudySession;
  onOverview: () => void;
}

export function StudyView({ bundle, progress, session, onOverview, ...stepProps }: StudyViewProps) {
  const { investigation } = bundle;
  const [updateNoticeSeen, setUpdateNoticeSeen] = useState(false);
  const branch = progress.position.branchId ? findBranch(investigation, progress.position.branchId) : undefined;
  const branchIndex = branch ? branch.steps.findIndex((step) => step.id === progress.position.stepId) : -1;
  const storageMessage = session.saveStatus.state === "error" ? session.saveStatus.message : (session.unsaved ?? session.loadError);
  useFocusMode(true);

  return (
    // Wide screens get room for the evidence column beside a step (see StepView).
    <div className="mx-auto flex max-w-3xl flex-col gap-6 xl:max-w-6xl">
      {/* Below lg the bar sticks to the top edge for the whole step, bleeding past the page gutter; on large screens
          it's a plain row. It's a child of the whole view (not of the header), so it stays as the step scrolls. */}
      <div className="sticky top-0 z-20 -mx-5 -mt-6 flex h-14 items-center justify-between gap-2 border-b border-line bg-canvas px-1.5 sm:-mx-6 sm:-mt-10 sm:px-3 lg:static lg:mx-0 lg:mt-0 lg:h-auto lg:border-0 lg:bg-transparent lg:px-0">
        <Button variant="ghost" onClick={onOverview} className="h-11 gap-1 px-2.5 text-base text-fg lg:-ml-2.5">
          <ChevronLeft aria-hidden className="size-5!" />
          Overview
        </Button>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline">
            <SaveStatusText status={session.saveStatus} />
          </span>
          <StudySettings
            investigation={investigation}
            difficulty={progress.difficulty}
            length={progress.length}
            onDifficulty={(difficulty) => session.dispatch({ type: "setDifficulty", difficulty })}
            onLength={(length) => session.dispatch({ type: "setLength", length })}
          />
        </div>
      </div>
      <div className="-mt-3 flex flex-col gap-3">
        <h1 className="kicker text-muted truncate">{investigation.title}</h1>
        <ProgressPath investigation={investigation} progress={progress} onOpen={(stepId) => session.dispatch({ type: "open", step: { stepId } })} />
      </div>

      {storageMessage && <StorageNotice message={storageMessage} onRetry={session.saveStatus.state === "error" ? session.retrySave : undefined} />}

      {session.contentUpdated && !updateNoticeSeen && (
        <div role="status" className="flex items-start justify-between gap-3 rounded-xl border border-line bg-surface-sunken px-4 py-3 text-sm leading-relaxed text-fg">
          <p className="flex items-start gap-2">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
            This investigation was updated since you last studied it. Steps you finished are kept; unfinished ones start fresh.
          </p>
          <Button variant="ghost" size="sm" onClick={() => setUpdateNoticeSeen(true)} className="shrink-0">
            Got it
          </Button>
        </div>
      )}

      {branch && (
        <section aria-label="Side question" className="motion-reveal border-l-2 border-accent py-1 pl-4 sm:pl-5">
          <p className="kicker text-muted">
            Side question · step {branchIndex + 1} of {branch.steps.length}
          </p>
          <p className="mt-1.5 font-serif text-lg leading-snug text-fg sm:text-xl">{branch.question}</p>
          {branchIndex === 0 && <p className="mt-2 text-sm leading-relaxed text-muted">{branch.intro}</p>}
          <Button variant="secondary" size="sm" onClick={() => session.dispatch({ type: "returnFromBranch" })} className="mt-4 h-11 sm:h-9">
            <CornerDownLeft aria-hidden />
            Return to the investigation
          </Button>
        </section>
      )}

      <StepView bundle={bundle} progress={progress} dispatch={session.dispatch} saved={!storageMessage} {...stepProps} />
    </div>
  );
}
