"use client";

import { FileQuestion, FileWarning } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InvestigationWorkspace } from "@/components/workspace/investigation-workspace";
import { WorkspaceSkeleton } from "@/components/workspace/workspace-skeleton";
import { isSectionId, type SectionId } from "@/domain/investigation";
import { getCuratedQuestion } from "@/lib/question-bank";
import { useStoredInvestigation } from "@/persistence/hooks";
import { StorageErrorState } from "./storage-error-state";

/**
 * Loads the saved investigation named by ?id= from this device and opens it
 * in the workspace, at ?section= if given, otherwise where the user left off.
 */
export function StoredInvestigation() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const section = searchParams.get("section");
  const openAt = isSectionId(section) ? section : undefined;
  return id ? <LoadedInvestigation key={id} id={id} openAt={openAt} /> : <NotFound />;
}

function NotFound() {
  return (
    <EmptyState
      headingLevel={1}
      icon={FileQuestion}
      title="Investigation not found"
      description="It may have been deleted, or it was saved in a different browser or on a different device."
      action={<ButtonLink href="/library">Go to My Library</ButtonLink>}
      className="mt-6 bg-surface"
    />
  );
}

function LoadedInvestigation({ id, openAt }: { id: string; openAt?: SectionId }) {
  const state = useStoredInvestigation(id);

  if (state.status === "loading") return <WorkspaceSkeleton />;
  if (state.status === "error") return <StorageErrorState error={state.error} onRetry={state.reload} headingLevel={1} />;

  const result = state.value;
  if (result.status === "missing") return <NotFound />;
  if (result.status === "unreadable") {
    return (
      <EmptyState
        headingLevel={1}
        icon={FileWarning}
        title="This investigation can't be opened"
        description="Its saved data didn't pass validation, so it was left untouched rather than risk damaging it."
        action={<ButtonLink href="/library">Go to My Library</ButtonLink>}
        className="mt-6 bg-surface"
      />
    );
  }

  const stored = result.investigation;
  const initial = openAt && openAt !== stored.currentSection ? { ...stored, currentSection: openAt } : stored;
  const sourceQuestion = stored.sourceQuestionId ? getCuratedQuestion(stored.sourceQuestionId) : undefined;

  return <InvestigationWorkspace key={stored.id} initial={initial} stored={stored} sourceQuestion={sourceQuestion} />;
}
