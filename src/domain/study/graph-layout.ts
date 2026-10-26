/**
 * A small, deterministic force-directed layout for the Discovery Map.
 *
 * The same nodes and links always produce the same positions, whatever order
 * they arrive in: nodes are sorted by id, starting positions are derived from
 * a hash of each id (no Math.random, no trigonometry), and the simulation
 * runs a fixed number of iterations. Forces, in the spirit of d3-force:
 *
 *   - many-body repulsion between every pair (O(n²); fine for a few hundred nodes),
 *   - springs along links, weaker for nodes with many links,
 *   - a gentle pull toward the center, so separate clusters stay near each other,
 *   - collision avoidance using each node's radius (which includes room for its label),
 *
 * followed by a few collision-only passes so nodes never overlap. Output is
 * centered on the origin and rounded to a tenth of a unit.
 */

export interface LayoutNode {
  id: string;
  /** Room the node needs (its shape plus label), used for collision avoidance. Default 24. */
  radius?: number;
}

export interface LayoutLink {
  source: string;
  target: string;
  /** Spring stiffness multiplier (default 1). Use < 1 for structural links. */
  strength?: number;
  /** Preferred length multiplier (default 1). */
  length?: number;
}

export interface LayoutOptions {
  /** Preferred link length (default 120). */
  linkDistance?: number;
  /** Many-body strength; negative repels (default −(linkDistance²) / 40). */
  charge?: number;
  /** Simulation iterations (default depends on node count). */
  iterations?: number;
  /** Extra seed mixed into the starting positions (default 0). */
  seed?: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface GraphLayout {
  positions: Map<string, Point>;
  /** Bounds of every node's collision circle. */
  bounds: Bounds;
}

/** 32-bit FNV-1a hash. */
export function hashString(value: string, seed = 0): number {
  let hash = (0x811c9dc5 ^ seed) >>> 0;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Mulberry32: a tiny seeded generator, used for deterministic jitter. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEFAULT_RADIUS = 24;
const round = (value: number) => Math.round(value * 10) / 10 || 0;

function defaultIterations(count: number): number {
  if (count <= 60) return 320;
  if (count <= 150) return 260;
  return 200;
}

export function layoutGraph(nodes: readonly LayoutNode[], links: readonly LayoutLink[], options: LayoutOptions = {}): GraphLayout {
  const linkDistance = options.linkDistance ?? 120;
  const charge = options.charge ?? -(linkDistance * linkDistance) / 40;
  const seed = options.seed ?? 0;

  // Canonical order, so input order never matters.
  const unique = new Map<string, number>();
  for (const node of nodes) {
    const radius = Number.isFinite(node.radius) && (node.radius ?? 0) > 0 ? (node.radius as number) : DEFAULT_RADIUS;
    unique.set(node.id, Math.max(unique.get(node.id) ?? 0, radius));
  }
  const ids = [...unique.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const n = ids.length;
  const positions = new Map<string, Point>();
  if (n === 0) return { positions, bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } };

  const index = new Map(ids.map((id, i) => [id, i]));
  const radius = Float64Array.from(ids, (id) => unique.get(id) ?? DEFAULT_RADIUS);

  // Links: drop self-links, unknown ends, and duplicates (keeping the strongest).
  const linkMap = new Map<string, { a: number; b: number; strength: number; length: number }>();
  for (const link of links) {
    const a = index.get(link.source);
    const b = index.get(link.target);
    if (a === undefined || b === undefined || a === b) continue;
    const [lo, hi] = a < b ? [a, b] : [b, a];
    const key = `${lo},${hi}`;
    const strength = Number.isFinite(link.strength) ? Math.max(0, link.strength as number) : 1;
    const length = Number.isFinite(link.length) && (link.length as number) > 0 ? (link.length as number) : 1;
    const existing = linkMap.get(key);
    if (!existing || strength > existing.strength) linkMap.set(key, { a: lo, b: hi, strength, length });
  }
  const linkList = [...linkMap.entries()].sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0)).map(([, link]) => link);
  const degree = new Float64Array(n);
  for (const link of linkList) {
    degree[link.a]++;
    degree[link.b]++;
  }

  // Starting positions: hashed into a square that grows with the node count.
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  const vx = new Float64Array(n);
  const vy = new Float64Array(n);
  const spread = linkDistance * Math.sqrt(n) * 0.6;
  for (let i = 0; i < n; i++) {
    const random = seededRandom(hashString(ids[i], seed));
    x[i] = (random() * 2 - 1) * spread;
    y[i] = (random() * 2 - 1) * spread;
  }
  const jitter = seededRandom(hashString(`${n}:${linkList.length}`, seed));
  const nudge = () => (jitter() - 0.5) * 1e-3;

  const iterations = Math.max(1, Math.floor(options.iterations ?? defaultIterations(n)));
  const alphaMin = 0.001;
  const alphaDecay = 1 - Math.pow(alphaMin, 1 / iterations);
  const velocityDecay = 0.4;
  const gravity = 0.02;
  let alpha = 1;

