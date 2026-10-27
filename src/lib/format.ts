const formatters = new Map<string, Intl.DateTimeFormat>();

/**
 * A date as the learner would write it, in their own time zone, so something
 * saved at 9 pm isn't dated tomorrow. Only learner data (from this device's
 * storage, read in the browser) is formatted, so there's no server-rendered
 * output to match. `timeZone` overrides the learner's (for tests).
 */
export function formatDate(iso: string, timeZone?: string): string {
  const key = timeZone ?? "";
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone });
    formatters.set(key, formatter);
  }
  return formatter.format(new Date(iso));
}
