import { ArrowDown, ArrowLeft, Puzzle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/app-shell";
import { ActivitiesSection } from "@/components/study/character/attribute-activities";
import {
  ContrastsSection,
  DefinitionSection,
  RelatedSection,
  SaviorExamplesSection,
  ScripturesSection,
} from "@/components/study/character/attribute-sections";
import { AttributeStudyProvider } from "@/components/study/character/attribute-study-context";
import { ReflectionSection } from "@/components/study/character/reflection-section";
import { ExploredStatus, SaveToNotebook } from "@/components/study/character/save-to-notebook";
import { VocabularySection } from "@/components/study/character/vocabulary-cards";
import { BackLink } from "@/components/ui/back-link";
import { buttonClasses } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/page-header";
import { attributeCardNodeRefs } from "@/domain/study/cards/attribute";
import { attributeLinksFor } from "@/domain/study/character";
import type { Source } from "@/domain/study/content-schema";
import { cn } from "@/lib/cn";
import { characterHref } from "@/lib/routes";
import { getAttribute, getNodeLabel, getSources, listAttributes } from "@/lib/study-content";

/** Same shape as PageProps<"/character/[id]">, which exists only after Next's route typegen has run. */
type AttributePageProps = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return listAttributes().map((attribute) => ({ id: attribute.id }));
}

export async function generateMetadata({ params }: AttributePageProps): Promise<Metadata> {
  const attribute = getAttribute((await params).id);
  return attribute ? { title: `${attribute.name} · Character of Christ`, description: attribute.summary } : { title: "Attribute not found" };
}

export default async function AttributePage({ params }: AttributePageProps) {
  const { id } = await params;
  const attribute = getAttribute(id);
  if (!attribute) notFound();

  const all = listAttributes();
  const names = Object.fromEntries(all.map((item) => [item.id, item.name]));
  const links = attributeLinksFor(all, attribute.id).filter((link) => names[link.from] && names[link.to]);
  const sourceIds = new Set([...attribute.sources.map((source) => source.id), ...links.flatMap((link) => link.sourceIds)]);
  const sources: Record<string, Source> = Object.fromEntries(getSources([...sourceIds]).map((source) => [source.id, source]));
  const labels = Object.fromEntries(attributeCardNodeRefs(attribute, links).map((ref) => [ref, getNodeLabel(ref)]));

  const index = all.findIndex((item) => item.id === attribute.id);
  const next = all.length > 1 ? all[(index + 1) % all.length] : undefined;

  const sections = [
    { href: "#definition", label: "Meaning" },
    { href: "#words", label: "Words" },
    ...(attribute.contrasts.length ? [{ href: "#contrasts", label: "Not to be confused with" }] : []),
    { href: "#scriptures", label: "Scriptures" },
    { href: "#savior", label: "The Savior’s life" },
    ...(links.length ? [{ href: "#related", label: "Connections" }] : []),
    { href: "#activities", label: "Look closer" },
  ];

  return (
    <AttributeStudyProvider attribute={attribute} links={links} sources={sources} labels={labels}>
      <PageContainer>
        <div className="mx-auto flex max-w-4xl flex-col gap-12">
          <header className="flex flex-col gap-4">
            <BackLink href={characterHref()}>Character of Christ</BackLink>
            <div className="flex flex-col gap-2">
              <Eyebrow>Christlike attribute</Eyebrow>
              <h1 className="text-title text-fg">{attribute.name}</h1>
              <p className="max-w-2xl text-base leading-relaxed text-muted sm:text-lg">{attribute.summary}</p>
              <ExploredStatus />
            </div>
            {/* The activities come after the reading, many screens down on a phone: this is the way straight there. */}
            <a href="#activities" className={cn(buttonClasses({ size: "lg" }), "w-full sm:w-fit")}>
              <Puzzle aria-hidden />
              Try an activity
              <ArrowDown aria-hidden />
            </a>
            <nav aria-label="On this page">
              <ul className="flex flex-wrap gap-2">
                {sections.map((section) => (
                  <li key={section.href}>
                    <a
                      href={section.href}
                      className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-sm text-muted transition-colors hover:border-accent/40 hover:text-fg"
                    >
                      {section.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </header>

          <DefinitionSection attribute={attribute} sources={sources} />
          <VocabularySection />
          <ContrastsSection attribute={attribute} sources={sources} />
          <ScripturesSection attribute={attribute} sources={sources} />
          <SaviorExamplesSection attribute={attribute} sources={sources} />
          <RelatedSection attribute={attribute} links={links} names={names} sources={sources} />
          <ActivitiesSection />
          <ReflectionSection />
          <SaveToNotebook />

          {next && next.id !== attribute.id && (
            <footer className="flex flex-col gap-2 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
              <Link href={characterHref()} className="inline-flex min-h-11 items-center text-sm text-muted hover:text-fg">
                All attributes
              </Link>
              <Link
                href={characterHref(next.id)}
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-strong hover:underline"
              >
                Next: {next.name}
                <ArrowLeft aria-hidden className="size-4 rotate-180" />
              </Link>
            </footer>
          )}
        </div>
      </PageContainer>
    </AttributeStudyProvider>
  );
}
