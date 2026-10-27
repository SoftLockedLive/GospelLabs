import { FlaskConical } from "lucide-react";
import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/app-shell";
import { LibraryView } from "@/components/library/library-view";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { newInvestigationHref } from "@/lib/routes";

export const metadata: Metadata = { title: "My Library" };

export default function LibraryPage() {
  return (
    <PageContainer className="flex flex-col gap-8">
      <PageHeader
        eyebrow="My Library"
        title="Your research notebooks"
        description="Every question you’ve studied, with its notes and evidence. Pick up wherever you left off."
        actions={
          <ButtonLink href={newInvestigationHref()}>
            <FlaskConical aria-hidden />
            New research notebook
          </ButtonLink>
        }
      />
      <LibraryView />
    </PageContainer>
  );
}
