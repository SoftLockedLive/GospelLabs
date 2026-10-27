"use client";

import { ArrowLeft, ArrowRight, FileQuestion, Highlighter, Link2, Map as MapIcon, Quote, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { StorageErrorState } from "@/components/investigations/storage-error-state";
import { ProvenanceLabel } from "@/components/study/shared/provenance";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/page-header";
import { cardMapRef } from "@/domain/study/graph";
import { ORIGIN_LABELS, splitConcepts } from "@/domain/study/notebook";
import type { CardConnection, DiscoveryCard } from "@/domain/study/user-data";
import { DIFFICULTY_LABELS, RELATION_PHRASES } from "@/domain/study/vocabulary";
import { formatDate } from "@/lib/format";
import { mapHref, notebookHref } from "@/lib/routes";
import { useDiscoveryCard } from "@/persistence/study-hooks";
import { CardNotes } from "./card-notes";
import { CardSourceRow, sourcesById } from "./card-source";
import { ConceptChip } from "./concept-chip";
import { DeleteCardDialog } from "./delete-card-dialog";
import { ORIGIN_ICONS, ORIGIN_LINK_LABELS, originHref } from "./origin";

interface CardDetailProps {
  cardId: string;
  onDeleted: (card: DiscoveryCard) => void;
}

/** One Discovery Card, opened from the Notebook (/notebook?card=id). */
export function CardDetail({ cardId, onDeleted }: CardDetailProps) {
  const state = useDiscoveryCard(cardId);
  // The card as last shown, and whether notes typed on it are still waiting to be stored. If the card is
  // deleted in another tab (or can't be read any more) meanwhile, it stays on screen so the notes can be copied.
  const [shown, setShown] = useState<DiscoveryCard | null>(null);
  const [unsavedNotes, setUnsavedNotes] = useState(false);
  const current = state.status === "ready" ? state.value : undefined;
  if (current && current !== shown) setShown(current);

  if (shown && unsavedNotes && !current && state.status !== "loading") {
    const problem = state.status === "error" ? `This discovery can’t be read right now. ${state.error.message}` : "This discovery was deleted, perhaps in another tab or window.";
    return <LoadedCard card={shown} onDeleted={onDeleted} onUnsavedNotesChange={setUnsavedNotes} gone={problem} />;
  }
  if (state.status === "loading") return <CardDetailSkeleton />;
  if (state.status === "error") return <StorageErrorState error={state.error} headingLevel={1} />;
  if (!state.value) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink />
        <EmptyState
          headingLevel={1}
          icon={FileQuestion}
          title="This discovery isn’t in your Notebook"
          description="It may have been deleted, or it was saved in a different browser or on a different device."
          action={<ButtonLink href={notebookHref()}>Open your Notebook</ButtonLink>}
          className="bg-surface"
        />
      </div>
    );
  }
  return <LoadedCard card={state.value} onDeleted={onDeleted} onUnsavedNotesChange={setUnsavedNotes} />;
}

function BackLink() {
  return (
    <Link
      href={notebookHref()}
      className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-md text-sm text-muted hover:text-fg sm:min-h-0 sm:py-1"
    >
      <ArrowLeft aria-hidden className="size-4" />
      Discovery Notebook
    </Link>
  );
}

interface LoadedCardProps {
  card: DiscoveryCard;
  onDeleted: (card: DiscoveryCard) => void;
  onUnsavedNotesChange: (unsaved: boolean) => void;
  /** Set when the card is shown only to keep unsaved notes on screen: why it is no longer in the Notebook. */
  gone?: string;
}

