import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/app-shell";
import { InvestigationPlayer } from "@/components/study/player/investigation-player";
import { bundleInvestigation } from "@/domain/study/engine/bundle";
import { getInvestigation, listInvestigations, STUDY_CONTENT } from "@/lib/study-content";

type Props = { params: Promise<{ id: string }> };

/** Every investigation is prerendered; any other id is a 404 (static export). */
export const dynamicParams = false;

/**
 * A static export needs at least one path for a dynamic route. Until any
 * investigation is ready, this placeholder path renders the not-found page.
 */
const NO_CONTENT_YET = "coming-soon";

export function generateStaticParams() {
  const ids = listInvestigations().map((investigation) => ({ id: investigation.id }));
  return ids.length ? ids : [{ id: NO_CONTENT_YET }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const investigation = getInvestigation((await params).id);
  if (!investigation) return { title: "Investigation not found" };
  return { title: investigation.title, description: investigation.question };
}

export default async function StudyInvestigationPage({ params }: Props) {
  const investigation = getInvestigation((await params).id);
  if (!investigation) notFound();
  // Only what the player needs: this investigation, its sources, and labels for what it adds to the Map.
  const bundle = bundleInvestigation(STUDY_CONTENT, investigation);
  return (
    <PageContainer>
      <InvestigationPlayer bundle={bundle} />
    </PageContainer>
  );
}
