"use client";

import { useRef } from "react";
import { flushSync } from "react-dom";
import type { Investigation, SectionId } from "@/domain/investigation";
import type { CuratedQuestion } from "@/domain/question-bank";
import { getSection } from "@/domain/sections";
import { investigationHref } from "@/lib/routes";
import { useAutosave } from "@/persistence/hooks";
import { ConflictBanner } from "./conflict-banner";
import { DiscoveryCapture } from "./discoveries/discovery-capture";
import { DISCOVERIES_HEADING_ID } from "./discoveries/discovery-list";
import { OutdatedBanner } from "./outdated-banner";
import { SaveIndicator } from "./save-indicator";
import { SectionNav } from "./section-nav";
import { SectionPager } from "./section-pager";
import { SectionPanel } from "./section-panel";
import { AnalysisSection } from "./sections/analysis-section";
import { ConclusionSection } from "./sections/conclusion-section";
import { HypothesisSection } from "./sections/hypothesis-section";
import { QuestionSection } from "./sections/question-section";
import { ResearchSection } from "./sections/research-section";
import type { SectionProps } from "./types";
import { UndoBar } from "./undo-bar";
import { useInvestigation } from "./use-investigation";
import { WorkspaceHeader } from "./workspace-header";

interface InvestigationWorkspaceProps {
  initial: Investigation;
  /** The stored copy this editor was opened from, or null for a new investigation. */
  stored: Investigation | null;
  /** When `initial` holds edits restored from a safety copy: the stored version they continue from. */
  basedOn?: string | null;
  /** True when `initial` holds edits restored from a safety copy. */
  restored?: boolean;
  sourceQuestion?: CuratedQuestion;
}

/** Points the address bar at a new investigation's permanent URL once it is first saved. */
function adoptPermanentUrl(investigation: Investigation) {
  window.history.replaceState(null, "", investigationHref(investigation.id));
}

/** Investigation editor. Every change is autosaved to this device. */
export function InvestigationWorkspace({ initial, stored, basedOn, restored, sourceQuestion }: InvestigationWorkspaceProps) {
  const { investigation, undo, actions } = useInvestigation(initial);
  const autosave = useAutosave(investigation, { initial, stored, basedOn, onFirstSave: adoptPermanentUrl });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const section = getSection(investigation.currentSection);

  // Used by the pager and cross-section links, whose triggering control may
  // disappear: move focus to the new section's heading. The step nav keeps
  // focus where it is, like tabs.
  const goToSection = (id: SectionId) => {
    flushSync(() => actions.setSection(id));
    headingRef.current?.focus();
  };

  const reviewDiscoveries = () => {
    flushSync(() => actions.setSection("conclusion"));
    document.getElementById(DISCOVERIES_HEADING_ID)?.focus();
  };

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <WorkspaceHeader
        investigation={investigation}
        saveStatus={<SaveIndicator status={autosave.status} onRetry={autosave.retry} />}
      />
      {autosave.status.state === "conflict" && (
        <ConflictBanner
          conflict={autosave.status.conflict}
          onKeepMine={autosave.keepMine}
          onLoadStored={autosave.discardAndReload}
        />
      )}
      {autosave.status.state === "outdated" && <OutdatedBanner onLoadLatest={autosave.discardAndReload} />}
      {restored && (
        <p role="status" className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
          Restored edits that hadn&rsquo;t finished saving when you last left this page.
        </p>
      )}

      {/*
        Below 1280px the steps sit in a sticky bar above the content (under the phone header, or at
        the very top beside the desktop sidebar); from 1280px they form a sticky column on the left.
      */}
      <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[13rem_minmax(0,1fr)] xl:items-start xl:gap-8">
        <div className="sticky top-16 z-10 -mx-4 flex items-center gap-2 border-b border-line bg-canvas/90 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-10 lg:px-10 xl:top-8 xl:mx-0 xl:flex-col xl:items-stretch xl:gap-5 xl:border-none xl:bg-transparent xl:p-0 xl:backdrop-blur-none">
          <div className="min-w-0 flex-1">
            <SectionNav investigation={investigation} current={section.id} onSelect={actions.setSection} />
          </div>
          <DiscoveryCapture investigation={investigation} actions={actions} onReview={reviewDiscoveries} />
        </div>

        <div className="flex min-w-0 flex-col gap-8 rounded-2xl border border-line bg-surface p-5 sm:p-8">
          <SectionPanel section={section} headingRef={headingRef}>
            <SectionBody
              id={section.id}
              investigation={investigation}
              actions={actions}
              sourceQuestion={sourceQuestion}
              onNavigate={goToSection}
            />
          </SectionPanel>
          <SectionPager current={section.id} onSelect={goToSection} />
        </div>
      </div>

      {undo && <UndoBar key={undo.seq} label={undo.label} onUndo={actions.undo} onDismiss={actions.dismissUndo} />}
    </div>
  );
}

function SectionBody({ id, ...props }: SectionProps & { id: SectionId }) {
  switch (id) {
    case "question":
      return <QuestionSection {...props} />;
    case "hypothesis":
      return <HypothesisSection {...props} />;
    case "research":
      return <ResearchSection {...props} />;
    case "analysis":
      return <AnalysisSection {...props} />;
    case "conclusion":
      return <ConclusionSection {...props} />;
  }
}
