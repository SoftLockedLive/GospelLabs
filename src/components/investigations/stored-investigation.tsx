"use client";

import { FileQuestion, FileWarning, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InvestigationWorkspace } from "@/components/workspace/investigation-workspace";
import { WorkspaceSkeleton } from "@/components/workspace/workspace-skeleton";
import { isSectionId, type Investigation, type SectionId } from "@/domain/investigation";
import { getCuratedQuestion } from "@/lib/question-bank";
import { useStoredInvestigation } from "@/persistence/hooks";
import { dropUnsavedCopy, readUnsavedCopy, resolveUnsavedCopy } from "@/persistence/unsaved-copy";
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

  if (result.status === "newer") {
    return (
      <EmptyState
        headingLevel={1}
        icon={RefreshCw}
        title="This investigation was saved by a newer version"
        description="A newer version of Gospel Labs saved it. To protect that data, this version won't open it for editing. Reload to get the latest version."
        action={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => window.location.reload()}>Reload</Button>
            <ButtonLink href="/library" variant="secondary">
              Go to My Library
            </ButtonLink>
          </div>
        }
        className="mt-6 bg-surface"
      />
    );
  }

  return <OpenInvestigation key={result.investigation.id} stored={result.investigation} openAt={openAt} />;
}

/** Opens a loaded investigation, restoring edits that didn't finish saving last time (see unsaved-copy.ts). */
function OpenInvestigation({ stored, openAt }: { stored: Investigation; openAt?: SectionId }) {
  // Resolved once, when the investigation opens; the copy is removed once its edits are saved.
  const [{ initial: content, basedOn, restored }] = useState(() =>
    resolveUnsavedCopy(stored, readUnsavedCopy(stored.id)),
  );
  // A copy whose edits were saved after all (the last save finished as the page closed) is stale.
  useEffect(() => {
    if (!restored) dropUnsavedCopy(stored.id);
  }, [restored, stored.id]);
  const initial = openAt && openAt !== content.currentSection ? { ...content, currentSection: openAt } : content;
  const sourceQuestion = stored.sourceQuestionId ? getCuratedQuestion(stored.sourceQuestionId) : undefined;

  return (
    <InvestigationWorkspace
      initial={initial}
      stored={stored}
      basedOn={basedOn}
      restored={restored}
      sourceQuestion={sourceQuestion}
    />
  );
}
