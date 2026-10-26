/**
 * Pan and zoom math for the Discovery Map canvas. A viewport maps world
 * (layout) coordinates to screen pixels: screen = world × k + (x, y).
 */
import type { Bounds, Point } from "@/domain/study/graph-layout";

export interface Viewport {
  x: number;
  y: number;
  k: number;
}

export const MIN_ZOOM = 0.15;
export const MAX_ZOOM = 2.5;
/** The largest zoom used when fitting the map, so a small map isn't blown up. */
export const MAX_FIT_ZOOM = 1.15;

export const clampZoom = (k: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number.isFinite(k) ? k : 1));

export const worldToScreen = (view: Viewport, point: Point): Point => ({ x: point.x * view.k + view.x, y: point.y * view.k + view.y });

export const screenToWorld = (view: Viewport, point: Point): Point => ({ x: (point.x - view.x) / view.k, y: (point.y - view.y) / view.k });

/** Zooms by `factor`, keeping the screen point `anchor` fixed. */
export function zoomAround(view: Viewport, factor: number, anchor: Point): Viewport {
  const k = clampZoom(view.k * factor);
  const world = screenToWorld(view, anchor);
  return { k, x: anchor.x - world.x * k, y: anchor.y - world.y * k };
}

export const panBy = (view: Viewport, dx: number, dy: number): Viewport => ({ ...view, x: view.x + dx, y: view.y + dy });

/** A viewport that shows all of `bounds` inside a width × height canvas, with padding. */
export function fitBounds(bounds: Bounds, width: number, height: number, padding = 32): Viewport {
  const w = Math.max(1, bounds.maxX - bounds.minX);
  const h = Math.max(1, bounds.maxY - bounds.minY);
  const availableW = Math.max(1, width - padding * 2);
  const availableH = Math.max(1, height - padding * 2);
  const k = clampZoom(Math.min(MAX_FIT_ZOOM, availableW / w, availableH / h));
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  return { k, x: width / 2 - cx * k, y: height / 2 - cy * k };
}

/** Moves the view so `world` sits at the canvas center (optionally at a new zoom). */
export function centerOn(view: Viewport, world: Point, width: number, height: number, k = view.k): Viewport {
  const zoom = clampZoom(k);
  return { k: zoom, x: width / 2 - world.x * zoom, y: height / 2 - world.y * zoom };
}

/** True if `world` is on screen with at least `margin` pixels to spare. */
export function isInView(view: Viewport, world: Point, width: number, height: number, margin = 48): boolean {
  const { x, y } = worldToScreen(view, world);
  return x >= margin && y >= margin && x <= width - margin && y <= height - margin;
}

/** Interpolates between two viewports (t from 0 to 1), for gentle transitions. */
export function interpolate(from: Viewport, to: Viewport, t: number): Viewport {
  const mix = (a: number, b: number) => a + (b - a) * t;
  return { x: mix(from.x, to.x), y: mix(from.y, to.y), k: mix(from.k, to.k) };
}

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

/** Zoom factor for a wheel event's delta (pixels), gentle for mice and trackpads alike. */
export function wheelZoomFactor(deltaY: number, deltaMode = 0, pinch = false): number {
  const pixels = deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * 400 : deltaY;
  const clamped = Math.max(-120, Math.min(120, pixels));
  return Math.exp(-clamped * (pinch ? 0.01 : 0.0022));
}
