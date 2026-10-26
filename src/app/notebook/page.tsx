import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer } from "@/components/layout/app-shell";
import { NotebookSkeleton } from "@/components/study/notebook/notebook-browser";
import { NotebookView } from "@/components/study/notebook/notebook-view";

export const metadata: Metadata = { title: "Discovery Notebook" };

/**
 * Discovery Cards are personal data in this browser's IndexedDB, so this is a
 * static shell: the client reads ?card= and renders everything.
 */
export default function NotebookPage() {
  return (
    <PageContainer>
      <Suspense fallback={<NotebookSkeleton />}>
        <NotebookView />
      </Suspense>
    </PageContainer>
  );
}
