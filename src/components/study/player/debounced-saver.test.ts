import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StorageError } from "@/persistence/storage-errors";
import { DebouncedSaver } from "./debounced-saver";

describe("DebouncedSaver", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("waits for typing to pause, then writes only the latest value", async () => {
    const write = vi.fn(async () => {});
    const saver = new DebouncedSaver<string>(write, 400);
    saver.update("a");
    saver.update("ab");
    expect(saver.getStatus().state).toBe("pending");
    await vi.advanceTimersByTimeAsync(399);
    expect(write).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(write).toHaveBeenCalledExactlyOnceWith("ab");
    expect(saver.getStatus().state).toBe("saved");
    expect(saver.hasUnsavedChanges()).toBe(false);
  });

  it("saves discrete actions on the next tick", async () => {
    const write = vi.fn(async () => {});
    const saver = new DebouncedSaver<string>(write, 400);
    saver.update("next step", { immediate: true });
    await vi.advanceTimersByTimeAsync(0);
    expect(write).toHaveBeenCalledWith("next step");
  });

  it("writes one save at a time and follows up with values reported meanwhile", async () => {
    let release: () => void = () => {};
    const write = vi.fn(() => new Promise<void>((resolve) => (release = resolve)));
    const saver = new DebouncedSaver<string>(write, 100);
    saver.update("one", { immediate: true });
    await vi.advanceTimersByTimeAsync(0);
    saver.update("two", { immediate: true });
    await vi.advanceTimersByTimeAsync(0);
    expect(write).toHaveBeenCalledTimes(1);
    release();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(100);
    expect(write).toHaveBeenLastCalledWith("two");
    release();
    await vi.advanceTimersByTimeAsync(0);
    expect(saver.getStatus().state).toBe("saved");
  });

  it("flushes immediately and skips values already saved", async () => {
    const write = vi.fn(async () => {});
    const saver = new DebouncedSaver<string>(write);
    saver.update("typing");
    await saver.flush();
    expect(write).toHaveBeenCalledWith("typing");
    await saver.flush();
    saver.update("typing");
    await vi.runAllTimersAsync();
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("reports failures, keeps the value, and retries", async () => {
    const write = vi.fn().mockRejectedValueOnce(new StorageError("quota")).mockResolvedValue(undefined);
    const saver = new DebouncedSaver<string>(write);
    saver.update("work");
    await saver.flush();
    expect(saver.getStatus()).toEqual({ state: "error", message: expect.stringMatching(/out of storage/) });
    expect(saver.hasUnsavedChanges()).toBe(true);
    await saver.retry();
    expect(saver.getStatus().state).toBe("saved");
    expect(write).toHaveBeenLastCalledWith("work");
  });

  it("accepts values stored elsewhere without writing them again", async () => {
    const write = vi.fn(async () => {});
    const saver = new DebouncedSaver<string>(write);
    saver.update("before");
    saver.markSaved("with card");
    await vi.runAllTimersAsync();
    expect(write).not.toHaveBeenCalled();
    expect(saver.getStatus().state).toBe("saved");
  });

  it("notifies subscribers of status changes", async () => {
    const saver = new DebouncedSaver<string>(async () => {});
    const listener = vi.fn();
    const unsubscribe = saver.subscribe(listener);
    saver.update("x");
    await saver.flush();
    expect(listener).toHaveBeenCalled();
    unsubscribe();
    listener.mockClear();
    saver.update("y");
    expect(listener).not.toHaveBeenCalled();
  });
});
