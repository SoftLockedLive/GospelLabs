import { describe, expect, it } from "vitest";
import { buildContentRegistry } from "../content-registry";
import { activitySchema, investigationSchema, type StudyInvestigation } from "../content-schema";
import { SAMPLE_CONTENT, SAMPLE_INVESTIGATION } from "../test-fixtures";
import { studyProgressSchema, type StepState, type StudyProgress } from "../user-data";
import { bundleInvestigation, conceptRef, labelsLookup } from "./bundle";
import { recommendDifficulty } from "./difficulty";
import { ATTEMPTS_BEFORE_REVEAL, evidencePointer, helpOptions, listOf } from "./hints";
import { activityAt, branchesOffered, mainPath } from "./path";
import { isFromNewerContent, keepCompletionFromElsewhere, reconcileContentVersion, startProgress, studyReducer, type StudyAction } from "./progress";
import { canOpenStep, completionState, stepStatus } from "./status";

const T0 = "2026-10-26T10:00:00.000Z";
const T1 = "2026-10-26T10:05:00.000Z";
const T2 = "2026-10-26T10:10:00.000Z";

/** The sample investigation plus a deep step between "connect" and "reflect". */
function investigation(change?: (raw: typeof SAMPLE_INVESTIGATION & Record<string, unknown>) => void): StudyInvestigation {
  const raw = structuredClone(SAMPLE_INVESTIGATION) as typeof SAMPLE_INVESTIGATION & Record<string, unknown>;
  const deep = {
    id: "go-deeper",
    title: "Go deeper",
    phase: "understand",
    depth: "deep",
    activity: { type: "reflect", id: "reflect-deeper", prompt: "What else do you notice?" },
    insight: "Deeper reading.",
  };
  (raw.steps as unknown[]).splice(2, 0, deep);
  change?.(raw);
  return investigationSchema.parse(raw);
}

const INV = investigation();

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

type ActionInput = StudyAction extends infer A ? (A extends StudyAction ? Omit<A, "now"> & { now?: string } : never) : never;

function apply(progress: StudyProgress, ...actions: ActionInput[]): StudyProgress {
  return actions.reduce((state, action) => studyReducer(INV, deepFreeze(state), { now: T1, ...action } as StudyAction), progress);
}

const start = (difficulty: StudyProgress["difficulty"] = "medium", length: StudyProgress["length"] = "quick") =>
  startProgress(INV, { difficulty, length, now: T0 });

const NOTICE = { stepId: "notice" };
const CONNECT = { stepId: "connect" };
const DEEPER = { stepId: "go-deeper" };
const REFLECT = { stepId: "reflect" };
const FRIENDS = { stepId: "friends-step", branchId: "friends" };

describe("starting", () => {
  it("starts at the first step, recorded as started at the chosen level", () => {
    const progress = start();
    expect(progress).toMatchObject({ id: "sample-investigation", contentVersion: 1, difficulty: "medium", length: "quick", position: NOTICE });
    expect(progress.steps.notice).toMatchObject({ status: "started", difficulty: "medium", attempts: 0, hintsShown: 0 });
  });

  it("uses the nearest level a step offers", () => {
    const progress = apply(start("easy", "deep"), { type: "enterBranch", branchId: "friends" });
    // The branch step only has a medium activity.
    expect(progress.steps["friends/friends-step"].difficulty).toBe("medium");
    expect(activityAt(INV, progress, FRIENDS)?.activity.id).toBe("friends-clue");
  });
});

