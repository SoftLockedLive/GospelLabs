"use client";

/**
 * The end of an investigation: a calm summary of the discovery, saved as a
 * Discovery Card. What the learner worked out is labeled "You discovered";
 * what was shown or explained is labeled "Suggested by Gospel Labs". No
 * scores, no confetti.
 */
import { ArrowLeft, BookMarked, Check, Heart, ListChecks, Network, Route, Sparkles } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import { ButtonLink, Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Eyebrow } from "@/components/ui/page-header";
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

function Section({ title, icon, aside, children, className }: { title: string; icon: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={cn("motion-reveal rounded-2xl border border-line bg-surface p-5 sm:p-6", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id={id} className="flex items-center gap-2 text-base font-semibold text-fg">
          {icon}
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
      <p className="text-sm leading-relaxed text-fg">
        <span className="font-semibold">{connection.from.label}</span> <span className="text-muted">{RELATION_PHRASES[connection.relation]}</span>{" "}
        <span className="font-semibold">{connection.to.label}</span>
      </p>
      <p className="mt-1 text-sm leading-relaxed text-muted">{connection.note}</p>
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
  const { discovery } = investigation;
  const demonstratedConcepts = card.concepts.filter((concept) => concept.demonstrated);
  const suggestedConcepts = card.concepts.filter((concept) => !concept.demonstrated);
  const demonstrated = card.connections.filter((connection) => connection.provenance === "demonstrated");
  const suggested = card.connections.filter((connection) => connection.provenance === "suggested");

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
        <Eyebrow>Your discovery</Eyebrow>
        <h1 tabIndex={-1} className="mt-3 text-2xl font-semibold tracking-tight text-fg outline-none sm:text-3xl">
          {investigation.title}
        </h1>
        <p className="mt-3 font-serif text-xl leading-snug text-fg">{investigation.question}</p>
        {saved && (
          <p role="status" className="motion-success mt-4 inline-flex items-center gap-2 rounded-full border border-green/35 bg-green-soft px-3 py-1 text-sm text-fg">
            <Check aria-hidden className="size-4 text-green" />
            Saved to your Discovery Notebook
          </p>
        )}
      </header>

      {saveError && <StorageNotice message={saveError} onRetry={onSaveCard} />}
      {!saved && !saveError && onSaveCard && (
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface-sunken p-4 text-sm leading-relaxed text-fg sm:flex-row sm:items-center sm:justify-between">
          <p>This discovery isn&rsquo;t in your Notebook right now. It may have been removed there.</p>
          <Button variant="secondary" onClick={onSaveCard} className="shrink-0">
            <BookMarked aria-hidden />
            Save it to your Notebook
          </Button>
        </div>
      )}

      <Section title="What the evidence shows" icon={<BookMarked aria-hidden className="size-4 text-accent" />} aside={<ProvenanceLabel provenance="suggested" />}>
        <p className="font-serif text-[1.05rem] leading-relaxed text-fg">{card.summary}</p>
        <h3 className="mt-5 text-xs font-semibold tracking-wide text-muted uppercase">Key ideas</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {discovery.keyIdeas.map((idea) => (
            <li key={idea} className="flex gap-2.5 text-sm leading-relaxed text-fg">
              <ListChecks aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
              {idea}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="What you discovered" icon={<Sparkles aria-hidden className="size-4 text-green" />} aside={<ProvenanceLabel provenance="demonstrated" />}>
        {demonstratedConcepts.length + demonstrated.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted">
            This time, the answers were shown to you along the way, so what this investigation connects is saved as suggested. Study it again
            whenever you like and work it out for yourself.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {demonstratedConcepts.length > 0 && (
              <ul aria-label="Concepts" className="flex flex-wrap gap-2">
                {demonstratedConcepts.map((concept) => (
                  <li key={concept.ref} className="inline-flex items-center gap-1.5 rounded-full border border-green/35 bg-green-soft px-3 py-1 text-xs font-medium text-fg">
                    <Sparkles aria-hidden className="size-3 text-green" />
                    {concept.label}
                  </li>
                ))}
              </ul>
            )}
            {demonstrated.length > 0 && (
              <ul aria-label="Connections" className="flex flex-col gap-2.5">
                {demonstrated.map((connection) => (
                  <ConnectionItem key={connection.id} connection={connection} card={card} />
                ))}
              </ul>
            )}
          </div>
        )}
      </Section>

      {suggestedConcepts.length + suggested.length > 0 && (
        <Section title="Shown along the way" icon={<Route aria-hidden className="size-4 text-muted" />} aside={<ProvenanceLabel provenance="suggested" />}>
          {suggestedConcepts.length > 0 && (
            <ul aria-label="Concepts" className="mb-3 flex flex-wrap gap-2">
              {suggestedConcepts.map((concept) => (
                <li key={concept.ref} className="rounded-full border border-line-strong px-3 py-1 text-xs font-medium text-muted">
                  {concept.label}
                </li>
              ))}
            </ul>
          )}
          {suggested.length > 0 && (
            <ul aria-label="Connections" className="flex flex-col gap-2.5">
              {suggested.map((connection) => (
                <ConnectionItem key={connection.id} connection={connection} card={card} />
              ))}
            </ul>
          )}
        </Section>
      )}

      <Section
        title="Pointing to Christ"
        icon={<Heart aria-hidden className="size-4 text-accent" />}
        aside={<ProvenanceLabel provenance="suggested" />}
        className="border-accent/25 bg-accent-soft"
      >
        <p className="font-serif text-[1.05rem] leading-relaxed text-fg">{discovery.christConnection}</p>
      </Section>

      {followUps.length > 0 && (
        <Section title="Questions to carry forward" icon={<Route aria-hidden className="size-4 text-accent" />}>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-fg marker:text-subtle">
            {followUps.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-subtle">Honest questions are part of learning. Bring them back to the scriptures, and to the Lord in prayer if you wish.</p>
        </Section>
      )}

      <section aria-labelledby={noteId} className="motion-reveal rounded-2xl border border-line bg-surface p-5 sm:p-6">
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

      <nav aria-label="Where to next" className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {saved && (
          <ButtonLink href={notebookHref(card.id)} size="lg" className="w-full sm:w-auto">
            <BookMarked aria-hidden />
            Open in Notebook
          </ButtonLink>
        )}
        <ButtonLink href={mapHref()} variant="secondary" size="lg" className="w-full sm:w-auto">
          <Network aria-hidden />
          See your Discovery Map
        </ButtonLink>
        <ButtonLink href={investigateHref()} variant="ghost" size="lg" className="w-full sm:w-auto">
          <ArrowLeft aria-hidden />
          Back to investigations
        </ButtonLink>
        <Button variant="ghost" size="lg" onClick={onReviewSteps} className="w-full sm:w-auto">
          Look back through the steps
        </Button>
      </nav>
    </div>
  );
}
