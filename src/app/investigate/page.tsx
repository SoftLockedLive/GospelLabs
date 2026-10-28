import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/app-shell";
import { InvestigationLibrary } from "@/components/study/player/investigation-library";
import { summarizeInvestigation } from "@/components/study/player/library";
import { PageHeader } from "@/components/ui/page-header";
import { STUDY_LENGTH_MINUTES } from "@/domain/study/vocabulary";
import { listInvestigations, STUDY_CONTENT } from "@/lib/study-content";

export const metadata: Metadata = {
  title: "Guided investigations",
  description: "Start with a real question, look closely at the evidence, and save what you discover.",
};

export default function InvestigatePage() {
  // Summaries only: the full content of each investigation loads on its own page.
  const items = listInvestigations().map((investigation) => summarizeInvestigation(investigation, STUDY_CONTENT));
  return (
    <PageContainer>
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Guided investigations"
          description={
            <>
              Each starts with a question learners have asked, then looks at what the scriptures and prophets say. A quick study
              takes about {STUDY_LENGTH_MINUTES.quick.join("–")} minutes, a deep one {STUDY_LENGTH_MINUTES.deep.join("–")}. Stop after
              any step; your place is saved.
            </>
          }
        />
        <InvestigationLibrary items={items} />
      </div>
    </PageContainer>
  );
}
