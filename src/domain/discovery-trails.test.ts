import { describe, expect, it } from "vitest";
import { parseDiscoveryTrails, quotationsIn } from "./discovery-trails";

const step = (id: string, extra: Record<string, unknown> = {}) => ({ id, title: `Title ${id}`, question: `${id}?`, ...extra });
const trail = (extra: Record<string, unknown> = {}) => ({
  id: "trail-a",
  questionId: "question-a",
  title: "Trail A",
  steps: [step("one"), step("two")],
  ...extra,
});
const file = (trails: unknown[]) => ({ version: 1, trails });

describe("parseDiscoveryTrails", () => {
  it("accepts a valid trail and fills in optional lists", () => {
    const { trails, issues } = parseDiscoveryTrails(file([trail()]));
    expect(issues).toEqual([]);
    expect(trails[0].steps[0]).toEqual({
      ...step("one"),
      references: [],
      stated: [],
      interpretation: [],
      reflection: [],
      connections: [],
    });
  });

  it("accepts references, connections, and a section to continue in", () => {
    const steps = [
      step("one", {
        references: [{ label: "Mark 2:5–12", type: "scripture", url: "https://www.churchofjesuschrist.org/study/x" }],
        connections: [{ stepId: "two", note: "Compare." }],
        recordIn: "analysis",
      }),
      step("two"),
    ];
    expect(parseDiscoveryTrails(file([trail({ steps })])).issues).toEqual([]);
  });

  it.each([
    ["an unknown field", trail({ conclusion: "The answer is…" }), ""],
    ["a step without a guiding question", trail({ steps: [{ id: "one", title: "One" }, step("two")] }), "steps.0.question"],
    ["a single step", trail({ steps: [step("one")] }), "steps"],
    ["duplicate step ids", trail({ steps: [step("one"), step("one")] }), "steps.1.id"],
    [
      "a connection to a missing step",
      trail({ steps: [step("one", { connections: [{ stepId: "nine", note: "n" }] }), step("two")] }),
      "steps.0.connections.0.stepId",
    ],
    [
      "a step connected to itself",
      trail({ steps: [step("one", { connections: [{ stepId: "one", note: "n" }] }), step("two")] }),
      "steps.0.connections.0.stepId",
    ],
    [
      "a reference outside churchofjesuschrist.org",
      trail({ steps: [step("one", { references: [{ label: "X", type: "other", url: "https://example.org" }] }), step("two")] }),
      "steps.0.references.0.url",
    ],
    ["an unknown section", trail({ steps: [step("one", { recordIn: "summary" }), step("two")] }), "steps.0.recordIn"],
  ])("rejects %s and says where", (_name, entry, path) => {
    const { trails, issues } = parseDiscoveryTrails(file([entry]));
    expect(trails).toEqual([]);
    expect(issues[0]).toContain("trails[0] (trail-a)");
    if (path) expect(issues[0]).toContain(`→ ${path}:`);
  });

  it("allows one trail per id and per question", () => {
    const { trails, issues } = parseDiscoveryTrails(
      file([trail(), trail({ questionId: "question-b" }), trail({ id: "trail-b" })]),
    );
    expect(trails.map((item) => item.id)).toEqual(["trail-a"]);
    expect(issues).toEqual([
      "trails[1] (trail-a): duplicate id",
      'trails[2] (trail-b): question "question-a" already has a trail',
    ]);
  });

  it("checks that each trail's question exists when given the question bank's ids", () => {
    const { issues } = parseDiscoveryTrails(file([trail()]), { questionIds: new Set(["other"]) });
    expect(issues).toEqual(['trails[0] (trail-a) → questionId: no question "question-a" in the question bank']);
  });

  it("rejects an unknown file version", () => {
    expect(parseDiscoveryTrails({ version: 2, trails: [] }).issues).toEqual(["version must be 1"]);
  });
});

describe("quotationsIn", () => {
  it("finds text in curly double quotes and ignores single quotes", () => {
    expect(quotationsIn("He said, “Son, thy sins be forgiven thee” (verse 5). The word ‘forgive’ is absent.")).toEqual([
      "Son, thy sins be forgiven thee",
    ]);
  });
});