function LoadedCard({ card, onDeleted, onUnsavedNotesChange, gone }: LoadedCardProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const OriginIcon = ORIGIN_ICONS[card.origin.kind];
  const { discovered, suggested } = splitConcepts(card);
  const mapRef = cardMapRef(card);

  // Move focus to the card's title when it opens, so screen readers start there.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [card.id]);

  return (
    <article aria-labelledby="discovery-card-title" className="motion-reveal flex flex-col gap-8">
      <div className="flex flex-col gap-5">
        <BackLink />
        <header className="flex flex-col gap-4">
          <div>
            <Eyebrow className="mb-2 flex items-center gap-1.5">
              <OriginIcon aria-hidden className="size-3.5" />
              {ORIGIN_LABELS[card.origin.kind]}
            </Eyebrow>
            <h1
              id="discovery-card-title"
              ref={headingRef}
              tabIndex={-1}
              className="text-2xl font-semibold tracking-tight text-fg focus:outline-none sm:text-3xl"
            >
              {card.title}
            </h1>
            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-subtle">
              <span>
                Saved <time dateTime={card.createdAt}>{formatDate(card.createdAt)}</time>
              </span>
              {card.origin.difficulty && <span>Studied at {DIFFICULTY_LABELS[card.origin.difficulty]} difficulty</span>}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={originHref(card.origin)} variant="secondary">
              {ORIGIN_LINK_LABELS[card.origin.kind]}
              <ArrowRight aria-hidden />
            </ButtonLink>
            {mapRef && (
              <ButtonLink href={mapHref(mapRef)} variant="secondary">
                <MapIcon aria-hidden />
                See on Map
              </ButtonLink>
            )}
            {!gone && (
              <Button variant="ghost" className="text-danger hover:text-danger" onClick={() => setConfirmingDelete(true)}>
                <Trash2 aria-hidden />
                Delete
              </Button>
            )}
          </div>
        </header>
        {gone && (
          <p role="alert" className="rounded-xl border border-amber/40 bg-amber-soft px-4 py-3 text-sm leading-relaxed text-fg">
            <strong className="font-semibold">{gone}</strong> It stays on this page until you leave, so you can copy the notes you were
            writing.
          </p>
        )}
      </div>

      {card.question && (
        <section aria-labelledby="card-question" className="rounded-xl border border-accent/25 bg-accent-soft px-5 py-4">
          <h2 id="card-question" className="font-mono text-xs font-medium tracking-[0.14em] text-accent uppercase">
            The question
          </h2>
          <p className="mt-1.5 font-serif text-lg leading-relaxed text-fg">{card.question}</p>
        </section>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10">
        <div className="flex min-w-0 flex-col gap-8">
          {card.summary.trim() && (
            <Section id="card-summary" title="What this discovery shows" aside={<ProvenanceLabel provenance="suggested" />}>
              <p className="leading-relaxed text-fg">{card.summary}</p>
            </Section>
          )}

          {card.concepts.length > 0 && (
            <Section id="card-concepts" title="Concepts">
              <div className="flex flex-col gap-4">
                {discovered.length > 0 && (
                  <ConceptGroup provenance="demonstrated" hint="You worked these out yourself.">
                    {discovered.map((concept) => (
                      <li key={concept.ref} className="max-w-full">
                        <ConceptChip concept={concept} linked />
                      </li>
                    ))}
                  </ConceptGroup>
                )}
                {suggested.length > 0 && (
                  <ConceptGroup provenance="suggested" hint="Shown to you along the way, for example when you chose “Show me”.">
                    {suggested.map((concept) => (
                      <li key={concept.ref} className="max-w-full">
                        <ConceptChip concept={concept} linked />
                      </li>
                    ))}
                  </ConceptGroup>
                )}
              </div>
            </Section>
          )}

          {card.connections.length > 0 && (
            <Section id="card-connections" title="Connections" icon={Link2}>
              <ul className="flex flex-col gap-3">
                {card.connections.map((connection) => (
                  <li key={connection.id}>
                    <ConnectionItem connection={connection} card={card} />
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {card.highlights.length > 0 && (
            <Section id="card-highlights" title="Highlights" icon={Highlighter}>
              <ul className="flex flex-col gap-3">
                {card.highlights.map((highlight, index) => {
                  const source = card.sources.find((s) => s.id === highlight.sourceId);
                  const concept = highlight.conceptId ? card.concepts.find((c) => c.ref.endsWith(`:${highlight.conceptId}`)) : undefined;
                  return (
                    <li key={`${highlight.sourceId}-${highlight.verse}-${index}`} className="rounded-xl border border-line bg-surface p-4">
                      <blockquote className="border-l-2 border-amber/60 pl-3 font-serif leading-relaxed text-fg">
                        {highlight.text}
                      </blockquote>
                      <p className="mt-2 text-xs text-subtle">
                        {source ? source.label : "Scripture"}, verse {highlight.verse}
                        {concept && <> · {concept.label}</>}
                      </p>
                      {highlight.note.trim() && (
                        <div className="mt-3 flex flex-col gap-1">
                          <ProvenanceLabel provenance="user" />
                          <p className="text-sm leading-relaxed whitespace-pre-line text-muted">{highlight.note}</p>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}

          <Section id="card-notes" title="Notes">
            <CardNotes card={card} onUnsavedChange={onUnsavedNotesChange} />
          </Section>
        </div>

        <aside aria-labelledby="card-sources" className="flex flex-col gap-3 lg:sticky lg:top-6 lg:self-start">
          <h2 id="card-sources" className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Quote aria-hidden className="size-4 text-accent" />
            Sources explored
          </h2>
          {card.sources.length === 0 ? (
            <p className="text-sm text-muted">No sources were saved with this discovery.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface">
              {card.sources.map((source) => (
                <li key={source.id} className="px-4 py-3">
                  <CardSourceRow source={source} />
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <DeleteCardDialog
        card={card}
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onDeleted={(deleted) => {
          setConfirmingDelete(false);
          onDeleted(deleted);
        }}
      />
    </article>
  );
}

function Section({
  id,
  title,
  icon: Icon,
  aside,
  children,
}: {
  id: string;
  title: string;
  icon?: typeof Quote;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={id} className="flex items-center gap-2 text-sm font-semibold text-fg">
          {Icon && <Icon aria-hidden className="size-4 text-accent" />}
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function ConceptGroup({ provenance, hint, children }: { provenance: "demonstrated" | "suggested"; hint: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <ProvenanceLabel provenance={provenance} className="text-sm" />
        <span className="text-xs text-subtle">{hint}</span>
      </div>
      <ul className="flex flex-wrap gap-2">{children}</ul>
    </div>
  );
}

function ConnectionItem({ connection, card }: { connection: CardConnection; card: DiscoveryCard }) {
  const sources = sourcesById(card.sources, connection.sourceIds);
  return (
    <article className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ProvenanceLabel provenance={connection.provenance} />
        <Link
          href={mapHref(connection.from.ref)}
          className="inline-flex min-h-11 items-center gap-1 rounded-md text-xs text-muted hover:text-accent sm:min-h-0"
        >
          <MapIcon aria-hidden className="size-3.5" />
          On your Map
        </Link>
      </div>
      <p className="mt-2 leading-relaxed text-fg">
        <span className="font-medium">{connection.from.label}</span>{" "}
        <span className="text-accent">{RELATION_PHRASES[connection.relation]}</span>{" "}
        <span className="font-medium">{connection.to.label}</span>
      </p>
      {connection.note.trim() && <p className="mt-1.5 text-sm leading-relaxed text-muted">{connection.note}</p>}
      {sources.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
          <p className="text-xs font-medium text-subtle">{sources.length === 1 ? "Evidence" : "Evidence from"}</p>
          <ul className="flex flex-col gap-2">
            {sources.map((source) => (
              <li key={source.id}>
                <CardSourceRow source={source} compact />
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

export function CardDetailSkeleton() {
  return (
    <div role="status" aria-label="Loading discovery" className="flex animate-pulse flex-col gap-6">
      <div className="h-5 w-40 rounded bg-surface" />
      <div className="h-10 w-2/3 rounded-lg bg-surface" />
      <div className="h-24 rounded-xl bg-surface" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="h-64 rounded-xl border border-line bg-surface" />
        <div className="h-48 rounded-xl border border-line bg-surface" />
      </div>
    </div>
  );
}
