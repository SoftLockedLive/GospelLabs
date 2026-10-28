"use client";

/**
 * The end of an investigation, saved as a Discovery Card. It opens with one
 * short card a phone shows at a glance: a small celebration, "Saved to your
 * Notebook", the title, the big idea, and the concepts, then where to go next.
 * Everything else (the full summary, key ideas, connections and their
 * evidence, how it points to Christ, questions to carry forward) waits under
 * one "See everything you found" disclosure, closed at first. What the
 * learner worked out is labeled "You discovered"; what was shown or explained
 * is labeled "Suggested by Gospel Labs". No scores.
 */
import { ArrowLeft, BookMarked, Check, ChevronDown, CircleCheck, ListChecks, Network } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import { ArtImage } from "@/components/ui/art-image";
import { ButtonLink, Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import type { StudyInvestigation } from "@/domain/study/content-schema";
import type { CardConnection, DiscoveryCard, StudyProgress } from "@/domain/study/user-data";
import { RELATION_PHRASES } from "@/domain/study/vocabulary";
import type { StudyAssistant } from "@/lib/assist";
import { cn } from "@/lib/cn";
import { investigateHref, mapHref, notebookHref } from "@/lib/routes";
import { ProvenanceLabel, SourceKindBadge } from "../shared/provenance";
import type { SaveStatus } from "./debounced-saver";
import { SaveStatusText, StorageNotice } from "./save-status";

interface CompletionViewProps {
  investigation: StudyInvestigation;
  progress: StudyProgress;
  card: DiscoveryCard;
  /** False when the card exists only on this page (it couldn't be saved, or was removed from the Notebook). */
  saved: boolean;
  saveError: string | null;
  /** Saves (or retries saving) the card. Absent while studying without saving. */
  onSaveCard?: () => void;
  noteStatus: SaveStatus;
  onNoteChange: (notes: string) => void;
  onReviewSteps: () => void;
  assistant: StudyAssistant;
}

/** A part of the discovery: a heading and its text, under a hairline. "sacred" sets apart what points to the Savior. */
function Section({ title, aside, children, variant = "plain" }: { title: string; aside?: ReactNode; children: ReactNode; variant?: "plain" | "sacred" }) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cn("motion-reveal", variant === "sacred" ? "rounded-xl border border-sacred-line bg-sacred p-5 text-sacred-fg sm:p-6" : "border-t border-line pt-6")}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id={id} className="text-heading">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function ConnectionItem({ connection, card }: { connection: CardConnection; card: DiscoveryCard }) {
  const evidence = connection.sourceIds.map((id) => card.sources.find((source) => source.id === id)).filter((source) => !!source);
  return (
    <li className="rounded-xl border border-line bg-surface-sunken px-4 py-3">
      {/* The note leads: it says the connection in plain words; the relation under it is how the Map names it. */}
      <p className="text-sm leading-relaxed text-fg">{connection.note}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">
        <span className="font-semibold text-fg">{connection.from.label}</span> {RELATION_PHRASES[connection.relation]}{" "}
        <span className="font-semibold text-fg">{connection.to.label}</span>
      </p>
      {evidence.length > 0 && (
        <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-subtle">
          <span>Evidence:</span>
          {evidence.map((source) => (
            <span key={source!.id} className="inline-flex items-center gap-1.5">
              <SourceKindBadge kind={source!.kind} />
              {source!.label}
            </span>
          ))}
        </p>
      )}
    </li>
  );
}

