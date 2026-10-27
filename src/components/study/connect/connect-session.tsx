"use client";

import { ArrowDown, Shuffle } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { ProvenanceLabel, SourceKindBadge } from "@/components/study/shared/provenance";
import { SourceCard, SourceLink, VerseText } from "@/components/study/shared/source-card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import { CONNECT_FORMAT_LABELS, type ConnectSession, type Source } from "@/domain/study/content-schema";
import type { DiscoveryCard } from "@/domain/study/user-data";
import { Rest } from "./connect-layout";
import { PrivateNote } from "./private-note";
import { SaveToNotebook } from "./save-to-notebook";
import { TakeAMoment } from "./take-a-moment";

/** The session unfolds in three parts; earlier parts stay on the page so the verses can be read again. */
const STAGES = ["read", "consider", "ponder"] as const;
type Stage = (typeof STAGES)[number];

interface ConnectSessionViewProps {
  session: ConnectSession;
  sources: Readonly<Record<string, Source>>;
  /** The private note saved with this session earlier, if any. */
  initialNote: string;
  /**
   * Why the saved note can't be read, if it can't. Until it can, the note field isn't offered: a note typed
   * then would replace the saved one unseen.
   */
  noteUnavailable?: string;
  /** Reads the saved note again after noteUnavailable. */
  onRetryNote?: () => void;
  /** The Notebook card already saved from this session, if any. */
  savedCard?: DiscoveryCard;
  /** False while saved cards load or if they can't be read. */
  cardsReady: boolean;
  /** Why saved cards can't be read, if they can't. */
  cardsUnavailable?: string;
  onShowAnother?: () => void;
  /** Move focus to the title when the session appears (after choosing another from the end). */
  focusOnShow?: boolean;
}

/**
 * One Connect with Christ session: setting, scripture, what to notice (See)
 * or what the sources show (Understand), things to ponder, an optional pause,
 * an optional invitation to pray, an optional private note, and an optional
 * save to the Notebook. Nothing is required, scored, or timed.
 */
