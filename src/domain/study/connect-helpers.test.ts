import { describe, expect, it } from "vitest";
import { formatForDay } from "./connect";
import {
  differentSession,
  explorationWithNote,
  hasAnotherSession,
  lastOpenedBySession,
  openedExploration,
  sessionForToday,
  type ConnectSessionRef,
} from "./connect-helpers";
import { CONNECT_FORMATS } from "./content-schema";
import { explorationSchema, type Exploration } from "./user-data";

const SESSIONS: ConnectSessionRef[] = [
  { id: "see-a", format: "see" },
  { id: "see-b", format: "see" },
  { id: "see-c", format: "see" },
  { id: "understand-a", format: "understand" },
  { id: "understand-b", format: "understand" },
  { id: "reflect-a", format: "reflect" },
];

const day = (date: number, hours = 12, minutes = 0) => new Date(2026, 9, date, hours, minutes);

const exploration = (kind: Exploration["kind"], contentId: string, updatedAt: string): Exploration => ({
  id: `${kind}:${contentId}`,
  kind,
  contentId,
  firstAt: updatedAt,
  updatedAt,
  completedActivities: [],
  vocabulary: [],
  highlights: [],
  note: "",
});

describe("lastOpenedBySession", () => {
  it("reads only Connect explorations, keeping the latest time per session", () => {
    const map = lastOpenedBySession([
      exploration("connect", "see-a", "2026-10-20T10:00:00.000Z"),
      exploration("passage", "see-b", "2026-10-25T10:00:00.000Z"),
      exploration("connect", "see-a", "2026-10-22T10:00:00.000Z"),
      exploration("connect", "reflect-a", "2026-10-21T10:00:00.000Z"),
    ]);
    expect([...map]).toEqual([
      ["see-a", "2026-10-22T10:00:00.000Z"],
      ["reflect-a", "2026-10-21T10:00:00.000Z"],
    ]);
  });

  it("uses when a session was last opened, falling back to updatedAt for records saved before that was kept", () => {
    const map = lastOpenedBySession([
      { ...exploration("connect", "see-a", "2026-10-20T10:00:00.000Z"), lastOpenedAt: "2026-10-24T10:00:00.000Z" },
      exploration("connect", "see-b", "2026-10-22T10:00:00.000Z"),
    ]);
    expect(map.get("see-a")).toBe("2026-10-24T10:00:00.000Z");
    expect(map.get("see-b")).toBe("2026-10-22T10:00:00.000Z");
  });
});

describe("sessionForToday", () => {
  const date = day(26);
  const format = formatForDay(date);

  it("offers a session in today's format by default", () => {
    expect(sessionForToday(SESSIONS, { date })?.format).toBe(format);
  });

  it("keeps showing the session opened earlier today", () => {
    const first = sessionForToday(SESSIONS, { date, format: "see" })!;
    const lastOpened = new Map([[first.id, day(26, 7).toISOString()]]);
    expect(sessionForToday(SESSIONS, { date, format: "see", lastOpened })?.id).toBe(first.id);
  });

  it("shows the most recent of several sessions opened today", () => {
    const lastOpened = new Map([
      ["see-a", day(26, 7).toISOString()],
      ["see-c", day(26, 9).toISOString()],
      ["see-b", day(26, 8).toISOString()],
    ]);
    expect(sessionForToday(SESSIONS, { date, format: "see", lastOpened })?.id).toBe("see-c");
  });

  it("offers something fresh on a new day", () => {
    const yesterday = sessionForToday(SESSIONS, { date: day(25), format: "see" })!;
    const lastOpened = new Map([[yesterday.id, day(25, 20).toISOString()]]);
    expect(sessionForToday(SESSIONS, { date, format: "see", lastOpened })?.id).not.toBe(yesterday.id);
  });

  it("ignores sessions opened today in other formats", () => {
    const lastOpened = new Map([["reflect-a", day(26, 7).toISOString()]]);
    expect(sessionForToday(SESSIONS, { date, format: "see", lastOpened })?.format).toBe("see");
  });

  it("works for every format", () => {
    for (const f of CONNECT_FORMATS) expect(sessionForToday(SESSIONS, { date, format: f })?.format).toBe(f);
  });
});

describe("differentSession", () => {
  const date = day(26);

  it("offers another session in the same format", () => {
    const current = SESSIONS[0];
    const next = differentSession(SESSIONS, { date, current });
    expect(next?.format).toBe("see");
    expect(next?.id).not.toBe(current.id);
  });

  it("offers nothing when the format has only one session", () => {
    const only = SESSIONS.find((s) => s.format === "reflect")!;
    expect(hasAnotherSession(SESSIONS, only)).toBe(false);
    expect(differentSession(SESSIONS, { date, current: only })).toBeUndefined();
  });

  it("works through every session in a format before repeating one", () => {
    const lastOpened = new Map<string, string>();
    let time = day(26, 8).getTime();
    let current = sessionForToday(SESSIONS, { date, format: "see", lastOpened })!;
    lastOpened.set(current.id, new Date(time).toISOString());
    const seen = [current.id];
    for (let i = 0; i < 2; i++) {
      current = differentSession(SESSIONS, { date, current, lastOpened })!;
      time += 60_000;
      lastOpened.set(current.id, new Date(time).toISOString());
      seen.push(current.id);
    }
    expect(new Set(seen)).toEqual(new Set(["see-a", "see-b", "see-c"]));
    // The next one is the session opened longest ago.
    expect(differentSession(SESSIONS, { date, current, lastOpened })?.id).toBe(seen[0]);
  });
});

describe("Connect explorations", () => {
  const now = new Date("2026-10-26T15:00:00.000Z");

  it("records a first opening as a valid exploration with nothing but times", () => {
    const record = openedExploration(undefined, "jesus-wept", now);
    expect(explorationSchema.safeParse(record).success).toBe(true);
    expect(record).toMatchObject({
      id: "connect:jesus-wept",
      kind: "connect",
      contentId: "jesus-wept",
      firstAt: now.toISOString(),
      updatedAt: now.toISOString(),
      lastOpenedAt: now.toISOString(),
      note: "",
    });
  });

  it("keeps the first-opened time and the note when opened again, and doesn't count the opening as an edit", () => {
    const earlier = { ...exploration("connect", "jesus-wept", "2026-10-20T10:00:00.000Z"), note: "A private thought" };
    const record = openedExploration(earlier, "jesus-wept", now);
    expect(explorationSchema.safeParse(record).success).toBe(true);
    expect(record.firstAt).toBe("2026-10-20T10:00:00.000Z");
    // A backup merge keeps the more recently updated copy: opening mustn't outrank a copy with a newer note.
    expect(record.updatedAt).toBe("2026-10-20T10:00:00.000Z");
    expect(record.lastOpenedAt).toBe(now.toISOString());
    expect(record.note).toBe("A private thought");
  });

  it("saves a private note as an edit", () => {
    const record = explorationWithNote(undefined, "jesus-wept", "He wept with them.", now);
    expect(explorationSchema.safeParse(record).success).toBe(true);
    expect(record.note).toBe("He wept with them.");
    expect(explorationWithNote(record, "jesus-wept", "", now).note).toBe("");

    const earlier = exploration("connect", "jesus-wept", "2026-10-20T10:00:00.000Z");
    const edited = explorationWithNote(earlier, "jesus-wept", "Later thought", now);
    expect(edited).toMatchObject({ firstAt: "2026-10-20T10:00:00.000Z", updatedAt: now.toISOString(), lastOpenedAt: now.toISOString() });
  });
});
