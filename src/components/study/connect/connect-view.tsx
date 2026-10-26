"use client";

import { Shuffle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { findConnectCard } from "@/domain/study/cards/connect";
import { formatForDay } from "@/domain/study/connect";
import { differentSession, hasAnotherSession, lastOpenedBySession, sessionForToday } from "@/domain/study/connect-helpers";
import { CONNECT_FORMATS, type ConnectFormat, type ConnectSession, type Source } from "@/domain/study/content-schema";
import { connectHref } from "@/lib/routes";
import { useDiscoveryCards, useExplorations } from "@/persistence/study-hooks";
import { ConnectFrame, ConnectHeader, ConnectLoading } from "./connect-layout";
import { ConnectSessionView } from "./connect-session";
import { recordSessionOpened } from "./connect-storage";
import { FormatPicker } from "./format-picker";

interface ConnectViewProps {
  sessions: ConnectSession[];
  /** Every source the sessions cite, by id. */
  sources: Record<string, Source>;
}

/**
 * Connect with Christ, Five-Minute Mode. Opens on today's format and the
 * session opened least recently in it (or ?session=<id>); the learner can
 * choose any format or ask for a different session. The only thing recorded
 * is that a session was opened, so the rotation can offer something fresh.
 */
export function ConnectView({ sessions, sources }: ConnectViewProps) {
  const requestedId = useSearchParams().get("session");
  const explorations = useExplorations("connect");
  const cards = useDiscoveryCards();
  // Fixed when the page opens, so the session never changes under someone reading past midnight.
  const [date] = useState(() => new Date());
  const [chosen, setChosen] = useState<{ id: string; focus: boolean } | null>(null);
  // The session the rotation first offered stays until the learner chooses another, even if what was opened
  // before only becomes known later (after a failed read is retried).
  const [shownId, setShownId] = useState<string | null>(null);

  // Until we know what was opened recently, show a placeholder rather than a session that might switch.
  const loaded = explorations.status !== "loading";
  const records = explorations.status === "ready" ? explorations.value : undefined;
  const lastOpened = useMemo(() => lastOpenedBySession(records ?? []), [records]);

  let session: ConnectSession | undefined;
  let offered = false;
  if (loaded) {
    const requested = sessions.find((s) => s.id === requestedId);
    const shown = sessions.find((s) => s.id === shownId);
    offered = !chosen && !requested && !shown;
    session = chosen
      ? sessions.find((s) => s.id === chosen.id)
      : (requested ?? shown ?? sessionForToday(sessions, { date, lastOpened }) ?? sessions[0]);
  }
  if (session && offered) setShownId(session.id);

  const sessionId = session?.id;
  useEffect(() => {
    if (!sessionId) return;
    recordSessionOpened(sessionId).catch(() => {
      // Without storage the rotation still works by day; it just can't remember what was opened.
    });
  }, [sessionId]);

  const available = CONNECT_FORMATS.filter((format) => sessions.some((s) => s.format === format));

  function choose(next: ConnectSession | undefined, focus: boolean) {
    if (!next) return;
    setChosen({ id: next.id, focus });
    // A ?session= link has done its job; don't reopen it on reload.
    if (requestedId) window.history.replaceState(null, "", connectHref());
  }

  function chooseFormat(format: ConnectFormat) {
    if (format === session?.format) return;
    choose(sessionForToday(sessions, { date, format, lastOpened }), false);
  }

  function showDifferent(focus: boolean) {
    if (session) choose(differentSession(sessions, { date, current: session, lastOpened }), focus);
  }

  const note = (session && records?.find((record) => record.contentId === session.id)?.note) ?? "";
  const savedCard = session && cards.status === "ready" ? findConnectCard(cards.value.records, session.id) : undefined;
  const another = !!session && hasAnotherSession(sessions, session);

  return (
    <ConnectFrame>
      <ConnectHeader />
      {!loaded ? (
        <ConnectLoading />
      ) : !session ? (
        <p className="mt-12 text-center font-serif text-lg text-sacred-muted">Sessions are being prepared. Please check back soon.</p>
      ) : (
        <>
          <FormatPicker value={session.format} today={formatForDay(date)} onChange={chooseFormat} available={available} />
          {another && (
            <div className="mt-3 flex justify-center">
              <Button variant="ghost" onClick={() => showDifferent(false)}>
                <Shuffle aria-hidden />
                Show me a different one
              </Button>
            </div>
          )}
          <p aria-live="polite" className="sr-only">
            {chosen ? `Now showing ${session.title}.` : ""}
          </p>
          <ConnectSessionView
            key={session.id}
            session={session}
            sources={sources}
            initialNote={note}
            noteUnavailable={explorations.status === "error" ? explorations.error.message : undefined}
            onRetryNote={explorations.retry}
            savedCard={savedCard}
            cardsReady={cards.status === "ready"}
            cardsUnavailable={cards.status === "error" ? cards.error.message : undefined}
            onShowAnother={another ? () => showDifferent(true) : undefined}
            focusOnShow={chosen?.focus ?? false}
          />
        </>
      )}
    </ConnectFrame>
  );
}
