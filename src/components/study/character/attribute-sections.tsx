/**
 * The reading sections of an attribute page: definition, easily confused
 * ideas, scriptures, accounts from the Savior's life, and related attributes.
 * Plain components (no state), so the page renders them on the server.
 *
 * On phones the four long lists after the words (ideas, scriptures, accounts,
 * connections) start collapsed behind a "Show …" button, so the activities
 * aren't ten screens down. Safety notes are never collapsed: the safety notice
 * sits beside the definition, and any item that is itself a safety note stays
 * visible in its list.
 */
import { ArrowRight, Lightbulb, Scale, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ProvenanceLabel } from "@/components/study/shared/provenance";
import { SourceCard } from "@/components/study/shared/source-card";
import type { AttributeLink } from "@/domain/study/character";
import { otherEnd } from "@/domain/study/character";
import type { ChristAttribute, Source } from "@/domain/study/content-schema";
import { PROVENANCE_LABELS, RELATION_PHRASES } from "@/domain/study/vocabulary";
import { cn } from "@/lib/cn";
import { characterHref } from "@/lib/routes";
import { COLLAPSES_ON_PHONES, isSafetyNote } from "./collapse";
import { PhoneCollapse } from "./phone-collapse";
import { SourceCitations } from "./source-citations";

type Sources = Readonly<Record<string, Source>>;