describe("paths", () => {
  it("quick sessions follow core steps; deep sessions add deep steps", () => {
    expect(mainPath(INV, "quick").map((s) => s.id)).toEqual(["notice", "connect", "reflect"]);
    expect(mainPath(INV, "deep").map((s) => s.id)).toEqual(["notice", "connect", "go-deeper", "reflect"]);
  });

  it("offers branches only in deep sessions when the learner wants them", () => {
    const step = INV.steps[0];
    expect(branchesOffered(INV, { length: "quick" }, step, { offerBranches: true })).toEqual([]);
    expect(branchesOffered(INV, { length: "deep" }, step, { offerBranches: false })).toEqual([]);
    expect(branchesOffered(INV, { length: "deep" }, step, { offerBranches: true }).map((b) => b.id)).toEqual(["friends"]);
  });
});

describe("navigation", () => {
  it("moves next and previous along the path, recording visits", () => {
    let progress = apply(start(), { type: "next" });
    expect(progress.position).toEqual(CONNECT);
    expect(progress.steps.connect.status).toBe("started");
    progress = apply(progress, { type: "next" }, { type: "next" });
    expect(progress.position).toEqual(REFLECT);
    expect(apply(progress, { type: "next" })).toBe(progress);
    progress = apply(progress, { type: "previous" }, { type: "previous" }, { type: "previous" });
    expect(progress.position).toEqual(NOTICE);
  });

  it("opens visited steps and the next unfinished one, but not unseen steps beyond it", () => {
    let progress = start();
    expect(canOpenStep(INV, progress, CONNECT)).toBe(false);
    expect(apply(progress, { type: "open", step: CONNECT })).toBe(progress);
    progress = apply(progress, { type: "complete", step: NOTICE });
    expect(canOpenStep(INV, progress, CONNECT)).toBe(true);
    progress = apply(progress, { type: "open", step: CONNECT }, { type: "open", step: NOTICE });
    expect(progress.position).toEqual(NOTICE);
    expect(canOpenStep(INV, progress, REFLECT)).toBe(false);
    expect(canOpenStep(INV, progress, { stepId: "nope" })).toBe(false);
  });

  it("returns the same object when nothing changes", () => {
    const progress = start();
    expect(apply(progress, { type: "previous" })).toBe(progress);
    expect(apply(progress, { type: "open", step: NOTICE })).toBe(progress);
    expect(apply(progress, { type: "setDifficulty", difficulty: "medium" })).toBe(progress);
    expect(apply(progress, { type: "respond", step: NOTICE, response: undefined })).toBe(progress);
  });
});

