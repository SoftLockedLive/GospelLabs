"use client";

/**
 * The investigation while studying: a header with the progress path and
 * settings, any notices, the side-question banner while in a branch, and
 * the current step.
 */
import { ArrowLeft, CornerDownLeft, GitBranch, Info } from "lucide-react";
import { useState } from "react";
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

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={onOverview} className="-ml-3 h-11">
            <ArrowLeft aria-hidden />
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
        <h1 className="truncate text-sm font-medium text-muted">{investigation.title}</h1>
        <ProgressPath investigation={investigation} progress={progress} onOpen={(stepId) => session.dispatch({ type: "open", step: { stepId } })} />
      </div>

      {storageMessage && <StorageNotice message={storageMessage} onRetry={session.saveStatus.state === "error" ? session.retrySave : undefined} />}

      {session.contentUpdated && !updateNoticeSeen && (
        <div role="status" className="flex items-start justify-between gap-3 rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm leading-relaxed text-fg">
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
        <section aria-label="Side question" className="motion-reveal rounded-2xl border border-dashed border-accent/45 bg-surface p-5 sm:p-6">
          <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-accent uppercase">
            <GitBranch aria-hidden className="size-3.5" />
            Side question · step {branchIndex + 1} of {branch.steps.length}
          </p>
          <p className="mt-2 font-serif text-lg leading-snug text-fg sm:text-xl">{branch.question}</p>
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
