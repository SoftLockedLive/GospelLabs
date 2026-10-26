/**
 * Deterministic shuffling for activity options. Authors often list options in
 * answer order (meanings beside their terms, fragments in solution order), so
 * showing them as written would give answers away. The order depends only on
 * a seed (the activity id), so it is stable across renders, server and client,
 * and visits, and never matches the authored order.
 */

/** 32-bit FNV-1a hash of a string. */
function hash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: a small, well-distributed PRNG. */
function random(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A copy of `items` in a seeded random order that differs from the original whenever it can. */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const result = [...items];
  const next = random(hash(seed));
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  if (result.length > 1 && result.every((item, i) => item === items[i])) result.push(result.shift() as T);
  return result;
}