/** A titled page section with an anchor for the "On this page" links. */
export function StudySection({
  id,
  title,
  description,
  children,
  className,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("scroll-mt-24 flex flex-col gap-4", className)}>
      <div className="max-w-2xl">
        <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight text-fg sm:text-xl">
          {title}
        </h2>
        {description && <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

const stagger = (index: number) => ({ "--motion-index": index }) as CSSProperties;

export function DefinitionSection({ attribute, sources }: { attribute: ChristAttribute; sources: Sources }) {
  return (
    <StudySection id="definition" title={`What ${attribute.name.toLowerCase()} means`}>
      <div>
        <p className="prose-scripture max-w-3xl text-fg">{attribute.definition.text}</p>
        <SourceCitations
          sourceIds={attribute.definition.sourceIds}
          sources={sources}
          label="Quoted and summarized from"
          className="mt-5 border-t border-line pt-4"
        />
      </div>
      {attribute.safety && <SafetyNotice safety={attribute.safety} sources={sources} />}
    </StudySection>
  );
}

/**
 * Shown on attributes that could be misread as asking someone to stay in harm's way. Placed beside the
 * definition, not further down the page, so nobody has to scroll past it.
 */
function SafetyNotice({ safety, sources }: { safety: NonNullable<ChristAttribute["safety"]>; sources: Sources }) {
  return (
    <aside aria-label="If someone is hurting you" className="mt-4 rounded-2xl border border-accent/40 bg-accent-soft p-5 sm:p-6">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
        <ShieldCheck aria-hidden className="size-4 text-accent" />
        If someone is hurting you
      </h3>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-fg">{safety.text}</p>
      <SourceCitations sourceIds={safety.sourceIds} sources={sources} label="Help and sources" className="mt-4" />
    </aside>
  );
}

export function ContrastsSection({ attribute, sources }: { attribute: ChristAttribute; sources: Sources }) {
  if (attribute.contrasts.length === 0) return null;
  const safety = attribute.contrasts.map((contrast) => isSafetyNote(`${contrast.title} ${contrast.explanation}`, contrast.sourceIds));
  const shown = safety.filter(Boolean).length;
  return (
    <StudySection
      id="contrasts"
      title="Not to be confused with"
      description="Ideas that are easy to mix up with this attribute, and what the sources say about the difference."
    >
      <PhoneCollapse sectionId="contrasts" hidden={safety.length - shown} someShown={shown > 0} noun={["idea", "ideas"]}>
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {attribute.contrasts.map((contrast, index) => (
            <li key={contrast.id} className={cn("motion-reveal", !safety[index] && COLLAPSES_ON_PHONES)} style={stagger(index)}>
              <article className="flex h-full flex-col gap-3 rounded-xl border border-line bg-surface p-5">
                <p className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber/30 bg-amber-soft px-2.5 py-0.5 text-xs font-medium text-amber">
                  <Scale aria-hidden className="size-3.5" />
                  Not the same as: {contrast.term}
                </p>
                <h3 className="text-base font-semibold tracking-tight text-fg">{contrast.title}</h3>
                <p className="text-sm leading-relaxed text-fg">{contrast.explanation}</p>
                <ProvenanceLabel provenance="suggested" />
                <SourceCitations sourceIds={contrast.sourceIds} sources={sources} className="mt-auto pt-1" />
              </article>
            </li>
          ))}
        </ul>
      </PhoneCollapse>
    </StudySection>
  );
}

export function ScripturesSection({ attribute, sources }: { attribute: ChristAttribute; sources: Sources }) {
  const items = attribute.scriptures.filter((item) => sources[item.sourceId]);
  const safety = items.map((item) => isSafetyNote(item.note));
  const shown = safety.filter(Boolean).length;
  return (
    <StudySection id="scriptures" title="In the scriptures">
      <PhoneCollapse sectionId="scriptures" hidden={items.length - shown} someShown={shown > 0} noun={["passage", "passages"]}>
        <ul className="flex flex-col gap-5">
          {items.map((item, index) => {
            const source = sources[item.sourceId]!;
            return (
              <li key={item.sourceId} className={cn("motion-reveal flex flex-col gap-2", !safety[index] && COLLAPSES_ON_PHONES)} style={stagger(index)}>
                <div className="flex flex-col gap-1">
                  <p className="max-w-3xl text-sm leading-relaxed text-fg">{item.note}</p>
                  <ProvenanceLabel provenance="suggested" />
                </div>
                <SourceCard source={source} collapsibleText />
              </li>
            );
          })}
        </ul>
      </PhoneCollapse>
    </StudySection>
  );
}

export function SaviorExamplesSection({ attribute, sources }: { attribute: ChristAttribute; sources: Sources }) {
  const examples = attribute.saviorExamples.filter((example) => sources[example.sourceId]);
  const safety = examples.map((example) => isSafetyNote(`${example.title} ${example.note}`));
  const shown = safety.filter(Boolean).length;
  return (
    <StudySection
      id="savior"
      title="From the Savior’s life"
      description={`Accounts of Jesus Christ that show ${attribute.name.toLowerCase()}.`}
    >
      <PhoneCollapse sectionId="savior" hidden={examples.length - shown} someShown={shown > 0} noun={["account", "accounts"]}>
        <ul className="flex flex-col gap-5">
          {examples.map((example, index) => {
            const source = sources[example.sourceId]!;
            return (
              <li key={example.id} className={cn("motion-reveal", !safety[index] && COLLAPSES_ON_PHONES)} style={stagger(index)}>
                <article className="flex flex-col gap-4 rounded-2xl border border-sacred-line bg-sacred p-4 sm:p-6">
                  <div className="flex flex-col gap-2">
                    <h3 className="font-serif text-lg leading-snug text-sacred-fg">{example.title}</h3>
                    <p className="max-w-3xl text-sm leading-relaxed text-sacred-fg">{example.note}</p>
                    <p className="inline-flex items-center gap-1.5 text-xs font-medium text-sacred-muted">
                      <Lightbulb aria-hidden className="size-3.5" />
                      {PROVENANCE_LABELS.suggested}
                    </p>
                  </div>
                  <SourceCard source={source} headingLevel="h4" collapsibleText />
                </article>
              </li>
            );
          })}
        </ul>
      </PhoneCollapse>
    </StudySection>
  );
}

export function RelatedSection({
  attribute,
  links,
  names,
  sources,
}: {
  attribute: ChristAttribute;
  links: readonly AttributeLink[];
  names: Readonly<Record<string, string>>;
  sources: Sources;
}) {
  if (links.length === 0) return null;
  const name = (id: string) => names[id] ?? id;
  const safety = links.map((link) => isSafetyNote(link.note, link.sourceIds));
  const shown = safety.filter(Boolean).length;
  return (
    <StudySection
      id="related"
      title="How it connects"
      description="Other attributes the sources link with this one. These links also appear on your Map."
    >
      <PhoneCollapse sectionId="related" hidden={links.length - shown} someShown={shown > 0} noun={["connection", "connections"]}>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {links.map((link, index) => {
            const other = otherEnd(link, attribute.id);
            return (
              <li key={`${link.from}-${link.relation}-${link.to}`} className={cn("motion-reveal", !safety[index] && COLLAPSES_ON_PHONES)} style={stagger(index)}>
                <article className="flex h-full flex-col gap-3 rounded-xl border border-line bg-surface p-5">
                  <h3 className="text-base font-semibold tracking-tight text-fg">
                    <Link
                      href={characterHref(other)}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-md text-accent hover:text-accent-strong hover:underline sm:min-h-0"
                    >
                      {name(other)}
                      <ArrowRight aria-hidden className="size-4" />
                    </Link>
                  </h3>
                  <p className="text-xs font-medium text-muted">
                    {name(link.from)} {RELATION_PHRASES[link.relation]} {name(link.to).toLowerCase()}
                  </p>
                  <p className="text-sm leading-relaxed text-fg">{link.note}</p>
                  <SourceCitations sourceIds={link.sourceIds} sources={sources} className="mt-auto pt-1" />
                </article>
              </li>
            );
          })}
        </ul>
      </PhoneCollapse>
    </StudySection>
  );
}
