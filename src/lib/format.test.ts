import { describe, expect, it } from "vitest";
import { formatDate } from "./format";

describe("formatDate", () => {
  it("dates things in the learner's time zone, so evening study isn't dated tomorrow", () => {
    // 9:30 pm on October 26 in Utah is already October 27 in UTC.
    expect(formatDate("2026-10-27T03:30:00.000Z", "America/Denver")).toBe("Oct 26, 2026");
    expect(formatDate("2026-10-27T03:30:00.000Z", "UTC")).toBe("Oct 27, 2026");
  });
});
