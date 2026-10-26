"use client";

/**
 * The passage's activities. Each restores where the learner left off, and
 * completion is recorded in the Exploration. Nothing is scored.
 */
import { CircleCheck, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ActivityRenderer } from "@/components/study/activities/activity-renderer";
import type { ActivityResult, ActivityState } from "@/components/study/activities/types";
import { ACTIVITY_TYPE_LABELS, type ExplorerPassage, type Source } from "@/domain/study/content-schema";
import type { StoredActivityState } from "@/domain/study/explorer";

interface ActivitiesPanelProps {
  passage: ExplorerPassage;
  sources: Readonly<Record<string, Source>>;
  states: Readonly<Record<string, StoredActivityState>>;
  completed: readonly string[];
  onStateChange: (activityId: string, state: ActivityState) => void;
  onComplete: (activityId: string, result: ActivityResult) => void;
}

export function ActivitiesPanel({ passage, sources, states, completed, onStateChange, onComplete }: ActivitiesPanelProps) {
  if (!passage.activities.length) {
    return <p className="text-sm text-muted">This passage has no activities yet.</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-muted">
        Optional ways to look closer. Nothing is scored: work at your own pace, use hints, or show the answer whenever you like.
      </p>
      <ol className="flex flex-col gap-5">
        {passage.activities.map((activity, index) => {
          const state = states[activity.id];
          const done = completed.includes(activity.id);
          return (
            <li key={activity.id} className="rounded-xl border border-line bg-surface p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-fg">
                  <span className="mr-2 font-mono text-xs text-accent">{String(index + 1).padStart(2, "0")}</span>
                  {ACTIVITY_TYPE_LABELS[activity.type]}
                </h3>
                {done &&
                  (state?.revealed ? (
                    <Badge>
                      <Eye aria-hidden />
                      Answer shown
                    </Badge>
                  ) : (
                    <Badge tone="green" className="motion-success">
                      <CircleCheck aria-hidden />
                      Done
                    </Badge>
                  ))}
              </div>
              <ActivityRenderer
                activity={activity}
                sources={sources}
                initialState={state}
                onStateChange={(next) => onStateChange(activity.id, next)}
                onComplete={(result) => onComplete(activity.id, result)}
                compact
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
