import { describe, expect, it } from "vitest";
import {
  isInMore,
  isNavItemActive,
  LIBRARY_ITEM,
  MORE_ITEMS,
  NAV_GROUPS,
  NAV_ITEMS,
  TAB_ITEMS,
  HOME_ITEM,
  INVESTIGATE_ITEM,
} from "./nav-items";

describe("navigation", () => {
  it("matches Home only on the dashboard", () => {
    expect(isNavItemActive(HOME_ITEM, "/")).toBe(true);
    expect(isNavItemActive(HOME_ITEM, "/investigate")).toBe(false);
  });

  it("matches nested routes and extra prefixes", () => {
    expect(isNavItemActive(INVESTIGATE_ITEM, "/investigate/one-by-one")).toBe(true);
    expect(isNavItemActive(INVESTIGATE_ITEM, "/investigations/view")).toBe(false);
    expect(isNavItemActive(LIBRARY_ITEM, "/investigations/view")).toBe(true);
    expect(isNavItemActive(LIBRARY_ITEM, "/library")).toBe(true);
  });

  it("puts every destination in the tab bar or the More menu exactly once", () => {
    const phone = [...TAB_ITEMS, ...MORE_ITEMS].map((item) => item.href);
    expect(new Set(phone).size).toBe(phone.length);
    expect(new Set(phone)).toEqual(new Set(NAV_ITEMS.map((item) => item.href)));
  });

  it("keeps the 1.x research pages, with their names, under Research", () => {
    const research = NAV_GROUPS.find((group) => group.id === "research");
    expect(research?.items.map((item) => item.label)).toEqual(["Question Bank", "My Library"]);
  });

  it("marks More as current on pages it contains", () => {
    expect(isInMore("/questions/born-again")).toBe(true);
    expect(isInMore("/settings")).toBe(true);
    expect(isInMore("/notebook")).toBe(false);
    expect(isInMore("/")).toBe(false);
  });
});
