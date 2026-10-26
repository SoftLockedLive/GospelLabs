/**
 * Helpers around the Connect with Christ rotation (connect.ts): when each
 * session was last opened, which session to show today, "show me a different
 * one", and the Exploration record that remembers a session was opened.
 *
 * Only the fact that a session was opened is kept, so the rotation can offer
 * something fresh. Nothing here counts sessions, measures time spent, or
 * tracks streaks, and nothing is ever shown to the learner as a number.
 */
import { formatForDay, localDayIndex, pickConnectSession } from "./connect";
import type { ConnectFormat, ConnectSession } from "./content-schema";
import { explorationId, type Exploration } from "./user-data";

/** The fields the rotation reads. Lets callers pass lighter objects than whole sessions. */
export type ConnectSessionRef = Pick<ConnectSession, "id" | "format">;

/** pickConnectSession reads only `id` and `format`, so lighter session objects are safe to pass. */
function pick<T extends ConnectSessionRef>(sessions: readonly T[], options: Parameters<typeof pickConnectSession>[1]): T | undefined {
  return pickConnectSession(sessions as unknown as readonly ConnectSession[], options) as unknown as T | undefined;
}

/**
 * Session id → ISO time it was last opened, from the learner's Connect explorations. Records saved before
 * `lastOpenedAt` existed were stamped on every opening through updatedAt, so that stands in for it.
 */
export function lastOpenedBySession(
  explorations: readonly Pick<Exploration, "kind" | "contentId" | "updatedAt" | "lastOpenedAt">[],
): Map<string, string> {
  const lastOpened = new Map<string, string>();
  for (const record of explorations) {
    if (record.kind !== "connect") continue;
    const opened = record.lastOpenedAt ?? record.updatedAt;
    const current = lastOpened.get(record.contentId);
    if (!current || Date.parse(opened) > Date.parse(current)) lastOpened.set(record.contentId, opened);
  }
  return lastOpened;
}

/**
 * The session to show in a format today. If a session in that format was
 * already opened today, it is shown again, so leaving and coming back (or
 * reloading) keeps the learner's place. Otherwise the rotation offers the
 * session opened least recently.
 */
export function sessionForToday<T extends ConnectSessionRef>(
  sessions: readonly T[],
  options: { date: Date; format?: ConnectFormat; lastOpened?: ReadonlyMap<string, string> },
): T | undefined {
  const format = options.format ?? formatForDay(options.date);
  const today = localDayIndex(options.date);
  let openedToday: { session: T; at: number } | undefined;
  for (const session of sessions) {
    if (session.format !== format) continue;
    const opened = options.lastOpened?.get(session.id);
    const at = opened ? Date.parse(opened) : Number.NaN;
    if (Number.isNaN(at) || localDayIndex(new Date(at)) !== today) continue;
    if (!openedToday || at > openedToday.at) openedToday = { session, at };
  }
  return openedToday?.session ?? pick(sessions, { date: options.date, format, lastOpened: options.lastOpened });
}

/** True if the format has a session other than `current` to offer. */
export function hasAnotherSession(sessions: readonly ConnectSessionRef[], current: ConnectSessionRef): boolean {
  return sessions.some((session) => session.format === current.format && session.id !== current.id);
}

/** "Show me a different one": another session in the same format, opened least recently. */
export function differentSession<T extends ConnectSessionRef>(
  sessions: readonly T[],
  options: { date: Date; current: ConnectSessionRef; lastOpened?: ReadonlyMap<string, string> },
): T | undefined {
  if (!hasAnotherSession(sessions, options.current)) return undefined;
  return pick(sessions, {
    date: options.date,
    format: options.current.format,
    lastOpened: options.lastOpened,
    exclude: options.current.id,
  });
}

/**
 * The Exploration recording that a session was opened at `now`. Keeps the
 * first-opened time and the private note of an existing record; records
 * nothing else about the session. Opening isn't an edit, so an existing
 * record's updatedAt stays as it was (see explorationSchema).
 */
export function openedExploration(existing: Exploration | undefined, sessionId: string, now: Date): Exploration {
  const at = now.toISOString();
  if (existing) return { ...existing, lastOpenedAt: at };
  return {
    id: explorationId("connect", sessionId),
    kind: "connect",
    contentId: sessionId,
    firstAt: at,
    updatedAt: at,
    lastOpenedAt: at,
    completedActivities: [],
    vocabulary: [],
    highlights: [],
    note: "",
  };
}

/**
 * The same record with the learner's private note: an edit, so updatedAt moves. (Writing in a session also
 * means it is open.) The note is never required and never evaluated.
 */
export function explorationWithNote(existing: Exploration | undefined, sessionId: string, note: string, now: Date): Exploration {
  return { ...openedExploration(existing, sessionId, now), note, updatedAt: now.toISOString() };
}