describe("answering", () => {
  it("records answers, checked attempts, and hints", () => {
    const progress = apply(
      start(),
      { type: "respond", step: NOTICE, response: { selected: [1] } },
      { type: "attempt", step: NOTICE, response: { selected: [1] }, now: T2 },
      { type: "hint", step: NOTICE },
    );
    expect(progress.steps.notice).toMatchObject({ attempts: 1, hintsShown: 1, response: { selected: [1] }, status: "started" });
    expect(progress.updatedAt).toBe(T1);
  });

  it("never shows more hints than the activity has", () => {
    const progress = apply(start(), { type: "hint", step: NOTICE }, { type: "hint", step: NOTICE }, { type: "hint", step: NOTICE });
    expect(progress.steps.notice.hintsShown).toBe(2);
  });

  it("syncs a component's state in one action", () => {
    const progress = apply(start(), { type: "sync", step: NOTICE, snapshot: { attempts: 2, hintsShown: 1, response: { selected: [4] } } });
    expect(progress.steps.notice).toMatchObject({ attempts: 2, hintsShown: 1, response: { selected: [4] } });
    expect(apply(progress, { type: "sync", step: NOTICE, snapshot: { attempts: 2, hintsShown: 1, response: { selected: [4] } } })).toBe(progress);
  });

  it("completes a step with its outcome and then keeps it as completed", () => {
    let progress = apply(start(), { type: "complete", step: NOTICE, outcome: { attempts: 1, hintsShown: 0, response: { selected: [4] } }, now: T2 });
    expect(progress.steps.notice).toMatchObject({ status: "complete", revealed: false, skipped: false, attempts: 1, completedAt: T2 });
    expect(stepStatus(progress, NOTICE)).toBe("complete");
    const again = apply(progress, { type: "respond", step: NOTICE, response: { selected: [0] } }, { type: "attempt", step: NOTICE, response: {} });
    expect(again).toBe(progress);
    progress = apply(progress, { type: "complete", step: NOTICE, outcome: { revealed: true } });
    expect(progress.steps.notice.revealed).toBe(false);
  });

  it("reveals: the step is complete, marked revealed", () => {
    const progress = apply(start(), { type: "reveal", step: NOTICE, response: { selected: [4] } });
    expect(progress.steps.notice).toMatchObject({ status: "complete", revealed: true, response: { selected: [4] } });
    expect(stepStatus(progress, NOTICE)).toBe("revealed");
  });

  it("skips without blocking, and a skipped step can still be completed later", () => {
    let progress = apply(start(), { type: "skip", step: NOTICE });
    expect(progress.steps.notice).toMatchObject({ status: "started", skipped: true });
    expect(stepStatus(progress, NOTICE)).toBe("skipped");
    expect(canOpenStep(INV, progress, CONNECT)).toBe(true);
    progress = apply(progress, { type: "complete", step: NOTICE });
    expect(progress.steps.notice).toMatchObject({ status: "complete", skipped: false });
  });

  it("treats a skipped outcome as a skip", () => {
    const progress = apply(start(), { type: "complete", step: NOTICE, outcome: { skipped: true, attempts: 3 } });
    expect(progress.steps.notice).toMatchObject({ skipped: true, status: "started", attempts: 3 });
  });

  it("saves reflections, even after the step is complete, and clears empty ones", () => {
    let progress = apply(start(), { type: "complete", step: NOTICE }, { type: "reflect", step: NOTICE, text: "He knows." });
    expect(progress.steps.notice.reflection).toBe("He knows.");
    progress = apply(progress, { type: "reflect", step: NOTICE, text: "" });
    expect(progress.steps.notice).not.toHaveProperty("reflection");
  });
});

describe("changing difficulty", () => {
  it("keeps completed steps at their level and moves unfinished steps to the new one", () => {
    let progress = apply(
      start("medium", "deep"),
      { type: "complete", step: NOTICE, outcome: { attempts: 2, hintsShown: 1 } },
      { type: "next" },
      { type: "attempt", step: CONNECT, response: { pairs: { succor: "alma" } } },
      { type: "hint", step: CONNECT },
    );
    progress = apply(progress, { type: "setDifficulty", difficulty: "hard", now: T2 });
    expect(progress.difficulty).toBe("hard");
    expect(progress.steps.notice).toMatchObject({ status: "complete", difficulty: "medium", attempts: 2, hintsShown: 1 });
    expect(progress.steps.connect).toMatchObject({ status: "started", difficulty: "hard", attempts: 0, hintsShown: 0, updatedAt: T2 });
    expect(progress.steps.connect).not.toHaveProperty("response");
    expect(activityAt(INV, progress, CONNECT)?.activity.type).toBe("compare");
    expect(activityAt(INV, progress, NOTICE)?.activity.id).toBe("find-why-medium");
  });

  it("keeps skipped steps skipped, ready to retry at the new level", () => {
    const progress = apply(start(), { type: "attempt", step: NOTICE, response: {} }, { type: "skip", step: NOTICE }, { type: "setDifficulty", difficulty: "easy" });
    expect(progress.steps.notice).toMatchObject({ skipped: true, difficulty: "easy", attempts: 0 });
    expect(completionState(INV, progress).done).toBe(1);
  });

  it("new steps open at the new level", () => {
    const progress = apply(start(), { type: "complete", step: NOTICE }, { type: "setDifficulty", difficulty: "complex" }, { type: "next" });
    expect(progress.steps.connect.difficulty).toBe("complex");
  });
});

