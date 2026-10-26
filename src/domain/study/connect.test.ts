import { afterEach, describe, expect, it } from "vitest";
import { formatForDay, localDayIndex, pickConnectSession } from "./connect";
import { CONNECT_FORMATS, type ConnectFormat, type ConnectSession } from "./content-schema";

const session = (id: string, format: ConnectFormat): ConnectSession => ({
  id,
  status: "ready",
  format,
  title: id,
  sourceId: "john-14-27",
  intro: "Intro.",
  notice: [],
  insights: [],
  ponder: [],
  sources: [],
});

const SESSIONS = [
  session("see-a", "see"),
  session("see-b", "see"),
  session("see-c", "see"),
  session("understand-a", "understand"),
  session("understand-b", "understand"),
  session("reflect-a", "reflect"),
];

/** Local noon on the given day, so tests don't depend on the machine's time zone. */
const day = (year: number, month: number, date: number, hours = 12, minutes = 0) => new Date(year, month - 1, date, hours, minutes);

const originalTz = process.env.TZ;
afterEach(() => {
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
});

describe("localDayIndex", () => {
  it("counts whole local days since 1 January 1970", () => {
    expect(localDayIndex(day(1970, 1, 1))).toBe(0);
    expect(localDayIndex(day(1970, 1, 2, 0, 1))).toBe(1);
    expect(localDayIndex(day(1970, 1, 1, 23, 59))).toBe(0);
  });

  it("changes at local midnight", () => {
    const before = localDayIndex(day(2026, 10, 26, 23, 59));
    const after = localDayIndex(day(2026, 10, 27, 0, 0));
    expect(after - before).toBe(1);
  });
});

describe("formatForDay", () => {
  it("starts the cycle with See Christ and rotates daily through the three formats", () => {
    expect(formatForDay(day(1970, 1, 1))).toBe("see");
    expect(formatForDay(day(1970, 1, 2))).toBe("understand");
    expect(formatForDay(day(1970, 1, 3))).toBe("reflect");
    expect(formatForDay(day(1970, 1, 4))).toBe("see");
  });

  it("offers every format once in any three consecutive days", () => {
    const start = day(2026, 10, 26);
    const formats = [0, 1, 2].map((offset) => formatForDay(day(2026, 10, 26 + offset)));
    expect(new Set(formats)).toEqual(new Set(CONNECT_FORMATS));
    expect(formatForDay(day(2026, 10, 29))).toBe(formatForDay(start));
  });

  it("keeps one format for the whole local day", () => {
    expect(formatForDay(day(2026, 10, 26, 0, 0))).toBe(formatForDay(day(2026, 10, 26, 23, 59)));
  });

  it("changes at local midnight even on daylight-saving days", () => {
    process.env.TZ = "America/Denver";
    // 8 March 2026: clocks spring forward at 2:00 a.m. in Denver.
    expect(formatForDay(day(2026, 3, 8, 0, 30))).toBe(formatForDay(day(2026, 3, 8, 23, 30)));
    expect(formatForDay(day(2026, 3, 9, 0, 30))).not.toBe(formatForDay(day(2026, 3, 8, 23, 30)));
    // 1 November 2026: clocks fall back at 2:00 a.m.
    expect(formatForDay(day(2026, 11, 1, 0, 30))).toBe(formatForDay(day(2026, 11, 1, 23, 30)));
    expect(localDayIndex(day(2026, 11, 2, 0, 0)) - localDayIndex(day(2026, 11, 1, 23, 59))).toBe(1);
  });
});

describe("pickConnectSession", () => {
  const date = day(2026, 10, 26);

  it("defaults to today's format", () => {
    expect(pickConnectSession(SESSIONS, { date })?.format).toBe(formatForDay(date));
  });

  it("offers only sessions in the requested format", () => {
    for (const format of CONNECT_FORMATS) {
      expect(pickConnectSession(SESSIONS, { date, format })?.format).toBe(format);
    }
  });

  it("returns undefined when a format has no sessions", () => {
    expect(pickConnectSession(SESSIONS.filter((s) => s.format !== "reflect"), { date, format: "reflect" })).toBeUndefined();
  });

  it("shifts which never-opened session comes first from day to day", () => {
    const sees = SESSIONS.filter((s) => s.format === "see");
    const first = (d: Date) => pickConnectSession(SESSIONS, { date: d, format: "see" })?.id;
    const index = localDayIndex(date);
    expect(first(date)).toBe(sees[index % sees.length].id);
    const nextThree = [1, 2, 3].map((offset) => first(day(2026, 10, 26 + offset)));
    expect(new Set([first(date), ...nextThree.slice(0, 2)]).size).toBe(3);
    expect(nextThree[2]).toBe(first(date));
  });

  it("prefers sessions never opened over ones already opened", () => {
    const opened = pickConnectSession(SESSIONS, { date, format: "see" })!;
    const lastOpened = new Map([[opened.id, "2026-10-26T08:00:00.000Z"]]);
    const next = pickConnectSession(SESSIONS, { date, format: "see", lastOpened });
    expect(next?.id).not.toBe(opened.id);
  });

  it("offers the session opened least recently once all have been opened", () => {
    const lastOpened = new Map([
      ["see-a", "2026-10-20T08:00:00.000Z"],
      ["see-b", "2026-10-10T08:00:00.000Z"],
      ["see-c", "2026-10-24T08:00:00.000Z"],
    ]);
    expect(pickConnectSession(SESSIONS, { date, format: "see", lastOpened })?.id).toBe("see-b");
  });

  it("never offers the excluded session while another exists", () => {
    for (const s of SESSIONS.filter((x) => x.format === "see")) {
      expect(pickConnectSession(SESSIONS, { date, format: "see", exclude: s.id })?.id).not.toBe(s.id);
    }
  });

  it("falls back to the only session in a format, even if excluded", () => {
    expect(pickConnectSession(SESSIONS, { date, format: "reflect", exclude: "reflect-a" })?.id).toBe("reflect-a");
  });

  it("doesn't reorder the sessions it's given", () => {
    const copy = [...SESSIONS];
    pickConnectSession(SESSIONS, { date, lastOpened: new Map([["see-a", "2026-10-26T08:00:00.000Z"]]) });
    expect(SESSIONS).toEqual(copy);
  });
});
