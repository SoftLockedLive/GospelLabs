/**
 * Defensive readers for stored responses. A response comes back from
 * IndexedDB as `unknown`, possibly written against an older version of the
 * content, so every reader keeps only well-formed entries that refer to ids
 * the activity still has.
 */

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The field `key` of `value` if `value` is an object, else undefined. */
export const field = (value: unknown, key: string): unknown => (isRecord(value) ? value[key] : undefined);

/** Distinct strings from `value` that are in `allowed`, in their original order. */
export function stringList(value: unknown, allowed: ReadonlySet<string>): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const item of value) if (typeof item === "string" && allowed.has(item)) seen.add(item);
  return [...seen];
}

/** Entries of `value` whose key is in `keys` and whose value is a string in `values`. */
export function stringRecord(value: unknown, keys: ReadonlySet<string>, values: ReadonlySet<string>): Record<string, string> {
  const result: Record<string, string> = {};
  if (!isRecord(value)) return result;
  for (const [key, item] of Object.entries(value)) {
    if (keys.has(key) && typeof item === "string" && values.has(item)) result[key] = item;
  }
  return result;
}

export const idSet = (items: readonly { id: string }[]) => new Set(items.map((item) => item.id));

export const sameOrder = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((id, i) => id === b[i]);

export const sameSet = (a: readonly string[], b: readonly string[]) => {
  const set = new Set(a);
  return set.size === new Set(b).size && b.every((id) => set.has(id));
};

const NUMBER_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

/** "one phrase" / "two phrases" / "12 phrases", for feedback sentences. */
export const countOf = (n: number, singular: string, plural: string) => `${NUMBER_WORDS[n] ?? n} ${n === 1 ? singular : plural}`;

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