describe("changing length", () => {
  it("adds the deep steps to the path without losing progress", () => {
    let progress = apply(start(), { type: "complete", step: NOTICE }, { type: "next" }, { type: "complete", step: CONNECT }, { type: "next" }, { type: "complete", step: REFLECT });
    expect(completionState(INV, progress)).toMatchObject({ complete: true, total: 3, done: 3 });
    progress = apply(progress, { type: "setLength", length: "deep" });
    expect(completionState(INV, progress)).toMatchObject({ complete: false, total: 4, done: 3, remaining: ["go-deeper"] });
    expect(canOpenStep(INV, progress, DEEPER)).toBe(true);
    expect(progress.steps.notice.status).toBe("complete");
  });

  it("moves off a deep step when switching to a quick session", () => {
    let progress = apply(start("medium", "deep"), { type: "next" }, { type: "next" });
    expect(progress.position).toEqual(DEEPER);
    progress = apply(progress, { type: "setLength", length: "quick" });
    expect(progress.position).toEqual(REFLECT);
    expect(progress.steps["go-deeper"]).toBeDefined();
  });

  it("resuming a quick session moves on from a step the content has since made deep-only", () => {
    // Saved on "go-deeper" in a quick session while that step was still a core one.
    const saved = { ...apply(start("medium", "deep"), { type: "complete", step: NOTICE }, { type: "next" }, { type: "next" }), length: "quick" as const };
    expect(saved.position).toEqual(DEEPER);
    const resumed = apply(saved, { type: "setLength", length: "quick" });
    expect(resumed.position).toEqual(REFLECT);
    expect(completionState(INV, resumed)).toMatchObject({ total: 3, done: 1, currentIndex: 2 });
    // On the path already: nothing changes.
    expect(apply(resumed, { type: "setLength", length: "quick" })).toBe(resumed);
  });

  it("returns from a branch when switching to a quick session", () => {
    const progress = apply(start("medium", "deep"), { type: "enterBranch", branchId: "friends" }, { type: "setLength", length: "quick" });
    expect(progress.position).toEqual(NOTICE);
    expect(progress.returnTo).toBeUndefined();
    expect(progress.visitedBranches).toEqual(["friends"]);
  });
});

describe("branches", () => {
  it("enters a branch, remembering where to return", () => {
    const progress = apply(start("medium", "deep"), { type: "enterBranch", branchId: "friends" });
    expect(progress.position).toEqual(FRIENDS);
    expect(progress.returnTo).toBe("notice");
    expect(progress.steps["friends/friends-step"].status).toBe("started");
    expect(apply(progress, { type: "enterBranch", branchId: "friends" })).toBe(progress);
    expect(apply(progress, { type: "enterBranch", branchId: "unknown" })).toBe(progress);
  });

  it("returns to the main path and marks the branch visited", () => {
    let progress = apply(start("medium", "deep"), { type: "enterBranch", branchId: "friends" }, { type: "complete", step: FRIENDS });
    progress = apply(progress, { type: "returnFromBranch" });
    expect(progress.position).toEqual(NOTICE);
    expect(progress).not.toHaveProperty("returnTo");
    expect(progress.visitedBranches).toEqual(["friends"]);
    expect(progress.steps["friends/friends-step"].status).toBe("complete");
    expect(apply(progress, { type: "returnFromBranch" })).toBe(progress);
  });

  it("returns when moving past the end (or before the start) of a branch", () => {
    const branched = apply(start("medium", "deep"), { type: "enterBranch", branchId: "friends" });
    expect(apply(branched, { type: "next" }).position).toEqual(NOTICE);
    expect(apply(branched, { type: "previous" }).position).toEqual(NOTICE);
  });

  it("leaves the branch when a main-path step is opened from the progress path", () => {
    const progress = apply(start("medium", "deep"), { type: "enterBranch", branchId: "friends" }, { type: "open", step: NOTICE });
    expect(progress.position).toEqual(NOTICE);
    expect(progress.visitedBranches).toEqual(["friends"]);
  });

  it("re-entering a visited branch reopens its steps as they were", () => {
    let progress = apply(start("medium", "deep"), { type: "enterBranch", branchId: "friends" }, { type: "complete", step: FRIENDS }, { type: "returnFromBranch" });
    progress = apply(progress, { type: "open", step: FRIENDS });
    expect(progress.position).toEqual(FRIENDS);
    expect(progress.returnTo).toBe("notice");
    expect(progress.steps["friends/friends-step"].status).toBe("complete");
  });

  it("branches don't count toward completion", () => {
    const progress = apply(start("medium", "deep"), { type: "enterBranch", branchId: "friends" });
    expect(completionState(INV, progress)).toMatchObject({ total: 4, done: 0, currentIndex: 0 });
  });
});

