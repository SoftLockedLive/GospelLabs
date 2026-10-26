/**
 * The contract between the activity chrome (prompt, evidence, Check, hints)
 * and the body of each activity type, which renders its own inputs.
 */
import type { CheckResult, ItemMark } from "@/domain/study/activities";
import type { Source } from "@/domain/study/content-schema";
import type { FinishedAs } from "./activity-state";

export interface Checked<R> {
  response: R;
  result: CheckResult;
}

export interface BodyProps<A, R> {
  activity: A;
  sources: Readonly<Record<string, Source>>;
  response: R;
  onChange: (response: R) => void;
  /** The most recent check, if any. Marks show only for items unchanged since. */
  checked: Checked<R> | null;
  /** Finished: inputs are read-only and final marks show. */
  finished: FinishedAs;
  compact?: boolean;
}

/**
 * The mark an item shows: its final mark once finished; otherwise the last
 * check's mark, but only while the learner hasn't changed that item since.
 */
export function markFor<R>(
  props: Pick<BodyProps<unknown, R>, "checked" | "finished">,
  key: string,
  unchanged: (checkedResponse: R) => boolean,
): ItemMark | undefined {
  const { checked, finished } = props;
  if (!checked) return undefined;
  if (!finished && !unchanged(checked.response)) return undefined;
  return checked.result.marks[key];
}

/** Item feedback from the last check, while the item is unchanged and the activity unfinished. */
export function feedbackFor<R>(
  props: Pick<BodyProps<unknown, R>, "checked" | "finished">,
  key: string,
  unchanged: (checkedResponse: R) => boolean,
): string | undefined {
  const { checked, finished } = props;
  if (!checked || finished || !unchanged(checked.response)) return undefined;
  return checked.result.feedback.find((item) => item.itemId === key)?.message;
}
