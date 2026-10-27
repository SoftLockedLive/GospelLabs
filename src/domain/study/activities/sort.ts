/**
 * Sort: place each item in a category. A misplaced item is asked about the
 * category it was put in, never told where it belongs; each item's `why` is
 * shown once the activity is finished.
 */
import type { ActivityOf } from "../content-schema";
import { field, idSet, stillNeedAnotherLook, stringRecord } from "./parse";
import { seededShuffle } from "./shuffle";
import type { ActivityChecker, CheckResult, ItemFeedback, ItemMark, SortResponse } from "./types";

type Sort = ActivityOf<"sort">;

/** Items in a stable shuffled order (authors often group them by category). */
export const sortItems = (activity: Sort) => seededShuffle(activity.items, `${activity.id}:items`);

export const placeItem = (response: SortResponse, itemId: string, categoryId: string): SortResponse => ({
  placements: { ...response.placements, [itemId]: categoryId },
});

export const sort: ActivityChecker<Sort, SortResponse> = {
  empty: () => ({ placements: {} }),

  parse: (activity, value) => ({ placements: stringRecord(field(value, "placements"), idSet(activity.items), idSet(activity.categories)) }),

  isComplete: (activity, response) => activity.items.every((item) => !!response.placements[item.id]),

  check(activity, response): CheckResult {
    const marks: Record<string, ItemMark> = {};
    const feedback: ItemFeedback[] = [];
    let right = 0;
    for (const item of activity.items) {
      const chosen = response.placements[item.id];
      if (!chosen) continue;
      if (chosen === item.category) {
        right++;
        marks[item.id] = "correct";
      } else {
        marks[item.id] = "incorrect";
        const label = activity.categories.find((category) => category.id === chosen)?.label ?? "that group";
        feedback.push({ itemId: item.id, message: `Look again at this one. Does the evidence put it under ‘${label}’?` });
      }
    }
    const total = activity.items.length;
    const correct = right === total;
    return {
      correct,
      marks,
      feedback,
      summary: correct
        ? "Everything is sorted the way the evidence shows."
        : stillNeedAnotherLook(total - right, "of these", "of these"),
    };
  },

  reveal: (activity) => ({ placements: Object.fromEntries(activity.items.map((item) => [item.id, item.category])) }),
};