describe("completion", () => {
  const finishAll = (progress: StudyProgress) =>
    apply(progress, { type: "complete", step: NOTICE }, { type: "next" }, { type: "skip", step: CONNECT }, { type: "next" }, { type: "complete", step: REFLECT });

  it("is complete when every main-path step is completed or skipped", () => {
    const progress = finishAll(start());
    expect(completionState(INV, progress)).toMatchObject({ complete: true, done: 3, total: 3, remaining: [], currentIndex: 2 });
  });

  it("finish records completion only when complete", () => {
    expect(apply(start(), { type: "finish" }).completedAt).toBeUndefined();
    const done = apply(finishAll(start()), { type: "finish", now: T2 });
    expect(done.completedAt).toBe(T2);
    expect(apply(done, { type: "finish" })).toBe(done);
  });

  it("restart starts over but keeps the Discovery Card link", () => {
    const done = apply(finishAll(start()), { type: "finish" }, { type: "linkDiscovery", discoveryId: "card-1" });
    const again = apply(done, { type: "restart", now: T2 });
    expect(again).toMatchObject({ discoveryId: "card-1", position: NOTICE, startedAt: T0, updatedAt: T2, visitedBranches: [] });
    expect(again.completedAt).toBeUndefined();
    expect(Object.keys(again.steps)).toEqual(["notice"]);
  });
});

describe("content version changes", () => {
  it("keeps states of steps that still exist and drops the rest", () => {
    let progress = apply(start("medium", "deep"), { type: "complete", step: NOTICE, outcome: { attempts: 1 } }, { type: "next" }, { type: "attempt", step: CONNECT, response: { pairs: {} } });
    progress = apply(progress, { type: "next" }, { type: "reflect", step: DEEPER, text: "Mine" }, { type: "enterBranch", branchId: "friends" }, { type: "returnFromBranch" });
    progress = apply(progress, { type: "open", step: DEEPER });

    const updated = investigation((raw) => {
      raw.contentVersion = 2;
      (raw.steps as { id: string }[]).splice(2, 1); // go-deeper removed
      raw.branches = [];
      (raw.steps[0] as { branchIds?: string[] }).branchIds = [];
    });
    const next = reconcileContentVersion(updated, progress, T2);
    expect(next.contentVersion).toBe(2);
    expect(Object.keys(next.steps).sort()).toEqual(["connect", "notice"]);
    expect(next.steps.notice).toEqual(progress.steps.notice);
    expect(next.steps.connect).toMatchObject({ attempts: 0, status: "started" });
    expect(next.steps.connect).not.toHaveProperty("response");
    expect(next.visitedBranches).toEqual([]);
    expect(next.position).toEqual(NOTICE);
    expect(reconcileContentVersion(updated, next, T2)).toBe(next);
  });

  it("leaves progress from a newer content version exactly as it is", () => {
    // Saved by a newer build (an older tab, or after a rollback): a step this build doesn't know, an answer in progress, a newer branch.
    const newer: StudyProgress = {
      ...apply(start("medium", "deep"), { type: "complete", step: NOTICE }, { type: "next" }, { type: "attempt", step: CONNECT, response: { pairs: { a: "b" } } }),
      contentVersion: INV.contentVersion + 1,
      completedAt: T1,
      discoveryId: "card-1",
      visitedBranches: ["added-later"],
    };
    newer.steps["added-later"] = { ...newer.steps.notice };
    const frozen = deepFreeze(structuredClone(newer));
    expect(isFromNewerContent(frozen, INV)).toBe(true);
    expect(reconcileContentVersion(INV, frozen, T2)).toBe(frozen);
    expect(frozen).toEqual(newer);
  });

  it("tells which side is newer", () => {
    expect(isFromNewerContent({ contentVersion: 2 }, { contentVersion: 1 })).toBe(true);
    expect(isFromNewerContent({ contentVersion: 1 }, { contentVersion: 1 })).toBe(false);
    expect(isFromNewerContent({ contentVersion: 1 }, { contentVersion: 2 })).toBe(false);
  });
});

