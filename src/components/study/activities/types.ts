/**
 * The contract between activity components and the screens that host them
 * (investigation player, Character of Christ, Scripture Explorer). Hosts
 * resolve sources from content and pass them in; activities never import
 * content or storage themselves, so they stay reusable and testable.
 */
import type { Activity, Source } from "@/domain/study/content-schema";
import type { Difficulty } from "@/domain/study/vocabulary";
import type { AssistResponse } from "@/lib/assist/types";

/** Saved state of an activity in progress, restored when the learner returns. */
export interface ActivityState {
  /** Checked attempts so far. */
  attempts: number;
  /** Hints shown so far. */
  hintsShown: number;
  /** The learner's current answer, in the activity's own format (JSON-serializable). */
  response?: unknown;
  /** The learner chose to see the answer. */
  revealed: boolean;
  /** Finished: answered correctly, revealed, or (for reflections) continued. */
  completed: boolean;
  /** Optional reflection text (reflect activities). */
  reflection?: string;
}

export const INITIAL_ACTIVITY_STATE: ActivityState = { attempts: 0, hintsShown: 0, revealed: false, completed: false };

/** How an activity ended. */
export interface ActivityResult {
  /** True only when the learner worked out the answer themselves (not revealed, not skipped). */
  demonstrated: boolean;
  revealed: boolean;
  skipped: boolean;
  attempts: number;
  hintsShown: number;
  response?: unknown;
  reflection?: string;
}

export interface ActivityRendererProps {
  activity: Activity;
  /** Every source the activity may cite, keyed by id (use activitySourceIds() to collect them). */
  sources: Readonly<Record<string, Source>>;
  /** The difficulty being worked, for labels only; content already differs by difficulty. */
  difficulty?: Difficulty;
  /** Restores a previous state (e.g. from StudyProgress). */
  initialState?: Partial<ActivityState>;
  /** Called whenever the state changes in a way worth saving (attempt, hint, reveal, answer change). */
  onStateChange?: (state: ActivityState) => void;
  /** Called once when the activity is finished. */
  onComplete: (result: ActivityResult) => void;
  /** Lets the learner move on without finishing; never blocks progress. Hidden when absent. */
  allowSkip?: boolean;
  /** Visually compact layout for embedding (e.g. inside an attribute page). */
  compact?: boolean;
  /**
   * Help once the activity's own hints have run out (a StudyAssistant's
   * moreHelp). Defaults to curated "where to look again" guidance.
   */
  moreHelp?: (activity: Activity, state: ActivityState) => Promise<AssistResponse>;
  /** Reflections: show the optional text box (default true). When false, the prompt is offered to ponder. */
  reflectionInput?: boolean;
  /**
   * The host keeps the evidence in view itself (a study step's evidence dock and column, which stay on screen
   * while the learner answers), so the activity doesn't show it again. Use activityEvidence() for the list.
   */
  evidenceElsewhere?: boolean;
}
