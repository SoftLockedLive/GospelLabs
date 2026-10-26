import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/app-shell";
import { AttributeConnections, type CitedSource } from "@/components/study/character/attribute-connections";
import { AttributeGrid, type AttributeOverviewItem } from "@/components/study/character/character-overview";
import { SourceLink } from "@/components/study/shared/source-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { attributeEdges } from "@/domain/study/character";
import { getSource, getSources, listAttributes } from "@/lib/study-content";

export const metadata: Metadata = {
  title: "Character of Christ",
  description: "Study the Savior’s attributes through scripture, vocabulary, and accounts from His life.",
};

const PREACH_MY_GOSPEL = "preach-my-gospel-chapter-6";
const MEEK_AND_LOWLY = { sourceId: "matthew-11-28-30", verse: 29 };

export default function CharacterPage() {
  const attributes = listAttributes();
  const items: AttributeOverviewItem[] = attributes.map((attribute) => ({
    id: attribute.id,
    name: attribute.name,
    summary: attribute.summary,
    words: attribute.vocabulary.slice(0, 3).map((word) => word.term),
  }));
  const edges = attributeEdges(attributes);
  const cited = getSources([...new Set(edges.flatMap((edge) => edge.links.flatMap((link) => link.sourceIds)))]);
  const sources: Record<string, CitedSource> = Object.fromEntries(
    cited.map((source) => [source.id, { id: source.id, label: source.label, url: source.url, kind: source.kind }]),
  );
  const preachMyGospel = getSource(PREACH_MY_GOSPEL);
  const invitation = getSource(MEEK_AND_LOWLY.sourceId);
  const invitationVerse = invitation?.verses?.find((verse) => verse.number === MEEK_AND_LOWLY.verse);

  return (
    <PageContainer className="flex flex-col gap-12">
      <PageHeader
        eyebrow="Character of Christ"
        title="Learn of Him"
        description="Study the Savior’s character—what each attribute means, the words that describe it, what the scriptures teach, and how Jesus Christ showed it."
      />

      <section aria-label="About the Character of Christ" className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {invitation && invitationVerse && (
          <figure className="flex flex-col justify-center gap-3 rounded-2xl border border-sacred-line bg-sacred p-5 sm:p-7">
            <blockquote className="prose-scripture text-lg text-sacred-fg">“{invitationVerse.text}”</blockquote>
            <figcaption className="text-sm font-medium text-sacred-muted">
              {invitation.label.split(":")[0]}:{MEEK_AND_LOWLY.verse}
            </figcaption>
          </figure>
        )}
        <div className="flex flex-col justify-center gap-3 text-sm leading-relaxed text-muted sm:text-base">
          <p className="text-fg">
            A Christlike attribute is “a quality or trait of the Savior’s nature and character.” Here you can explore nine of them through
            scripture, the teachings of prophets, and accounts from His life.
          </p>
          <p>
            This is a place to learn about Him. It doesn’t measure, rate, or compare anyone—these attributes “are not items on a checklist.”
          </p>
          {preachMyGospel && (
            <SourceLink source={preachMyGospel}>Quoted from {preachMyGospel.label}</SourceLink>
          )}
        </div>
      </section>

      <section aria-labelledby="attributes-title" className="flex flex-col gap-5">
        <h2 id="attributes-title" className="text-lg font-semibold tracking-tight text-fg sm:text-xl">
          Attributes of the Savior
        </h2>
        {items.length > 0 ? (
          <AttributeGrid attributes={items} />
        ) : (
          <EmptyState icon={Sparkles} title="Attributes are on their way" description="Check back soon." className="bg-surface" />
        )}
      </section>

      {edges.length > 0 && (
        <section aria-labelledby="connections-title" className="flex flex-col gap-5">
          <div className="max-w-2xl">
            <h2 id="connections-title" className="text-lg font-semibold tracking-tight text-fg sm:text-xl">
              How they connect
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              The scriptures and prophets often name these attributes together. Choose one to see its connections and the sources behind each.
            </p>
          </div>
          <AttributeConnections attributes={items.map(({ id, name }) => ({ id, name }))} edges={edges} sources={sources} />
        </section>
      )}
    </PageContainer>
  );
}