describe("saving alongside other tabs", () => {
  const seen = (completedAt: string[] = [], discoveryId: string[] = []) => ({ completedAt: new Set(completedAt), discoveryId: new Set(discoveryId) });
  const finished = apply(
    start(),
    { type: "complete", step: NOTICE },
    { type: "next" },
    { type: "skip", step: CONNECT },
    { type: "next" },
    { type: "complete", step: REFLECT },
    { type: "finish", now: T1 },
    { type: "linkDiscovery", discoveryId: "card-1" },
  );

  it("keeps a completion and card link another tab saved after this page took over", () => {
    const mine = apply(start(), { type: "next" });
    const saved = keepCompletionFromElsewhere(mine, finished, seen());
    expect(saved).toMatchObject({ completedAt: T1, discoveryId: "card-1", position: mine.position, steps: mine.steps });
  });

  it("doesn't bring back a completion this page cleared by restarting", () => {
    const restarted = apply(finished, { type: "restart", now: T2 });
    const saved = keepCompletionFromElsewhere(restarted, finished, seen([T1], ["card-1"]));
    expect(saved).toBe(restarted);
    expect(saved.completedAt).toBeUndefined();
  });

  it("keeps a newer completion from elsewhere even after restarting here", () => {
    const restarted = apply(finished, { type: "restart", now: T2 });
    const again = { ...finished, completedAt: T2 };
    expect(keepCompletionFromElsewhere(restarted, again, seen([T1], ["card-1"])).completedAt).toBe(T2);
  });

  it("changes nothing when this page's copy has its own values, or nothing is stored", () => {
    const mine = { ...finished, completedAt: T2, discoveryId: "card-2" };
    expect(keepCompletionFromElsewhere(mine, finished, seen())).toBe(mine);
    expect(keepCompletionFromElsewhere(start(), undefined, seen())).toEqual(start());
  });
});

describe("persistence", () => {
  it("round-trips through the stored schema unchanged", () => {
    const progress = apply(
      start("hard", "deep"),
      { type: "attempt", step: NOTICE, response: { selected: [1, 4] } },
      { type: "hint", step: NOTICE },
      { type: "complete", step: NOTICE, outcome: { attempts: 2, hintsShown: 1 } },
      { type: "reflect", step: NOTICE, text: "Notes" },
      { type: "enterBranch", branchId: "friends" },
    );
    const stored = studyProgressSchema.parse(JSON.parse(JSON.stringify(progress)));
    expect(stored).toEqual(progress);
    expect(studyReducer(INV, stored, { type: "returnFromBranch", now: T2 }).position).toEqual(NOTICE);
  });
});

