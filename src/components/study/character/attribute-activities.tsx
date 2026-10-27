"use client";

/**
 * The attribute's activities, run by the shared ActivityRenderer. Finishing
 * one records it in the Exploration and adds it to the attribute's Discovery
 * Card. Nothing is scored: the learner can always reveal the answer and move on.
 */
import { BookmarkCheck, CheckCircle2, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ActivityRenderer } from "@/components/study/activities/activity-renderer";
import type { ActivityResult } from "@/components/study/activities/types";
import { Button } from "@/components/ui/button";
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { ACTIVITY_TYPE_LABELS, type Activity } from "@/domain/study/content-schema";
import { notebookHref } from "@/lib/routes";
import { StudySection } from "./attribute-sections";
import { useAttributeStudy } from "./attribute-study-context";

type SessionStatus = { kind: "working" } | { kind: "finished"; demonstrated: boolean; cardId?: string };

export function ActivitiesSection() {
  const { attribute, exploration } = useAttributeStudy();
  const completed = new Set(exploration.status === "ready" ? (exploration.value?.completedActivities ?? []) : []);
  // One activity at a time keeps the page short; open on the first one not yet finished.
  const [chosen, setChosen] = useState<string | null>(null);
  const firstOpen = attribute.activities.find((activity) => !completed.has(activity.id)) ?? attribute.activities[0];
  const current = chosen ?? firstOpen?.id ?? "";
  return (
    <StudySection
      id="activities"
      title="Look closer"
      description="Each activity asks you to read the sources carefully. There’s no score, and you can always see the answer and continue."
    >
      {exploration.status === "loading" ? (
        <LoadingRegion label="Loading activities" className="flex flex-col gap-5">
          <Skeleton className="h-11 w-full max-w-md rounded-lg" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </LoadingRegion>
      ) : (
        <Tabs
          label={`${attribute.name} activities`}
          value={current}
          onChange={setChosen}
          items={attribute.activities.map((activity, index) => ({
            value: activity.id,
            label: (
              <>
                {completed.has(activity.id) && <CheckCircle2 aria-hidden className="size-4 text-green" />}
                {ACTIVITY_TYPE_LABELS[activity.type]}
                {completed.has(activity.id) && <span className="sr-only"> (completed)</span>}
              </>
            ),
            panel: <ActivityPanel activity={activity} number={index + 1} doneBefore={completed.has(activity.id)} />,
          }))}
        />
      )}
    </StudySection>
  );
}

function ActivityPanel({ activity, number, doneBefore }: { activity: Activity; number: number; doneBefore: boolean }) {
  const { sources, completeActivity } = useAttributeStudy();
  const [status, setStatus] = useState<SessionStatus | null>(null);
  // A new attempt remounts the renderer with a fresh state.
  const [attempt, setAttempt] = useState(0);

  // Once started (or if never finished before) the renderer stays mounted, so its explanation remains visible.
  const active = status !== null || !doneBefore;

  async function handleComplete(result: ActivityResult) {
    setStatus({ kind: "finished", demonstrated: result.demonstrated });
    const card = await completeActivity(activity.id, result);
    setStatus({ kind: "finished", demonstrated: result.demonstrated, cardId: card?.id });
  }

  function restart() {
    setAttempt((value) => value + 1);
    setStatus({ kind: "working" });
  }

  return (
    <article aria-label={`Activity ${number}: ${ACTIVITY_TYPE_LABELS[activity.type]}`} className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
      {(doneBefore || status?.kind === "finished") && (
        <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-green">
          <CheckCircle2 aria-hidden className="size-3.5" />
          {status?.kind === "finished" ? "Completed" : "Completed before"}
        </p>
      )}

      {active ? (
        // The renderer shows the activity type and its prompt as the heading.
        <ActivityRenderer key={attempt} activity={activity} sources={sources} compact onComplete={(result) => void handleComplete(result)} />
      ) : (
        <div className="flex flex-col items-start gap-3">
          <div>
            <p className="font-mono text-[11px] tracking-[0.14em] text-accent uppercase">{ACTIVITY_TYPE_LABELS[activity.type]}</p>
            <h3 className="mt-2 text-base leading-relaxed font-medium text-fg">{activity.prompt}</h3>
          </div>
          <p className="text-sm leading-relaxed text-muted">You’ve completed this activity before. You’re welcome to work through it again.</p>
          <Button variant="secondary" onClick={restart}>
            <RotateCcw aria-hidden />
            Do it again
          </Button>
        </div>
      )}
      {status?.kind === "finished" && <FinishedNote status={status} onAgain={restart} />}
    </article>
  );
}

function FinishedNote({ status, onAgain }: { status: Extract<SessionStatus, { kind: "finished" }>; onAgain: () => void }) {
  return (
    <div className="mt-4 flex flex-col items-start gap-3 border-t border-line pt-4">
      <p role="status" className="motion-success inline-flex items-start gap-2 rounded-lg bg-green-soft px-3 py-2 text-sm text-fg">
        <BookmarkCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-green" />
        <span>
          {status.cardId ? (
            <>
              Added to{" "}
              <Link href={notebookHref(status.cardId)} className="font-medium text-accent underline-offset-2 hover:underline">
                your Notebook card
              </Link>
              {status.demonstrated ? ", including what you worked out." : "."}
            </>
          ) : (
            "Completed."
          )}
        </span>
      </p>
      <Button variant="ghost" onClick={onAgain}>
        <RotateCcw aria-hidden />
        Do it again
      </Button>
    </div>
  );
}
