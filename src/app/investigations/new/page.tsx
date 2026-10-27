import type { Metadata } from "next";
import { Suspense } from "react";
import { NewInvestigation } from "@/components/investigations/new-investigation";
import { PageContainer } from "@/components/layout/app-shell";
import { WorkspaceSkeleton } from "@/components/workspace/workspace-skeleton";

export const metadata: Metadata = { title: "New research notebook" };

/** A static shell; the draft is created in the browser, so this works offline too. */
export default function NewInvestigationPage() {
  return (
    <PageContainer>
      <Suspense fallback={<WorkspaceSkeleton />}>
        <NewInvestigation />
      </Suspense>
    </PageContainer>
  );
}
