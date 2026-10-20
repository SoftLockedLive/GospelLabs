import { describe, expect, it } from "vitest";
import { EMPTY_LIBRARY_FILTERS, filterInvestigations } from "./library-filters";
import { evidenceInput, richInvestigation } from "./test-fixtures";

const prayer = richInvestigation("prayer", { title: "Meaningful prayer", category: "Worship", status: "concluded" });
const grace = richInvestigation("grace", {
  title: "Grace and works",
  question: "How does grace relate to effort?",
  category: "Doctrine of Christ",
  evidence: [{ ...evidenceInput({ sourceTitle: "2 Nephi 25:23", tags: ["atonement"] }), id: "e", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }],
  claims: [],
});
const all = [prayer, grace];
const ids = (overrides: Partial<typeof EMPTY_LIBRARY_FILTERS>) =>
  filterInvestigations(all, { ...EMPTY_LIBRARY_FILTERS, ...overrides }).map((i) => i.id);

describe("filterInvestigations", () => {
  it("returns everything without filters", () => {
    expect(ids({})).toEqual(["prayer", "grace"]);
  });

  it("searches title, question, and category", () => {
    expect(ids({ query: "PRAYER" })).toEqual(["prayer"]);
    expect(ids({ query: "effort" })).toEqual(["grace"]);
    expect(ids({ query: "worship" })).toEqual(["prayer"]);
  });

  it("searches evidence sources and tags", () => {
    expect(ids({ query: "nephi" })).toEqual(["grace"]);
    expect(ids({ query: "atonement" })).toEqual(["grace"]);
  });

  it("filters by status and combines with search", () => {
    expect(ids({ status: "concluded" })).toEqual(["prayer"]);
    expect(ids({ status: "concluded", query: "grace" })).toEqual([]);
  });
});
