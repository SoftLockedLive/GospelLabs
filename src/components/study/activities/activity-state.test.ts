import { describe, expect, it } from "vitest";
import { activitySchema, type ActivityOf } from "@/domain/study/content-schema";
import { applyCheck, applyHint, applyReveal, finishedAs, isStaleWrong, restoreActivityState, restoredCheck, resultOf } from "./activity-state";

const sort = activitySchema.parse({
  type: "sort",
  id: "s",
  prompt: "Sort",
  hints: ["One", "Two"],
  explanation: "Because.",
  categories: [
    { id: "a", label: "A" },
    { id: "b", label: "B" },
  ],
  items: [
    { id: "x", text: "X", category: "a", why: "." },
    { id: "y", text: "Y", category: "b", why: "." },
    { id: "z", text: "Z", category: "b", why: "." },
  ],
}) as ActivityOf<"sort">;

describe("activity state", () => {
  it("restores defaults and cleans the saved response", () => {
    const state = restoreActivityState(sort, { attempts: 2, response: { placements: { x: "a", gone: "b" } } });
    expect(state).toEqual({ attempts: 2, hintsShown: 0, revealed: false, completed: false, response: { placements: { x: "a" } } });
    expect(finishedAs(state)).toBeNull();
    expect(restoredCheck(sort, state)).toBeNull();
  });

  it("restores a revealed activity with the full answer and its marks", () => {
    const state = restoreActivityState(sort, { revealed: true, completed: true });
    expect(state.response).toEqual({ placements: { x: "a", y: "b", z: "b" } });
    expect(finishedAs(state)).toBe("revealed");
    expect(restoredCheck(sort, state)?.result.correct).toBe(true);
  });

  it("shows the answer for a finished activity whose answer wasn't kept", () => {
    const state = restoreActivityState(sort, { completed: true });
    expect(state.response).toEqual({ placements: { x: "a", y: "b", z: "b" } });
    expect(finishedAs(state)).toBe("solved");
    expect(restoredCheck(sort, state)?.result.correct).toBe(true);
  });

  it("counts checks and completes on a correct one", () => {
    const wrong = applyCheck(sort, restoreActivityState(sort, { response: { placements: { x: "b", y: "b", z: "b" } } }));
    expect(wrong.state).toMatchObject({ attempts: 1, completed: false });
    expect(isStaleWrong(wrong.checked, wrong.state.response)).toBe(true);
    expect(isStaleWrong(wrong.checked, { placements: { x: "a", y: "b", z: "b" } })).toBe(false);
    const right = applyCheck(sort, { ...wrong.state, response: { placements: { x: "a", y: "b", z: "b" } } });
    expect(right.state).toMatchObject({ attempts: 2, completed: true });
    expect(finishedAs(right.state)).toBe("solved");
    expect(resultOf(right.state)).toMatchObject({ demonstrated: true, revealed: false, skipped: false, attempts: 2 });
  });

  it("reveals the answer as not demonstrated", () => {
    const { state, checked } = applyReveal(sort, restoreActivityState(sort, { attempts: 3 }));
    expect(state).toMatchObject({ revealed: true, completed: true, response: { placements: { x: "a", y: "b", z: "b" } } });
    expect(checked.result.correct).toBe(true);
    expect(resultOf(state)).toMatchObject({ demonstrated: false, revealed: true });
  });

  it("never shows more hints than exist, and reports skips", () => {
    const state = restoreActivityState(sort, { hintsShown: 1 });
    expect(applyHint(state, 2).hintsShown).toBe(2);
    expect(applyHint({ ...state, hintsShown: 2 }, 2).hintsShown).toBe(2);
    expect(resultOf(state, { skipped: true })).toMatchObject({ skipped: true, demonstrated: false });
  });
});
