import { describe, expect, it } from "vitest";
import {
  centerOn,
  clampZoom,
  easeOutCubic,
  fitBounds,
  interpolate,
  isInView,
  MAX_FIT_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  panBy,
  screenToWorld,
  wheelZoomFactor,
  worldToScreen,
  zoomAround,
} from "./viewport";

describe("viewport", () => {
  const view = { x: 100, y: 50, k: 2 };

  it("converts between world and screen coordinates", () => {
    expect(worldToScreen(view, { x: 10, y: 5 })).toEqual({ x: 120, y: 60 });
    expect(screenToWorld(view, { x: 120, y: 60 })).toEqual({ x: 10, y: 5 });
  });

  it("clamps zoom and survives bad input", () => {
    expect(clampZoom(100)).toBe(MAX_ZOOM);
    expect(clampZoom(0)).toBe(MIN_ZOOM);
    expect(clampZoom(Number.NaN)).toBe(1);
  });

  it("zooms around an anchor without moving it", () => {
    const anchor = { x: 300, y: 200 };
    const before = screenToWorld(view, anchor);
    const zoomed = zoomAround(view, 1.25, anchor);
    expect(zoomed.k).toBeCloseTo(2.5);
    const after = screenToWorld(zoomed, anchor);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it("pans by screen pixels", () => {
    expect(panBy(view, -10, 20)).toEqual({ x: 90, y: 70, k: 2 });
  });

  it("fits bounds inside the canvas, centered, without blowing up small maps", () => {
    const fit = fitBounds({ minX: -100, minY: -50, maxX: 100, maxY: 50 }, 800, 400, 0);
    expect(fit.k).toBe(MAX_FIT_ZOOM);
    expect(worldToScreen(fit, { x: 0, y: 0 })).toEqual({ x: 400, y: 200 });

    const big = fitBounds({ minX: 0, minY: 0, maxX: 4000, maxY: 1000 }, 800, 400, 0);
    expect(big.k).toBeCloseTo(0.2);
    const corner = worldToScreen(big, { x: 4000, y: 1000 });
    expect(corner.x).toBeCloseTo(800);
    expect(corner.y).toBeLessThanOrEqual(400);
  });

  it("centers on a point, optionally at a new zoom", () => {
    const centered = centerOn(view, { x: 10, y: 10 }, 400, 300, 1);
    expect(worldToScreen(centered, { x: 10, y: 10 })).toEqual({ x: 200, y: 150 });
  });

  it("knows whether a point is comfortably on screen", () => {
    const identity = { x: 0, y: 0, k: 1 };
    expect(isInView(identity, { x: 200, y: 150 }, 400, 300)).toBe(true);
    expect(isInView(identity, { x: 10, y: 150 }, 400, 300)).toBe(false);
    expect(isInView(identity, { x: 500, y: 150 }, 400, 300)).toBe(false);
  });

  it("interpolates and eases", () => {
    expect(interpolate({ x: 0, y: 0, k: 1 }, { x: 10, y: 20, k: 2 }, 0.5)).toEqual({ x: 5, y: 10, k: 1.5 });
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(2)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });

  it("turns wheel deltas into gentle zoom factors", () => {
    expect(wheelZoomFactor(-100)).toBeGreaterThan(1);
    expect(wheelZoomFactor(100)).toBeLessThan(1);
    expect(wheelZoomFactor(100000)).toBe(wheelZoomFactor(120));
    expect(wheelZoomFactor(3, 1)).toBe(wheelZoomFactor(48));
    expect(wheelZoomFactor(-10, 0, true)).toBeGreaterThan(wheelZoomFactor(-10));
  });
});
