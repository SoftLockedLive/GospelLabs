import { describe, expect, it } from "vitest";
import { hashString, layoutGraph, nodeInDirection, seededRandom, type LayoutLink, type LayoutNode, type Point } from "./graph-layout";

const distance = (a: Point | undefined, b: Point | undefined) => {
  if (!a || !b) throw new Error("missing position");
  return Math.hypot(a.x - b.x, a.y - b.y);
};

/** A reproducible random graph: `count` nodes, roughly 1.5 links per node. */
function randomGraph(count: number, seed = 7): { nodes: LayoutNode[]; links: LayoutLink[] } {
  const random = seededRandom(seed);
  const nodes = Array.from({ length: count }, (_, i) => ({ id: `node-${i}`, radius: 18 + Math.floor(random() * 40) }));
  const links: LayoutLink[] = [];
  for (let i = 1; i < count; i++) {
    links.push({ source: `node-${i}`, target: `node-${Math.floor(random() * i)}` });
    if (random() < 0.5) links.push({ source: `node-${i}`, target: `node-${Math.floor(random() * count)}`, strength: 0.3 });
  }
  return { nodes, links };
}

describe("seeded helpers", () => {
  it("hash and random are deterministic", () => {
    expect(hashString("concept:atonement")).toBe(hashString("concept:atonement"));
    expect(hashString("concept:atonement")).not.toBe(hashString("concept:grace"));
    const a = seededRandom(42);
    const b = seededRandom(42);
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    expect(first.every((value) => value >= 0 && value < 1)).toBe(true);
  });
});

describe("layoutGraph", () => {
  it("handles empty and single-node graphs", () => {
    expect(layoutGraph([], []).positions.size).toBe(0);
    const single = layoutGraph([{ id: "a", radius: 20 }], []);
    expect(single.positions.get("a")).toEqual({ x: 0, y: 0 });
    expect(single.bounds).toEqual({ minX: -20, minY: -20, maxX: 20, maxY: 20 });
  });

  it("is deterministic for the same input, whatever order it arrives in", () => {
    const { nodes, links } = randomGraph(40);
    const first = layoutGraph(nodes, links);
    const second = layoutGraph(nodes, links);
    const shuffled = layoutGraph([...nodes].reverse(), [...links].reverse());
    expect([...second.positions]).toEqual([...first.positions]);
    expect(Object.fromEntries(shuffled.positions)).toEqual(Object.fromEntries(first.positions));
  });

  it("changes with the seed", () => {
    const { nodes, links } = randomGraph(12);
    expect(Object.fromEntries(layoutGraph(nodes, links, { seed: 1 }).positions)).not.toEqual(
      Object.fromEntries(layoutGraph(nodes, links, { seed: 2 }).positions),
    );
  });

  it("ignores self-links, duplicate links, and links to unknown nodes", () => {
    const nodes = [{ id: "a" }, { id: "b" }];
    const clean = layoutGraph(nodes, [{ source: "a", target: "b" }]);
    const messy = layoutGraph(nodes, [
      { source: "a", target: "b" },
      { source: "b", target: "a" },
      { source: "a", target: "a" },
      { source: "a", target: "ghost" },
    ]);
    expect(Object.fromEntries(messy.positions)).toEqual(Object.fromEntries(clean.positions));
  });

  it("produces finite coordinates centered near the origin", () => {
    const { nodes, links } = randomGraph(120);
    const { positions, bounds } = layoutGraph(nodes, links);
    expect(positions.size).toBe(120);
    let cx = 0;
    let cy = 0;
    for (const point of positions.values()) {
      expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true);
      cx += point.x / positions.size;
      cy += point.y / positions.size;
    }
    expect(Math.abs(cx)).toBeLessThan(1);
    expect(Math.abs(cy)).toBeLessThan(1);
    expect(Object.values(bounds).every(Number.isFinite)).toBe(true);
  });

  it("places connected nodes closer together than unconnected ones", () => {
    const nodes = ["a", "b", "c", "d", "e"].map((id) => ({ id, radius: 20 }));
    const { positions } = layoutGraph(nodes, [
      { source: "a", target: "b" },
      { source: "c", target: "d" },
    ]);
    const ab = distance(positions.get("a"), positions.get("b"));
    const cd = distance(positions.get("c"), positions.get("d"));
    for (const [p, q] of [
      ["a", "c"],
      ["a", "d"],
      ["b", "c"],
      ["b", "d"],
      ["a", "e"],
      ["c", "e"],
    ]) {
      const apart = distance(positions.get(p), positions.get(q));
      expect(ab).toBeLessThan(apart);
      expect(cd).toBeLessThan(apart);
    }
  });

  it("keeps nodes from overlapping", () => {
    const { nodes, links } = randomGraph(60, 3);
    const { positions } = layoutGraph(nodes, links);
    const radius = new Map(nodes.map((node) => [node.id, node.radius ?? 24]));
    let worst = 0;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i].id;
        const b = nodes[j].id;
        const gap = (radius.get(a) ?? 0) + (radius.get(b) ?? 0) - distance(positions.get(a), positions.get(b));
        worst = Math.max(worst, gap);
      }
    }
    // Allow rounding and the last pass's tiny residue.
    expect(worst).toBeLessThan(2);
  });

  it("lays out about 300 nodes quickly", () => {
    const { nodes, links } = randomGraph(300, 11);
    const started = performance.now();
    const { positions } = layoutGraph(nodes, links);
    const elapsed = performance.now() - started;
    expect(positions.size).toBe(300);
    expect([...positions.values()].every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true);
    expect(elapsed).toBeLessThan(3000);
  });
});

describe("nodeInDirection", () => {
  const positions = new Map<string, Point>([
    ["center", { x: 0, y: 0 }],
    ["right-near", { x: 100, y: 10 }],
    ["right-far", { x: 300, y: 0 }],
    ["up", { x: 10, y: -120 }],
    ["down-left", { x: -80, y: 150 }],
    ["left-steep", { x: -20, y: -200 }],
  ]);
  const all = [...positions.keys()];

  it("moves to the nearest node in the arrow's direction", () => {
    expect(nodeInDirection("center", "right", positions, all)).toBe("right-near");
    expect(nodeInDirection("center", "up", positions, all)).toBe("up");
    expect(nodeInDirection("center", "down", positions, all)).toBe("down-left");
  });

  it("prefers a connected neighbor in that direction", () => {
    expect(nodeInDirection("center", "right", positions, all, new Set(["right-far"]))).toBe("right-far");
  });

  it("falls back to the half-plane when nothing lies within 45°", () => {
    // Only "left-steep" (mostly up) and "down-left" (mostly down) lie to the left.
    expect(nodeInDirection("center", "left", positions, all)).toBe("down-left");
  });

  it("returns null when nothing lies that way, or the node is unknown", () => {
    expect(nodeInDirection("right-far", "right", positions, all)).toBeNull();
    expect(nodeInDirection("ghost", "left", positions, all)).toBeNull();
  });

  it("only considers the candidates given", () => {
    expect(nodeInDirection("center", "right", positions, ["center", "right-far"])).toBe("right-far");
  });
});