export function CompletionView({ investigation, progress, card, saved, saveError, onSaveCard, noteStatus, onNoteChange, onReviewSteps, assistant }: CompletionViewProps) {
  const [followUps, setFollowUps] = useState<string[]>(investigation.discovery.openQuestions);
  const noteId = useId();
  const bigIdeaId = useId();
  const { discovery } = investigation;
  // The first key idea is the clearest one-line answer (a summary's first sentence often only sets up the question).
  const [bigIdea] = discovery.keyIdeas;
  const demonstratedConcepts = card.concepts.filter((concept) => concept.demonstrated);
  const suggestedConcepts = card.concepts.filter((concept) => !concept.demonstrated);
  const demonstrated = card.connections.filter((connection) => connection.provenance === "demonstrated");
  const suggested = card.connections.filter((connection) => connection.provenance === "suggested");
  const nothingDemonstrated = demonstratedConcepts.length + demonstrated.length === 0;

  useEffect(() => {
    let active = true;
    assistant.followUpQuestions(investigation, { visitedBranches: progress.visitedBranches }).then(
      (reply) => active && reply.items && setFollowUps(reply.items),
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [assistant, investigation, progress.visitedBranches]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="motion-reveal">
        <ArtImage use={investigation.id} sizes="(min-width: 48rem) 48rem, 100vw" className="mb-5 w-full rounded-xl" decorative />
        <p className="flex items-center gap-2 text-[0.9375rem] font-semibold text-green">
          <CircleCheck aria-hidden className="motion-success size-5" />
          You finished the investigation!
        </p>
        {saved && (
          <p role="status" className="motion-success mt-3 inline-flex items-center gap-2 rounded-full border border-green/35 bg-green-soft px-3 py-1 text-sm text-fg">
            <Check aria-hidden className="size-4 text-green" />
            Saved to your Notebook.
          </p>
        )}
        <h1 tabIndex={-1} className="text-title mt-3 text-fg outline-none">
          {investigation.title}
        </h1>
        <p className="mt-2 font-serif text-lg leading-snug text-muted italic">{investigation.question}</p>

        {bigIdea && (
          <section aria-labelledby={bigIdeaId} className="mt-5 border-t border-line pt-4">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <h2 id={bigIdeaId} className="kicker text-muted">
                The big idea
              </h2>
              <ProvenanceLabel provenance="suggested" />
            </div>
            <p className="prose-scripture mt-2 text-fg">{bigIdea}</p>
          </section>
        )}

        {card.concepts.length > 0 && (
          <div className="mt-5 flex flex-col gap-3">
            {demonstratedConcepts.length > 0 && (
              <div className="flex flex-col gap-2">
                <ProvenanceLabel provenance="demonstrated" />
                <ul aria-label="Concepts you discovered" className="flex flex-wrap gap-2">
                  {demonstratedConcepts.map((concept) => (
                    <li key={concept.ref} className="inline-flex items-center gap-1.5 rounded-full border border-green/35 bg-green-soft px-3 py-1 text-xs font-medium text-fg">
                      <CircleCheck aria-hidden className="size-3 text-green" />
                      {concept.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {suggestedConcepts.length > 0 && (
              <div className="flex flex-col gap-2">
                <ProvenanceLabel provenance="suggested" />
                <ul aria-label="Concepts shown along the way" className="flex flex-wrap gap-2">
                  {suggestedConcepts.map((concept) => (
                    <li key={concept.ref} className="rounded-full border border-line-strong px-3 py-1 text-xs font-medium text-muted">
                      {concept.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </header>

      {saveError && <StorageNotice message={saveError} onRetry={onSaveCard} />}
      {!saved && !saveError && onSaveCard && (
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface-sunken p-4 text-sm leading-relaxed text-fg sm:flex-row sm:items-center sm:justify-between">
          <p>This discovery isn&rsquo;t in your Notebook right now. It may have been removed there.</p>
          <Button variant="secondary" onClick={onSaveCard} className="shrink-0">
            <BookMarked aria-hidden />
            Save to Notebook
          </Button>
        </div>
      )}

      <nav aria-label="Where to next" className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {saved && (
          <ButtonLink href={notebookHref(card.id)} size="lg" className="w-full sm:w-auto">
            <BookMarked aria-hidden />
            Open in Notebook
          </ButtonLink>
        )}
        <ButtonLink href={mapHref()} variant="secondary" size="lg" className="w-full sm:w-auto">
          <Network aria-hidden />
          Open your Map
        </ButtonLink>
        <ButtonLink href={investigateHref()} variant="ghost" size="lg" className="w-full sm:w-auto">
          <ArrowLeft aria-hidden />
          Back to investigations
        </ButtonLink>
        <Button variant="ghost" size="lg" onClick={onReviewSteps} className="w-full sm:w-auto">
          Look back through the steps
        </Button>
      </nav>

      {/* Native <details>: keyboard and screen-reader friendly, closed until the learner wants the full write-up. */}
      <details className="group/everything">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl border border-line-strong px-5 py-3 transition-colors select-none hover:bg-surface-raised [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 flex-col">
            <span className="text-base font-semibold text-fg">See everything you found</span>
            <span className="text-sm text-muted">The full summary, connections, sources, and questions</span>
          </span>
          <ChevronDown aria-hidden className="size-5 shrink-0 text-subtle transition-transform duration-200 group-open/everything:rotate-180" />
        </summary>

        <div className="mt-6 flex flex-col gap-6">
          <Section title="What the evidence shows" aside={<ProvenanceLabel provenance="suggested" />}>
            <p className="font-serif text-[1.05rem] leading-relaxed text-fg">{card.summary}</p>
            <h3 className="mt-5 kicker text-muted">Key ideas</h3>
            <ul className="mt-2 flex flex-col gap-2">
              {discovery.keyIdeas.map((idea) => (
                <li key={idea} className="flex gap-2.5 text-sm leading-relaxed text-fg">
                  <ListChecks aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
                  {idea}
                </li>
              ))}
            </ul>
          </Section>

          <Section
            title="Pointing to Christ"
            aside={<ProvenanceLabel provenance="suggested" />}
            variant="sacred"
          >
            <p className="font-serif text-[1.05rem] leading-relaxed text-fg">{discovery.christConnection}</p>
          </Section>

          {/* The concepts are on the card above; these are the connections between them, with their evidence. */}
          {(demonstrated.length > 0 || nothingDemonstrated) && (
            <Section title="What you discovered" aside={<ProvenanceLabel provenance="demonstrated" />}>
              {demonstrated.length === 0 ? (
                <p className="text-sm leading-relaxed text-muted">
                  This time, the answers were shown to you along the way, so what this investigation connects is saved as suggested. Study it again
                  whenever you like and work it out for yourself.
                </p>
              ) : (
                <ul aria-label="Connections" className="flex flex-col gap-2.5">
                  {demonstrated.map((connection) => (
                    <ConnectionItem key={connection.id} connection={connection} card={card} />
                  ))}
                </ul>
              )}
            </Section>
          )}

          {suggested.length > 0 && (
            <Section title="Shown along the way" aside={<ProvenanceLabel provenance="suggested" />}>
              <ul aria-label="Connections" className="flex flex-col gap-2.5">
                {suggested.map((connection) => (
                  <ConnectionItem key={connection.id} connection={connection} card={card} />
                ))}
              </ul>
            </Section>
          )}

          {followUps.length > 0 && (
            <Section title="Questions to carry forward">
              <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-fg marker:text-subtle">
                {followUps.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-subtle">Honest questions are part of learning. Bring them back to the scriptures, and to the Lord in prayer if you wish.</p>
            </Section>
          )}
        </div>
      </details>

      <section aria-labelledby={noteId} className="motion-reveal border-t border-line pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label id={noteId} htmlFor={`${noteId}-field`} className="flex items-baseline gap-2 text-base font-semibold text-fg">
            Your note
            <span className="text-xs font-normal text-subtle">Optional</span>
          </label>
          {card.notes && <SaveStatusText status={noteStatus} />}
        </div>
        <p className="mt-1 text-sm text-muted">Anything you want to remember. It&rsquo;s saved on your Discovery Card, on this device only.</p>
        <Textarea
          id={`${noteId}-field`}
          rows={3}
          value={card.notes}
          onChange={(event) => onNoteChange(event.target.value)}
          className="mt-3 font-serif text-base leading-relaxed"
        />
        {noteStatus.state === "error" && <p className="mt-2 text-xs text-danger">Your note couldn&rsquo;t be saved: {noteStatus.message}</p>}
      </section>
    </div>
  );
}
