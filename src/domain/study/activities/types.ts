/**
 * Shared types for answer checking. Every checked activity has its own
 * JSON-serializable response format (stored in StepState.response, so an
 * activity reopens as the learner left it) and a pure check that says which
 * parts fit the evidence and points back to that evidence without ever
 * revealing the answer.
 */
import type { Activity, ActivityType } from "../content-schema";
import type { Verdict } from "../vocabulary";

export type ItemMark = "correct" | "incorrect";

export interface ItemFeedback {
  /** The item this is about, using the activity's mark keys; absent for feedback on the whole activity. */
  itemId?: string;
  message: string;
}

export interface CheckResult {
  /** True when the whole response fits the evidence. */
  correct: boolean;
  /**
   * Marks for the parts the learner answered, by item key (see each response
   * type for its keys). Parts left unanswered, or that can't be judged
   * without giving the answer away, have no mark.
   */
  marks: Record<string, ItemMark>;
  /** Feedback that points back to the evidence. Never names the right answer. */
  feedback: ItemFeedback[];
  /** One calm sentence about the attempt, for the live region. */
  summary: string;
  /** Activities with several answers to find: how many are still missing (never which). */
  remaining?: number;
}

/** Evidence Connections. Marks are keyed by left item id. */
export interface EvidenceConnectResponse {
  /** Left item id → the right item id it is connected to. */
  pairs: Record<string, string>;
}

/** Clue Investigation. Marks are keyed by option id. */
export interface ClueResponse {
  /** Clue ids the learner has examined, in the order they opened them. */
  examined: string[];
  /** Selected option ids. */
  answer: string[];
}

/** Build the Principle. Marks are keyed by fragment id. */
export interface BuildPrincipleResponse {
  /** Fragment ids in the order the learner arranged them. */
  order: string[];
}

/** Compare Perspectives. Marks are keyed by perspective id. */
export interface CompareResponse {
  verdicts: Record<string, Verdict>;
}

/** Scripture Connections. Marks are keyed by question id, and by "questionId/optionId" for chosen options. */
export interface ScriptureConnectResponse {
  /** Question id → selected option ids. */
  answers: Record<string, string[]>;
}

/**
 * Vocabulary Matching. Meanings are identified by the id of the pair they
 * belong to, or "extra-<index>" for an extra meaning; examples by their pair id.
 * Marks are keyed "pairId:meaning", "pairId:example", and "pairId" (the term as a whole).
 */
export interface VocabMatchResponse {
  meanings: Record<string, string>;
  examples: Record<string, string>;
}

/** Sort. Marks are keyed by item id. */
export interface SortResponse {
  /** Item id → category id. */
  placements: Record<string, string>;
}

/** Highlight. Marks are keyed by chunk index (as a string). */
export interface HighlightResponse {
  /** Indices of the selected chunks, in ascending order. */
  selected: number[];
}

/** Reflections keep their text in the activity state's `reflection`, not in a response. */
export type ReflectResponse = Record<string, never>;

export interface ResponseMap {
  "evidence-connect": EvidenceConnectResponse;
  clue: ClueResponse;
  "build-principle": BuildPrincipleResponse;
  compare: CompareResponse;
  "scripture-connect": ScriptureConnectResponse;
  "vocab-match": VocabMatchResponse;
  sort: SortResponse;
  highlight: HighlightResponse;
  reflect: ReflectResponse;
}

export type ResponseFor<T extends ActivityType> = ResponseMap[T];
export type ActivityResponse = ResponseMap[ActivityType];

/** The pure operations every activity type provides. */
export interface ActivityChecker<A extends Activity, R> {
  /** An answer with nothing chosen yet. */
  empty: (activity: A) => R;
  /**
   * Reads a stored response defensively: anything malformed, or referring to
   * ids the activity no longer has (content can change), is dropped.
   */
  parse: (activity: A, value: unknown) => R;
  /** All required inputs are given, so "Check" can be enabled. Says nothing about correctness. */
  isComplete: (activity: A, response: R) => boolean;
  check: (activity: A, response: R) => CheckResult;
  /** The correct response, for "Show me". */
  reveal: (activity: A) => R;
}
