import { describe, expect, it } from "vitest";
import { hasChosenPreferences } from "./release-state";

describe("hasChosenPreferences", () => {
  it("doesn't count the Map's last-visit time, which opening the Map writes by itself", () => {
    expect(hasChosenPreferences(null)).toBe(false);
    expect(hasChosenPreferences(JSON.stringify({ lastMapVisit: "2026-10-26T21:00:00.000Z" }))).toBe(false);
    expect(hasChosenPreferences(JSON.stringify({ lastMapVisit: "2026-10-26T21:00:00.000Z", difficulty: "hard" }))).toBe(true);
    // Something stored that can't be read was still stored by 2.0 or later.
    expect(hasChosenPreferences("{")).toBe(true);
  });
});
