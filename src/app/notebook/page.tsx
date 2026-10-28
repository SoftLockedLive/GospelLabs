import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer } from "@/components/layout/app-shell";
import { journalPlacesData } from "@/components/study/journal/journal-places-data";
import { NotebookSkeleton } from "@/components/study/notebook/notebook-browser";
import { NotebookView } from "@/components/study/notebook/notebook-view";

export const metadata: Metadata = { title: "Notebook" };

/**
 * Discovery Cards and the Journal are personal data in this browser's
 * IndexedDB, so this is a static shell: the client reads ?card= and ?view=
 * and renders everything. Only the titles of study content come from here,
 * for the Journal's "where you wrote it" links.
 */
export default function NotebookPage() {
  return (
    <PageContainer>
      <Suspense fallback={<NotebookSkeleton />}>
        <NotebookView places={journalPlacesData()} />
      </Suspense>
    </PageContainer>
  );
}