  function collide(strength: number) {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = x[j] + vx[j] - (x[i] + vx[i]);
        let dy = y[j] + vy[j] - (y[i] + vy[i]);
        const min = radius[i] + radius[j];
        let d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        if (d2 === 0) {
          dx = nudge();
          dy = nudge();
          d2 = dx * dx + dy * dy;
        }
        const d = Math.sqrt(d2);
        const overlap = ((min - d) / d) * strength;
        const ri = radius[i] * radius[i];
        const rj = radius[j] * radius[j];
        const share = rj / (ri + rj);
        vx[i] -= dx * overlap * share;
        vy[i] -= dy * overlap * share;
        vx[j] += dx * overlap * (1 - share);
        vy[j] += dy * overlap * (1 - share);
      }
    }
  }

  for (let step = 0; step < iterations; step++) {
    alpha += (alphaMin - alpha) * alphaDecay;

    // Springs along links
    for (const link of linkList) {
      const { a, b } = link;
      let dx = x[b] + vx[b] - x[a] - vx[a];
      let dy = y[b] + vy[b] - y[a] - vy[a];
      if (dx === 0 && dy === 0) {
        dx = nudge();
        dy = nudge();
      }
      const d = Math.sqrt(dx * dx + dy * dy);
      const target = linkDistance * link.length + (radius[a] + radius[b]) * 0.25;
      const k = ((d - target) / d) * alpha * (link.strength / Math.min(degree[a], degree[b]));
      const bias = degree[a] / (degree[a] + degree[b]);
      vx[b] -= dx * k * bias;
      vy[b] -= dy * k * bias;
      vx[a] += dx * k * (1 - bias);
      vy[a] += dy * k * (1 - bias);
    }

    // Many-body repulsion
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = x[j] - x[i];
        let dy = y[j] - y[i];
        let d2 = dx * dx + dy * dy;
        if (d2 === 0) {
          dx = nudge();
          dy = nudge();
          d2 = dx * dx + dy * dy;
        }
        // Avoid huge forces at very short range (collision handles overlaps).
        const floor = radius[i] * radius[j];
        if (d2 < floor) d2 = floor;
        const w = (charge * alpha) / d2;
        vx[i] += dx * w;
        vy[i] += dy * w;
        vx[j] -= dx * w;
        vy[j] -= dy * w;
      }
    }

    // Gravity toward the center
    for (let i = 0; i < n; i++) {
      vx[i] -= x[i] * gravity * alpha;
      vy[i] -= y[i] * gravity * alpha;
    }

    collide(0.7);

    for (let i = 0; i < n; i++) {
      vx[i] *= 1 - velocityDecay;
      vy[i] *= 1 - velocityDecay;
      x[i] += vx[i];
      y[i] += vy[i];
    }
  }

  // Settle: remove any remaining overlap.
  for (let pass = 0; pass < 40; pass++) {
    vx.fill(0);
    vy.fill(0);
    collide(1);
    let moved = false;
    for (let i = 0; i < n; i++) {
      if (vx[i] !== 0 || vy[i] !== 0) moved = true;
      x[i] += vx[i];
      y[i] += vy[i];
    }
    if (!moved) break;
  }

  // Center on the origin.
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(x[i]) || !Number.isFinite(y[i])) {
      // Never expected; fall back to the starting point rather than emit NaN.
      const random = seededRandom(hashString(ids[i], seed));
      x[i] = (random() * 2 - 1) * spread;
      y[i] = (random() * 2 - 1) * spread;
    }
    cx += x[i];
    cy += y[i];
  }
  cx /= n;
  cy /= n;

  const bounds: Bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (let i = 0; i < n; i++) {
    const point = { x: round(x[i] - cx), y: round(y[i] - cy) };
    positions.set(ids[i], point);
    bounds.minX = Math.min(bounds.minX, point.x - radius[i]);
    bounds.minY = Math.min(bounds.minY, point.y - radius[i]);
    bounds.maxX = Math.max(bounds.maxX, point.x + radius[i]);
    bounds.maxY = Math.max(bounds.maxY, point.y + radius[i]);
  }
  return { positions, bounds };
}

// --- Keyboard navigation --------------------------------------------------------

export type Direction = "up" | "down" | "left" | "right";

const DIRECTION_VECTORS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/**
 * The node to move to when an arrow key is pressed (screen coordinates: y
 * grows downward). Prefers a connected neighbor in that direction, then the
 * nearest node within 45° of it, then the nearest in that half of the plane.
 */
export function nodeInDirection<T extends string>(
  current: T,
  direction: Direction,
  positions: ReadonlyMap<T, Point>,
  candidates: Iterable<T>,
  neighbors: ReadonlySet<T> = new Set(),
): T | null {
  const origin = positions.get(current);
  if (!origin) return null;
  const { x: ux, y: uy } = DIRECTION_VECTORS[direction];

  type Best = { id: T; score: number } | null;
  let bestNeighbor: Best = null;
  let bestCone: Best = null;
  let bestHalf: Best = null;
  const better = (best: Best, id: T, score: number) =>
    !best || score < best.score || (score === best.score && id < best.id);

  for (const id of candidates) {
    if (id === current) continue;
    const point = positions.get(id);
    if (!point) continue;
    const dx = point.x - origin.x;
    const dy = point.y - origin.y;
    const along = dx * ux + dy * uy;
    if (along <= 0) continue;
    const across = Math.abs(dx * uy - dy * ux);
    const score = along + across * 2;
    // Within 45° either side of the arrow's direction: the four arrows split the plane into quadrants.
    const inCone = across <= along;
    if (inCone && neighbors.has(id) && better(bestNeighbor, id, score)) bestNeighbor = { id, score };
    if (inCone && better(bestCone, id, score)) bestCone = { id, score };
    if (better(bestHalf, id, score)) bestHalf = { id, score };
  }
  return (bestNeighbor ?? bestCone ?? bestHalf)?.id ?? null;
}
