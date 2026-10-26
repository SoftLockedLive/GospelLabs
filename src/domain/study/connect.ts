/**
 * Connect with Christ rotation. Formats rotate by day (See, Understand,
 * Reflect); within a format the session opened least recently comes first.
 * Nothing here counts sessions, measures time, or tracks streaks.
 */
import type { ConnectFormat, ConnectSession } from "./content-schema";
import { CONNECT_FORMATS } from "./content-schema";

/** Whole days since 1970-01-01 in local time, so the format changes at local midnight. */
export function localDayIndex(date: Date): number {
  return Math.floor((date.getTime() - date.getTimezoneOffset() * 60_000) / 86_400_000);
}

export function formatForDay(date: Date): ConnectFormat {
  return CONNECT_FORMATS[localDayIndex(date) % CONNECT_FORMATS.length];
}

/**
 * The session to offer. `lastOpened` maps session id → ISO time it was last
 * opened (from explorations). Never-opened sessions come first, in an order
 * that shifts by day so the first session isn't always the same. If every
 * session in the format is excluded, the excluded one is returned; callers
 * offering "a different one" should check for that.
 */
export function pickConnectSession<T extends Pick<ConnectSession, "id" | "format">>(
  sessions: readonly T[],
  options: { date: Date; format?: ConnectFormat; lastOpened?: ReadonlyMap<string, string>; exclude?: string },
): T | undefined {
  const format = options.format ?? formatForDay(options.date);
  const candidates = sessions.filter((session) => session.format === format && session.id !== options.exclude);
  if (candidates.length === 0) return sessions.find((session) => session.format === format);
  const day = localDayIndex(options.date);
  const offset = day % candidates.length;
  const rotated = [...candidates.slice(offset), ...candidates.slice(0, offset)];
  const opened = (session: T) => options.lastOpened?.get(session.id);
  return [...rotated].sort((a, b) => {
    const ta = opened(a);
    const tb = opened(b);
    if (!ta && !tb) return 0;
    if (!ta) return -1;
    if (!tb) return 1;
    return Date.parse(ta) - Date.parse(tb);
  })[0];
}
