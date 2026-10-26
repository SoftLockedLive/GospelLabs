/**
 * The boundary for optional study help. Screens ask a StudyAssistant for help
 * and show whatever comes back with its provenance label; they never know or
 * care whether a person curated it or a model generated it.
 *
 * Gospel Labs ships only the local assistant (./local.ts), built entirely
 * from curated content. See README.md for the rules any future provider must follow.
 */
import type { Activity, Source, StudyInvestigation } from "@/domain/study/content-schema";

/** Who produced the help: curated Gospel Labs content ("suggested") or an AI model ("ai"). */
export type AssistProvenance = "suggested" | "ai";

export interface AssistResponse {
  provenance: AssistProvenance;
  /** Plain text. Never HTML, never stored in curated content. */
  text: string;
  /** Short items to list beneath the text (e.g. follow-up questions). */
  items?: string[];
  /** Sources the help points to, by id. */
  sourceIds?: string[];
  /** For moreHelp: whether this is one of the activity's own hints (which the host counts as shown). */
  hintIndex?: number;
}

/** What an assistant may know about the activity's progress (ActivityState, without the answer). */
export interface AssistActivityState {
  attempts: number;
  hintsShown: number;
}

export interface AssistContext {
  /** Sources available on this screen, by id. */
  sources?: Readonly<Record<string, Source>>;
}

export interface FollowUpContext {
  /** Branch ids already explored, so they aren't suggested again. */
  visitedBranches?: readonly string[];
}

export interface StudyAssistant {
  /** "local" for curated content only; "ai" for a model-backed provider. */
  readonly kind: "local" | "ai";
  /** What a term means, or null if the assistant doesn't know it. */
  explainTerm(term: string, context?: AssistContext): Promise<AssistResponse | null>;
  /** The next unused hint, or else where to look again. Never the answer. */
  moreHelp(activity: Activity, state: AssistActivityState, context?: AssistContext): Promise<AssistResponse>;
  /** Questions worth carrying forward from an investigation. */
  followUpQuestions(investigation: StudyInvestigation, context?: FollowUpContext): Promise<AssistResponse>;
}
