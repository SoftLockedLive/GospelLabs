import { describe, expect, it } from "vitest";
import { formatLongDate, greetingFor, relativeDay } from "./time";

const local = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);

describe("greetingFor", () => {
  it("follows the local hour", () => {
    expect(greetingFor(local(2026, 10, 26, 6))).toBe("Good morning");
    expect(greetingFor(local(2026, 10, 26, 13))).toBe("Good afternoon");
    expect(greetingFor(local(2026, 10, 26, 20))).toBe("Good evening");
    expect(greetingFor(local(2026, 10, 26, 1))).toBe("Good evening");
  });
});

describe("relativeDay", () => {
  const now = local(2026, 10, 26, 9);
  it("describes recent days in words", () => {
    expect(relativeDay(local(2026, 10, 26, 1).toISOString(), now)).toBe("today");
    expect(relativeDay(local(2026, 10, 25, 23).toISOString(), now)).toBe("yesterday");
    expect(relativeDay(local(2026, 10, 22).toISOString(), now)).toBe("4 days ago");
  });

  it("uses a short date after a week, and nothing for an invalid time", () => {
    expect(relativeDay(local(2026, 10, 1).toISOString(), now)).toBe("Oct 1");
    expect(relativeDay("not a date", now)).toBe("");
  });
});

describe("formatLongDate", () => {
  it("names the weekday and date", () => {
    expect(formatLongDate(local(2026, 10, 26))).toBe("Monday, October 26");
  });
});
