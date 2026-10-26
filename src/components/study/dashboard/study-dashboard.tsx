"use client";

import { ArrowRight, DatabaseZap } from "lucide-react";
import Link from "next/link";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { inProgressInvestigations, studyPosition, suggestInvestigations } from "@/domain/study/suggestions";
import type { StudyLength } from "@/domain/study/vocabulary";
import { updatePreferences, usePreferences } from "@/lib/preferences";
import { investigateHref } from "@/lib/routes";
import { useInvestigationList } from "@/persistence/hooks";
import { useDiscoveryCards, useExplorations, useStudyProgressList } from "@/persistence/study-hooks";
import { ContinueList } from "./continue-list";
import { DashboardHero, type HeroFocus } from "./dashboard-hero";
import { DashboardSection } from "./dashboard-section";
import { InvestigationCard } from "./investigation-card";
import { RECENT_DISCOVERIES, RecentDiscoveries } from "./recent-discoveries";
import { ResearchCard, StudyTools } from "./study-tools";
import type { DashboardContent } from "./types";
import { useClientDate } from "./use-client-date";

const SUGGESTION_COUNT = 3;

/**
 * The home dashboard. Content summaries come from the page; everything
 * personal (progress, discoveries, research notebooks) is read live from
 * this device. Shows one clear next step, then quieter ways in.
 */
export function StudyDashboard({ content }: { content: DashboardContent }) {
  const { studyLength } = usePreferences();
  const now = useClientDate();
  const progressState = useStudyProgressList();
  const discoveriesState = useDiscoveryCards();
  const connectState = useExplorations("connect");
  const researchState = useInvestigationList();

  const storageError =
    progressState.status === "error" ? progressState.error : discoveriesState.status === "error" ? discoveriesState.error : null;
  const loading = !storageError && (progressState.status === "loading" || discoveriesState.status === "loading");
  const progress = progressState.status === "ready" ? progressState.value.records : [];
  const discoveries = discoveriesState.status === "ready" ? discoveriesState.value.records : [];

  const inProgress = inProgressInvestigations(progress, content.investigations);
  const current = inProgress[0];
  const suggestions = suggestInvestigations({
    investigations: content.investigations,
    progress,
    discoveries,
    length: studyLength,
    limit: SUGGESTION_COUNT + 1,
  });

  let focus: HeroFocus;
  if (loading) focus = { kind: "loading" };
  else if (current) focus = { kind: "continue", ...current, position: studyPosition(current.progress, current.investigation) };
  else if (suggestions[0]) focus = { kind: "start", suggestion: suggestions[0] };
  else focus = { kind: "browse", hasInvestigations: content.investigations.length > 0 };

  // Don't offer the hero's investigation twice.
  const listed = focus.kind === "start" ? suggestions.slice(1) : suggestions.slice(0, SUGGESTION_COUNT);

  const research =
    researchState.status === "ready" && researchState.value.investigations.length > 0
      ? { latest: researchState.value.investigations[0], count: researchState.value.investigations.length }
      : undefined;
  const othersInProgress = inProgress.slice(1);

  const recentCards = [...discoveries].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, RECENT_DISCOVERIES);
  const setLength = (length: StudyLength) => updatePreferences({ studyLength: length });

  return (
    <div className="flex flex-col gap-12 sm:gap-14">
      <DashboardHero now={now} length={studyLength} onLengthChange={setLength} focus={focus} />

      {storageError && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger-soft p-4 sm:p-5">
          <DatabaseZap aria-hidden className="mt-0.5 size-5 shrink-0 text-danger" />
          <div>
            <p className="text-sm font-semibold text-fg">Your saved study couldn&rsquo;t be loaded</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {storageError.message} You can still open any investigation or study tool below.
            </p>
          </div>
        </div>
      )}

      {!loading && (othersInProgress.length > 0 || research) && (
        <DashboardSection id="continue" title="Continue studying">
          <ContinueList items={othersInProgress} research={research} now={now} />
        </DashboardSection>
      )}

      {(loading || listed.length > 0) && (
        <DashboardSection
          id="suggested"
          title={focus.kind === "start" ? "Or choose another investigation" : "Start a new investigation"}
          description={studyLength === "deep" ? "Chosen for a deep study." : "Chosen for a quick study."}
          action={
            <Link href={investigateHref()} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-medium text-accent hover:text-accent-strong">
              All investigations
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          }
        >
          {loading ? (
            <div role="status" aria-label="Loading suggestions" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: SUGGESTION_COUNT }, (_, i) => (
                <div key={i} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-3/4" />
                  <SkeletonText lines={2} />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {listed.map((suggestion, index) => (
                <InvestigationCard key={suggestion.investigation.id} suggestion={suggestion} length={studyLength} index={index} />
              ))}
            </div>
          )}
        </DashboardSection>
      )}

      <DashboardSection id="tools" title="More ways to study" description="Read closely, study the Savior's character, or take a quiet moment with Him.">
        <StudyTools
          passages={content.passages}
          attributes={content.attributes}
          connectSessions={content.connectSessions}
          connectExplorations={connectState.status === "ready" ? connectState.value : []}
          now={now}
        />
      </DashboardSection>

      <DashboardSection
        id="discoveries"
        title="Your discoveries"
        action={
          discoveries.length > 0 ? (
            <p className="text-sm text-subtle">{discoveries.length === 1 ? "1 discovery" : `${discoveries.length} discoveries`}</p>
          ) : undefined
        }
      >
        {loading ? (
          <div role="status" aria-label="Loading your discoveries" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : (
          <RecentDiscoveries cards={recentCards} total={discoveries.length} now={now} />
        )}
      </DashboardSection>

      <ResearchCard />
    </div>
  );
}