describe("help policy", () => {
  const activity = INV.steps[0].activities.medium!;

  it("offers hints on request from the start", () => {
    const help = helpOptions(activity, { attempts: 0, hintsShown: 0, completed: false });
    expect(help).toMatchObject({ canRequestHint: true, offerHint: false, showFeedback: false, canReveal: false, canSkip: false });
    expect(help.nextHint).toEqual({ index: 0, text: activity.type !== "reflect" ? activity.hints[0] : "" });
  });

  it("offers Continue anyway from the start where the host allows it, but not Show me", () => {
    const fresh = { attempts: 0, hintsShown: 0, completed: false };
    expect(helpOptions(activity, fresh, { allowSkip: true })).toMatchObject({ canSkip: true, canReveal: false });
    expect(helpOptions(activity, fresh, { allowSkip: false }).canSkip).toBe(false);
  });

  it("shows feedback and offers the next hint after a wrong check", () => {
    const help = helpOptions(activity, { attempts: 1, hintsShown: 1, completed: false, lastCheckWrong: true });
    expect(help).toMatchObject({ showFeedback: true, offerHint: true, nextHint: { index: 1 } });
  });

  it("offers Show me after two attempts, with hints still on request", () => {
    expect(ATTEMPTS_BEFORE_REVEAL).toBe(2);
    expect(helpOptions(activity, { attempts: 1, hintsShown: 0, completed: false, lastCheckWrong: true }).canReveal).toBe(false);
    expect(helpOptions(activity, { attempts: 2, hintsShown: 0, completed: false, lastCheckWrong: true })).toMatchObject({
      canReveal: true,
      canSkip: false,
      canRequestHint: true,
      hintsExhausted: false,
    });
  });

  it("offers Show me after one attempt once every hint has been shown", () => {
    const hints = activity.type !== "reflect" ? activity.hints.length : 0;
    expect(hints).toBeGreaterThan(1);
    expect(helpOptions(activity, { attempts: 0, hintsShown: hints, completed: false }).canReveal).toBe(false);
    expect(helpOptions(activity, { attempts: 1, hintsShown: hints - 1, completed: false, lastCheckWrong: true }).canReveal).toBe(false);
    expect(helpOptions(activity, { attempts: 1, hintsShown: hints, completed: false, lastCheckWrong: true }, { allowSkip: true })).toMatchObject({
      canReveal: true,
      canSkip: true,
      canRequestHint: false,
      hintsExhausted: true,
    });
  });

  it("offers nothing once finished, and never for reflections", () => {
    expect(helpOptions(activity, { attempts: 5, hintsShown: 0, completed: true }, { allowSkip: true })).toMatchObject({
      canRequestHint: false,
      canReveal: false,
      canSkip: false,
    });
    const reflect = activitySchema.parse({ type: "reflect", id: "r", prompt: "Ponder" });
    expect(helpOptions(reflect, { attempts: 3, hintsShown: 0, completed: false })).toMatchObject({ canRequestHint: false, canReveal: false });
  });

  it("points back to the evidence without the answer", () => {
    const { registry } = buildContentRegistry(SAMPLE_CONTENT);
    const pointer = evidencePointer(activity, Object.fromEntries(registry.sources));
    expect(pointer.sourceIds).toEqual(["alma-7-11-12"]);
    expect(pointer.text).toMatch(/phrase by phrase.*Reread Alma 7:11–12\./);
    expect(listOf(["A", "B", "C"])).toBe("A, B, and C");
  });
});

