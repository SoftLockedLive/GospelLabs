import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PassageExplorer } from "@/components/study/explorer/passage-explorer";
import { bundlePassage } from "@/domain/study/explorer";
import { getPassage, getSource, listPassages, STUDY_CONTENT } from "@/lib/study-content";

/** Same shape as PageProps<"/explore/[id]">, which exists only after Next's route typegen has run. */
type Props = { params: Promise<{ id: string }> };

/** Every passage is prerendered; any other id is a 404 (static export). */
export const dynamicParams = false;

/** A static export needs at least one path for a dynamic route; until a passage is ready, this one renders the not-found page. */
const NO_CONTENT_YET = "coming-soon";

export function generateStaticParams() {
  const ids = listPassages().map((passage) => ({ id: passage.id }));
  return ids.length ? ids : [{ id: NO_CONTENT_YET }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const passage = getPassage((await params).id);
  if (!passage) return { title: "Passage not found" };
  const reference = getSource(passage.sourceId)?.label;
  return {
    title: reference ? `${passage.title} (${reference})` : passage.title,
    description: `Explore ${reference ?? passage.title} in Scripture Explorer: themes, key phrases, related scriptures, and context.`,
  };
}

export default async function ExplorePassagePage({ params }: Props) {
  const passage = getPassage((await params).id);
  if (!passage) notFound();
  return <PassageExplorer bundle={bundlePassage(STUDY_CONTENT, passage)} />;
}
