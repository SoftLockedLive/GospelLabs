import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Investigation } from "@/domain/investigation";
import { investigationReducer } from "@/domain/investigation-reducer";
import { blankInvestigation, richInvestigation } from "@/domain/test-fixtures";
import { AutosaveController, type AutosaveOptions } from "./autosave";
import type { SaveResult } from "./investigation-repository";
import { createTestRepository } from "./test-utils";

const DELAY = 500;
let clock = Date.parse("2026-10-20T10:00:00.000Z");
const nextTime = () => new Date((clock += 1000)).toISOString();

const type = (investigation: Investigation, value: string): Investigation =>
  investigationReducer(investigation, { type: "setText", field: "question", value, now: nextTime() });

function fakeStore(result: () => Promise<SaveResult> = async () => ({ ok: true })) {
  const saves: { investigation: Investigation; expected: string | null }[] = [];
  const save = vi.fn(async (investigation: Investigation, expected: string | null) => {
    saves.push({ investigation, expected });
    return result();
  });
  return { saves, save, overwrite: vi.fn(async () => {}) };
}

function controller(overrides: Partial<AutosaveOptions> & Pick<AutosaveOptions, "initial" | "stored">) {
  const store = fakeStore();
  const instance = new AutosaveController({ save: store.save, overwrite: store.overwrite, delayMs: DELAY, ...overrides });
  return { instance, ...store };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("debouncing", () => {
  it("saves once after typing pauses, with the latest content", async () => {
    const stored = richInvestigation("inv");
    const { instance, saves } = controller({ initial: stored, stored });
    let current = stored;
    for (const text of ["W", "Wh", "Why"]) {
      current = type(current, text);
      instance.update(current);
      await vi.advanceTimersByTimeAsync(DELAY / 2);
    }
    expect(saves).toHaveLength(0);
    expect(instance.getStatus()).toEqual({ state: "pending" });

    await vi.advanceTimersByTimeAsync(DELAY);
    expect(saves).toHaveLength(1);
    expect(saves[0].investigation.question).toBe("Why");
    expect(saves[0].expected).toBe(stored.updatedAt);
    expect(instance.getStatus()).toEqual({ state: "saved" });
  });

  it("passes the previously saved version as the expected version next time", async () => {
    const stored = richInvestigation("inv");
    const { instance, saves } = controller({ initial: stored, stored });
    const first = type(stored, "One");
    instance.update(first);
    await vi.advanceTimersByTimeAsync(DELAY);
    instance.update(type(first, "Two"));
    await vi.advanceTimersByTimeAsync(DELAY);
    expect(saves.map((s) => s.expected)).toEqual([stored.updatedAt, first.updatedAt]);
  });

  it("saves section changes so the investigation reopens where the user left off", async () => {
    const stored = richInvestigation("inv");
    const { instance, saves } = controller({ initial: stored, stored });
    instance.update(investigationReducer(stored, { type: "setSection", section: "conclusion" }));
    await vi.advanceTimersByTimeAsync(DELAY);
    expect(saves[0].investigation.currentSection).toBe("conclusion");
  });

  it("does nothing when the state hasn't changed", async () => {
    const stored = richInvestigation("inv");
    const { instance, saves } = controller({ initial: stored, stored });
    instance.update(stored);
    await vi.advanceTimersByTimeAsync(DELAY * 2);
    expect(saves).toHaveLength(0);
    expect(instance.hasUnsavedChanges()).toBe(false);
  });
});

describe("new drafts", () => {
  it("are not stored until the user edits them", async () => {
    const draft = blankInvestigation();
    const onFirstSave = vi.fn();
    const { instance, saves } = controller({ initial: draft, stored: null, onFirstSave });
    instance.update(investigationReducer(draft, { type: "setSection", section: "research" }));
    await vi.advanceTimersByTimeAsync(DELAY * 2);
    expect(saves).toHaveLength(0);
    expect(instance.getStatus()).toEqual({ state: "draft" });
    expect(instance.hasUnsavedChanges()).toBe(false);

    instance.update(type(draft, "A real question"));
    await vi.advanceTimersByTimeAsync(DELAY);
    expect(saves).toHaveLength(1);
    expect(saves[0].expected).toBeNull();
    expect(onFirstSave).toHaveBeenCalledOnce();
  });
});

describe("flushing", () => {
  it("saves immediately when flushed, without waiting for the pause", async () => {
    const stored = richInvestigation("inv");
    const { instance, saves } = controller({ initial: stored, stored });
    instance.update(type(stored, "Leaving now"));
    expect(instance.hasUnsavedChanges()).toBe(true);
    await instance.flush();
    expect(saves).toHaveLength(1);
    expect(instance.hasUnsavedChanges()).toBe(false);
  });

  it("never runs two saves at once, and saves edits made during a save afterwards", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    let active = 0;
    let maxActive = 0;
    const stored = richInvestigation("inv");
    const save = vi.fn<AutosaveOptions["save"]>(async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      if (save.mock.calls.length === 1) await gate;
      active--;
      return { ok: true } as const;
    });
    const instance = new AutosaveController({ initial: stored, stored, save, overwrite: vi.fn(), delayMs: DELAY });

    const first = type(stored, "First");
    instance.update(first);
    const flushing = instance.flush();
    const second = type(first, "Second");
    instance.update(second);
    const flushingAgain = instance.flush();
    release();
    await Promise.all([flushing, flushingAgain]);

    expect(maxActive).toBe(1);
    expect(save.mock.calls.map(([investigation]) => investigation.question)).toEqual(["First", "Second"]);
    expect(instance.getStatus()).toEqual({ state: "saved" });
  });
});