export function ConnectSessionView({
  session,
  sources,
  initialNote,
  noteUnavailable,
  onRetryNote,
  savedCard,
  cardsReady,
  cardsUnavailable,
  onShowAnother,
  focusOnShow = false,
}: ConnectSessionViewProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const considerId = `${id}-consider`;
  const ponderId = `${id}-ponder`;
  const source = sources[session.sourceId];
  const hasConsider = session.notice.length > 0 || session.insights.length > 0;
  const [stage, setStage] = useState<Stage>("read");
  const [note, setNote] = useState(initialNote);
  // Start from the saved note once it can be read; from then on the field holds the learner's text.
  const [noteRead, setNoteRead] = useState(noteUnavailable === undefined);
  if (!noteRead && noteUnavailable === undefined) {
    setNoteRead(true);
    setNote(initialNote);
  }
  const pendingFocus = useRef<string | null>(focusOnShow ? titleId : null);

  // When a new part appears, move focus to its heading so keyboard and screen-reader users land there.
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    document.getElementById(target)?.focus();
  }, [stage]);

  const reached = (part: Stage) => STAGES.indexOf(stage) >= STAGES.indexOf(part);

  function advance() {
    const next: Stage = stage === "read" && hasConsider ? "consider" : "ponder";
    pendingFocus.current = next === "consider" ? considerId : ponderId;
    setStage(next);
  }

  const supporting = [...new Set(session.insights.flatMap((insight) => insight.sourceIds))]
    .filter((sourceId) => sourceId !== session.sourceId)
    .map((sourceId) => sources[sourceId])
    .filter((s): s is Source => !!s);

  return (
    <article aria-labelledby={titleId} className="mt-12 sm:mt-14">
      <header className="text-center">
        <p className="text-xs font-medium tracking-[0.2em] text-sacred-accent uppercase">{CONNECT_FORMAT_LABELS[session.format]}</p>
        <h2
          id={titleId}
          tabIndex={-1}
          className="mt-3 rounded-lg font-serif text-[1.75rem] leading-tight font-medium text-balance outline-none sm:text-[2rem]"
        >
          {session.title}
        </h2>
      </header>

      <p className="mt-6 font-serif text-[1.0625rem] leading-relaxed text-pretty text-sacred-muted">{session.intro}</p>

      {session.question && (
        <div className="mt-8 border-l-2 border-sacred-accent/60 pl-4">
          <p className="text-xs font-medium tracking-[0.14em] text-sacred-accent uppercase">The question</p>
          <p className="mt-1.5 font-serif text-xl leading-snug text-pretty text-sacred-fg">{session.question}</p>
        </div>
      )}

      {source && <Scripture source={source} />}

      {stage === "read" && <ContinueButton onClick={advance} />}

      {reached("consider") && hasConsider && (
        <section aria-labelledby={considerId} className="motion-reveal">
          <Rest />
          <div className="flex flex-col items-center gap-2 text-center">
            <h3 id={considerId} tabIndex={-1} className="rounded-lg font-serif text-xl font-medium outline-none">
              {session.format === "understand" ? "What the sources show" : "Details worth noticing"}
            </h3>
            <ProvenanceLabel provenance="suggested" />
          </div>

          {session.notice.length > 0 && (
            <ul className="mt-6 flex flex-col gap-4">
              {session.notice.map((detail) => (
                <li key={detail} className="flex gap-3 font-serif text-[1.0625rem] leading-relaxed text-pretty">
                  <span aria-hidden className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-sacred-accent" />
                  {detail}
                </li>
              ))}
            </ul>
          )}

          {session.insights.length > 0 && (
            <ul className="mt-6 flex flex-col gap-6">
              {session.insights.map((insight) => (
                <li key={insight.text} className="border-l-2 border-sacred-line pl-4">
                  <p className="font-serif text-[1.0625rem] leading-relaxed text-pretty">{insight.text}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-sacred-muted">
                    <span>From</span>
                    {insight.sourceIds.map((sourceId) => {
                      const cited = sources[sourceId];
                      return cited ? (
                        <SourceLink key={sourceId} source={cited} className="text-xs">
                          {cited.label}
                        </SourceLink>
                      ) : null;
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {supporting.length > 0 && (
            <Disclosure
              variant="plain"
              summary={supporting.length === 1 ? `Read ${supporting[0].label}` : "Read the other sources"}
              className="mt-6"
            >
              <div className="flex flex-col gap-3">
                {supporting.map((s) => (
                  <SourceCard key={s.id} source={s} headingLevel="h4" />
                ))}
              </div>
            </Disclosure>
          )}

          {stage === "consider" && <ContinueButton onClick={advance} />}
        </section>
      )}

      {reached("ponder") && (
        <div className="motion-reveal">
          <Rest />
          <section aria-labelledby={ponderId}>
            <div className="text-center">
              <h3 id={ponderId} tabIndex={-1} className="rounded-lg font-serif text-xl font-medium outline-none">
                Ponder
              </h3>
              <p className="mt-2 text-sm text-pretty text-sacred-muted">Stay with whichever question helps. There’s nothing to answer.</p>
            </div>
            <ul className="mt-6 flex flex-col gap-5">
              {session.ponder.map((question) => (
                <li key={question} className="text-center font-serif text-lg leading-relaxed text-pretty italic">
                  {question}
                </li>
              ))}
            </ul>
          </section>

          <div className="mt-12">
            <TakeAMoment />
          </div>

          {session.prayer && (
            <>
              <Rest />
              <section aria-labelledby={`${id}-prayer`} className="text-center">
                <h3 id={`${id}-prayer`} className="font-serif text-xl font-medium">
                  If you’d like to pray
                </h3>
                <p className="mt-4 font-serif text-lg leading-relaxed text-pretty">{session.prayer}</p>
              </section>
            </>
          )}

          <Rest />
          <section aria-label="Your note and Notebook" className="flex flex-col gap-8">
            {noteRead ? (
              <PrivateNote sessionId={session.id} value={note} onChange={setNote} />
            ) : (
              <div className="flex flex-col items-start gap-2">
                <p className="text-sm text-sacred-muted">Your private note can’t be opened right now. {noteUnavailable}</p>
                {onRetryNote && (
                  <Button variant="secondary" size="sm" onClick={onRetryNote}>
                    Try again
                  </Button>
                )}
              </div>
            )}
            {source && (
              <SaveToNotebook
                session={session}
                source={source}
                note={note}
                savedCard={savedCard}
                ready={cardsReady}
                unavailable={cardsUnavailable}
              />
            )}
          </section>

          <Rest />
          <footer className="text-center">
            <p className="font-serif text-lg text-pretty text-sacred-muted">Carry these verses with you today.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/" variant="secondary" size="lg">
                Close<span className="sr-only"> and return Home</span>
              </ButtonLink>
              {onShowAnother && (
                <Button variant="ghost" size="lg" onClick={onShowAnother}>
                  <Shuffle aria-hidden />
                  Show me a different one
                </Button>
              )}
            </div>
          </footer>
        </div>
      )}
    </article>
  );
}

function Scripture({ source }: { source: Source }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="mt-8 rounded-2xl border border-sacred-line px-5 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={headingId} className="font-serif text-lg font-semibold">
          {source.label}
        </h3>
        <SourceKindBadge kind={source.kind} />
      </div>
      <VerseText source={source} className="mt-4 gap-3! text-[1.0625rem]! leading-[1.85]! text-sacred-fg! sm:text-lg!" />
      <SourceLink source={source} className="mt-4" />
    </section>
  );
}

function ContinueButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="mt-10 flex justify-center">
      <Button variant="soft" size="lg" onClick={onClick}>
        Continue
        <ArrowDown aria-hidden />
      </Button>
    </div>
  );
}
