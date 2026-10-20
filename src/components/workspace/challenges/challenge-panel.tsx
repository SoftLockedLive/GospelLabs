"use client";

import { Compass, Lightbulb, Shuffle } from "lucide-react";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import type { ChallengeResponse, ChallengeSnapshot, Investigation } from "@/domain/investigation";
import { findChallengeResponse } from "@/domain/investigation-reducer";
import {
  CHALLENGE_TYPE_INFO,
  CHALLENGE_TYPES,
  chooseChallenge,
  seededFraction,
  type ChallengeType,
} from "@/domain/research-challenges";
import { getResearchChallenge, RESEARCH_CHALLENGES } from "@/lib/research-challenges";
import type { InvestigationActions } from "../use-investigation";
import { CHALLENGE_ICONS } from "./challenge-icons";
import { ChallengeResponseList } from "./challenge-response-list";
import { ChallengeTypeFilter } from "./challenge-type-filter";

const PLACEHOLDERS: Record<ChallengeType, string> = {
  observe: "What I noticed…",
  connect: "How these relate…",
  compare: "What's alike, and what's different…",
  question: "My new question…",
  apply: "A principle I could act on…",
};

interface PanelView {
  /** Limit "Another challenge" to one type, or null for any. */
  type: ChallengeType | null;
  challengeId?: string;
}

/**
 * The last view of each investigation's panel during this visit, so leaving
 * Research and coming back shows the same challenge instead of a new one.
 */
const lastViews = new Map<string, PanelView>();

interface ShownChallenge extends ChallengeSnapshot {
  tip?: string;
}

/** A challenge as it should be shown: once answered, with the wording the response was written for. */
function describeChallenge(investigation: Investigation, challengeId: string | undefined): ShownChallenge | undefined {
  if (!challengeId) return undefined;
  const definition = getResearchChallenge(challengeId);
  const response = findChallengeResponse(investigation, challengeId);
  if (response) {
    const { type, title, prompt } = response;
    return { challengeId, type, title, prompt, tip: definition?.prompt === prompt ? definition.tip : undefined };
  }
  if (!definition) return undefined;
  const { id, type, title, prompt, tip } = definition;
  return { challengeId: id, type, title, prompt, tip };
}

interface ChallengePanelProps {
  investigation: Investigation;
  actions: InvestigationActions;
}

/**
 * Optional research challenges: one at a time, with a response box that
 * saves into the investigation like every other field. Responses are never
 * graded, and nothing else in the investigation depends on them.
 */
export function ChallengePanel({ investigation, actions }: ChallengePanelProps) {
  const responses = investigation.challengeResponses;
  const answered = new Set(responses.map((response) => response.challengeId));
  const [view, setViewState] = useState<PanelView>(
    () =>
      lastViews.get(investigation.id) ?? {
        type: null,
        // The same investigation opens on the same challenge until it's answered.
        challengeId: chooseChallenge(RESEARCH_CHALLENGES, {
          type: null,
          answered,
          random: () => seededFraction(investigation.id),
        })?.id,
      },
  );
  const responseRef = useRef<HTMLTextAreaElement>(null);

  const setView = (next: PanelView) => {
    lastViews.set(investigation.id, next);
    setViewState(next);
  };

  const shown = describeChallenge(investigation, view.challengeId);
  const response = shown ? findChallengeResponse(investigation, shown.challengeId) : undefined;
  const canShowAnother = RESEARCH_CHALLENGES.some(
    (challenge) => challenge.id !== view.challengeId && (view.type === null || challenge.type === view.type),
  );
  const counts = Object.fromEntries(
    CHALLENGE_TYPES.map((type) => [type, responses.filter((item) => item.type === type).length]),
  ) as Record<ChallengeType, number>;

  const showAnother = () => {
    const next = chooseChallenge(RESEARCH_CHALLENGES, { type: view.type, answered, currentId: view.challengeId });
    if (next) setView({ ...view, challengeId: next.id });
  };

  const selectType = (type: ChallengeType | null) => {
    if (type === null || shown?.type === type) return setView({ ...view, type });
    const next = chooseChallenge(RESEARCH_CHALLENGES, { type, answered, currentId: view.challengeId });
    setView({ type, challengeId: next?.id ?? view.challengeId });
  };

  const edit = (item: ChallengeResponse) => {
    flushSync(() => setView({ type: null, challengeId: item.challengeId }));
    responseRef.current?.focus();
  };

  if (!shown && responses.length === 0) return null;

  return (
    <section
      aria-labelledby="research-challenge-heading"
      className="flex min-w-0 flex-col gap-4 rounded-xl border border-accent/25 bg-linear-to-b from-accent-soft to-transparent p-4 sm:p-5"
    >
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3
            id="research-challenge-heading"
            className="flex items-center gap-2 text-xs font-semibold tracking-wide text-fg uppercase"
          >
            <Compass aria-hidden className="size-4 text-accent" />
            Research challenge
          </h3>
          {responses.length > 0 && (
            <p className="text-xs text-subtle">
              {responses.length} {responses.length === 1 ? "response" : "responses"} so far
            </p>
          )}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-subtle">
          Optional ways to look closer at your question. Take one, skip it, or try another. Nothing here is graded.
        </p>
      </div>

      <ChallengeTypeFilter value={view.type} counts={counts} onChange={selectType} />

      {shown && (
        <div className="rounded-lg border border-line bg-surface p-4 sm:p-5">
          {/* The region stays mounted so screen readers announce each new challenge. */}
          <div aria-live="polite" aria-atomic="true">
            <ChallengeText key={shown.challengeId} challenge={shown} />
          </div>

          <Field
            className="mt-5"
            label="Your response"
            hint="Saved with this investigation as you type. Your words are your own; they're never graded."
          >
            {(props) => (
              <Textarea
                {...props}
                ref={responseRef}
                rows={3}
                className="scroll-mt-40"
                placeholder={PLACEHOLDERS[shown.type]}
                value={response?.response ?? ""}
                onChange={(event) => {
                  const { challengeId, type, title, prompt } = shown;
                  actions.respondToChallenge({ challengeId, type, title, prompt }, event.target.value);
                }}
              />
            )}
          </Field>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm" onClick={showAnother} disabled={!canShowAnother}>
              <Shuffle aria-hidden />
              Another challenge
            </Button>
          </div>
        </div>
      )}

      {responses.length > 0 && (
        <ChallengeResponseList
          responses={responses}
          activeChallengeId={shown?.challengeId}
          onEdit={edit}
          onRemove={actions.removeChallengeResponse}
        />
      )}
    </section>
  );
}

function ChallengeText({ challenge }: { challenge: ShownChallenge }) {
  const Icon = CHALLENGE_ICONS[challenge.type];
  return (
    <div className="transition-opacity duration-300 starting:opacity-0">
      <p className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.14em] text-accent uppercase">
        <Icon aria-hidden className="size-3.5" />
        {CHALLENGE_TYPE_INFO[challenge.type].label}
      </p>
      <h4 className="mt-2 text-lg font-semibold tracking-tight text-fg">{challenge.title}</h4>
      <p className="mt-1.5 leading-relaxed text-fg">{challenge.prompt}</p>
      {challenge.tip && (
        <p className="mt-3 flex gap-2 text-sm leading-relaxed text-muted">
          <Lightbulb aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
          {challenge.tip}
        </p>
      )}
    </div>
  );
}
