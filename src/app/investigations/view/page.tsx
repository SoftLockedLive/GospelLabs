import type { Metadata } from "next";
import { Suspense } from "react";
import { StoredInvestigation } from "@/components/investigations/stored-investigation";
import { PageContainer } from "@/components/layout/app-shell";
import { WorkspaceSkeleton } from "@/components/workspace/workspace-skeleton";

export const metadata: Metadata = { title: "Investigation" };

/**
 * Investigations live only in this browser's IndexedDB. This page is a static
 * shell; the client reads ?id= and loads the record, which also works offline.
 */
export default function InvestigationPage() {
  return (
    <PageContainer>
      <Suspense fallback={<WorkspaceSkeleton />}>
        <StoredInvestigation />
      </Suspense>
    </PageContainer>
  );
}