describe("failures", () => {
  it("reports a storage error, keeps the edits, and succeeds on retry", async () => {
    const stored = richInvestigation("inv");
    let fail = true;
    const store = fakeStore(async () => {
      if (fail) throw new DOMException("Disk full", "QuotaExceededError");
      return { ok: true };
    });
    const instance = new AutosaveController({ initial: stored, stored, ...store, delayMs: DELAY });

    instance.update(type(stored, "Important"));
    await vi.advanceTimersByTimeAsync(DELAY);
    expect(instance.getStatus()).toMatchObject({ state: "error", message: expect.stringContaining("storage space") });
    expect(instance.hasUnsavedChanges()).toBe(true);

    fail = false;
    await instance.retry();
    expect(instance.getStatus()).toEqual({ state: "saved" });
    expect(store.saves.at(-1)?.investigation.question).toBe("Important");
  });

  it("stops autosaving after a conflict until the user decides", async () => {
    const stored = richInvestigation("inv");
    const store = fakeStore(async () => ({ ok: false, conflict: "modified" }));
    const instance = new AutosaveController({ initial: stored, stored, ...store, delayMs: DELAY });

    const mine = type(stored, "Mine");
    instance.update(mine);
    await vi.advanceTimersByTimeAsync(DELAY);
    expect(instance.getStatus()).toEqual({ state: "conflict", conflict: "modified" });

    instance.update(type(mine, "Still mine"));
    await vi.advanceTimersByTimeAsync(DELAY * 3);
    expect(store.save).toHaveBeenCalledTimes(1);
    expect(instance.hasUnsavedChanges()).toBe(true);

    await instance.keepMine();
    expect(store.overwrite).toHaveBeenCalledWith(expect.objectContaining({ question: "Still mine" }));
    expect(instance.getStatus()).toEqual({ state: "saved" });
  });
});

describe("with a real database", () => {
  it("persists a new draft, follow-up edits, and detects a delete from another tab", async () => {
    vi.useRealTimers();
    const { repository } = createTestRepository();
    const draft = blankInvestigation();
    const instance = new AutosaveController({
      initial: draft,
      stored: null,
      save: repository.save,
      overwrite: repository.overwrite,
      delayMs: 5,
    });

    const edited = type(draft, "Stored question");
    instance.update(edited);
    await instance.flush();
    expect(await repository.get(draft.id)).toEqual({ status: "found", investigation: edited });

    const again = type(edited, "Updated question");
    instance.update(again);
    await instance.flush();
    const loaded = await repository.get(draft.id);
    expect(loaded.status === "found" && loaded.investigation.question).toBe("Updated question");

    await repository.delete(draft.id);
    instance.update(type(again, "After delete"));
    await instance.flush();
    expect(instance.getStatus()).toEqual({ state: "conflict", conflict: "deleted" });
    expect(await repository.get(draft.id)).toEqual({ status: "missing" });
  });
});