describe("recommendDifficulty", () => {
  const done = (minute: number, change: Partial<StepState> = {}): StepState => ({
    status: "complete",
    difficulty: "medium",
    attempts: 1,
    hintsShown: 0,
    revealed: false,
    skipped: false,
    completedAt: `2026-10-26T10:${String(minute).padStart(2, "0")}:00.000Z`,
    updatedAt: `2026-10-26T10:${String(minute).padStart(2, "0")}:00.000Z`,
    ...change,
  });
  const record = (id: string, steps: StepState[]): StudyProgress => ({
    ...start(),
    id,
    steps: Object.fromEntries(steps.map((state, i) => [`s${i}`, state])),
  });

  it("suggests the next level after four steps worked out readily", () => {
    const records = [record("a", [done(1), done(2)]), record("b", [done(3), done(4)])];
    expect(recommendDifficulty(records, "medium")).toEqual({ direction: "up", from: "medium", difficulty: "hard" });
  });

  it("needs four recent steps, all readily, at the current level", () => {
    expect(recommendDifficulty([record("a", [done(1), done(2), done(3)])], "medium")).toBeNull();
    expect(recommendDifficulty([record("a", [done(1), done(2), done(3), done(4, { hintsShown: 1 })])], "medium")).toBeNull();
    expect(recommendDifficulty([record("a", [done(1), done(2), done(3), done(4, { attempts: 2 })])], "medium")).toBeNull();
    // An older struggle falls outside the window.
    expect(recommendDifficulty([record("a", [done(0, { attempts: 5 }), done(1), done(2), done(3), done(4)])], "medium")?.direction).toBe("up");
    expect(recommendDifficulty([record("a", [done(1), done(2), done(3), done(4)])], "hard")).toBeNull();
  });

  it("suggests one level down when two of the last four were revealed or skipped", () => {
    const records = [record("a", [done(1), done(2, { revealed: true, attempts: 3 }), done(3), done(4, { status: "started", skipped: true, attempts: 3 })])];
    expect(recommendDifficulty(records, "medium")).toEqual({ direction: "down", from: "medium", difficulty: "easy" });
  });

  it("ignores reflections and steps at other levels, and never goes past the ends", () => {
    const reflections = [done(1, { attempts: 0 }), done(2, { attempts: 0 }), done(3, { attempts: 0 }), done(4, { attempts: 0 })];
    expect(recommendDifficulty([record("a", reflections)], "medium")).toBeNull();
    const complex = [done(1), done(2), done(3), done(4)].map((s) => ({ ...s, difficulty: "complex" as const }));
    expect(recommendDifficulty([record("a", complex)], "complex")).toBeNull();
    const easy = [done(1, { revealed: true }), done(2, { revealed: true })].map((s) => ({ ...s, difficulty: "easy" as const }));
    expect(recommendDifficulty([record("a", easy)], "easy")).toBeNull();
  });
});

describe("bundleInvestigation", () => {
  const { registry } = buildContentRegistry(SAMPLE_CONTENT);
  const sample = registry.investigations[0];
  const bundle = bundleInvestigation(registry, sample);

  it("includes every source the investigation cites", () => {
    expect(Object.keys(bundle.sources).sort()).toEqual(["alma-7-11-12", "john-15-13-15"]);
  });

  it("gives concepts their Map refs, labels, and descriptions", () => {
    expect(bundle.concepts.atonement).toMatchObject({ ref: "concept:atonement", label: "Atonement of Jesus Christ" });
    expect(bundle.concepts.succor).toMatchObject({ ref: "vocabulary:succor", label: "Succor", description: "To run to help." });
    expect(conceptRef(registry, "unknown")).toBe("concept:unknown");
  });

  it("labels every node its connections use", () => {
    const labelFor = labelsLookup(bundle.labels);
    expect(labelFor("scripture:alma-7-11-12")).toBe("Alma 7:11–12");
    expect(labelFor("vocabulary:succor")).toBe("Succor");
    expect(labelFor("question:sample-investigation")).toBe(sample.question);
    expect(labelFor("question:primary-christ")).toMatch(/Jesus Christ the Son of God/);
    expect(labelFor("concept:not-in-bundle")).toBe("not-in-bundle");
  });

  it("leaves the owner's review notes out", () => {
    expect(bundle.investigation.review).toEqual({ status: sample.review.status, notes: [] });
    expect(bundle.investigation.steps).toEqual(sample.steps);
  });

  it("is plain JSON", () => {
    expect(JSON.parse(JSON.stringify(bundle))).toEqual(bundle);
  });
});
