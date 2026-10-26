import { BookOpenText, ScrollText } from "lucide-react";
import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/app-shell";
import { PassageLibrary, type PassageListItem } from "@/components/study/explorer/passage-library";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { bundlePassage } from "@/domain/study/explorer";
import { listPassages, STUDY_CONTENT } from "@/lib/study-content";

export const metadata: Metadata = {
  title: "Scripture Explorer",
  description: "Explore short scripture passages: highlight phrases, trace themes, and connect related scriptures.",
};

export default function ExplorePage() {
  const passages: PassageListItem[] = listPassages().map((passage) => {
    const { sources, themes } = bundlePassage(STUDY_CONTENT, passage);
    return {
      id: passage.id,
      title: passage.title,
      reference: sources[passage.sourceId]?.label ?? passage.title,
      ...(passage.context.speaker ? { speaker: passage.context.speaker } : {}),
      themes: passage.themes.map((theme) => themes[theme.conceptId]).filter((theme) => !!theme).map(({ label, ref }) => ({ label, ref })),
      activityIds: passage.activities.map((activity) => activity.id),
    };
  });

  return (
    <PageContainer className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Scripture Explorer"
        title="Explore a passage"
        description="Choose a passage and study it closely: highlight the words that stand out, follow its themes, look up key phrases, and connect it with related scriptures."
      />

      <aside className="flex max-w-3xl items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3.5 text-sm leading-relaxed text-muted">
        <ScrollText aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
        <p>
          Gospel Labs shows short passages word for word, never more than 12 verses at a time, and links each one to the full chapter on
          ChurchofJesusChrist.org so you can read it in context. Your highlights and notes stay on this device.
        </p>
      </aside>

      {passages.length ? (
        <PassageLibrary passages={passages} />
      ) : (
        <EmptyState icon={BookOpenText} title="No passages yet" description="Passages for Scripture Explorer are still being prepared." />
      )}
    </PageContainer>
  );
}
