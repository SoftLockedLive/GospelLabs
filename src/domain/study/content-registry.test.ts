import { describe, expect, it } from "vitest";
import { buildContentRegistry, nodeLabel, resolveActivity } from "./content-registry";
import { stepSchema } from "./content-schema";
import { SAMPLE_CONTENT, SAMPLE_INVESTIGATION } from "./test-fixtures";

const clone = <T>(value: T): T => structuredClone(value);

function withInvestigation(change: (investigation: typeof SAMPLE_INVESTIGATION) => void) {
  const investigation = clone(SAMPLE_INVESTIGATION);
  change(investigation);
  return { ...SAMPLE_CONTENT, investigations: { "sample-investigation": investigation } };
}

describe("buildContentRegistry", () => {
  it("accepts the complete sample investigation", () => {
    const { registry, issues } = buildContentRegistry(SAMPLE_CONTENT);
    expect(issues).toEqual([]);
    expect(registry.investigations).toHaveLength(1);
    expect(registry.sources.get("alma-7-11-12")?.verses).toHaveLength(2);
  });

  it("skips placeholders and lists them", () => {
    const { registry, issues } = buildContentRegistry({
      ...SAMPLE_CONTENT,
      attributes: { meekness: { placeholder: true, id: "meekness" } },
    });
    expect(issues).toEqual([]);
    expect(registry.placeholders).toEqual(["attributes/meekness.json"]);
  });

  it("requires every core step of a ready investigation to offer all four difficulties", () => {
    const { issues } = buildContentRegistry(
      withInvestigation((investigation) => {
        delete (investigation.steps[0].activities as Record<string, unknown>).complex;
      }),
    );
    expect(issues.map((issue) => issue.message).join("\n")).toMatch(/missing complex/);
  });

  it("reports unknown sources, concepts, branches, and Map nodes", () => {
    const { issues } = buildContentRegistry(
      withInvestigation((investigation) => {
        investigation.steps[0].sourceIds = ["nope"];
        investigation.steps[0].concepts = ["not-a-concept"];
        investigation.steps[0].branchIds = ["missing-branch"];
        investigation.steps[0].connections![0].to = "concept:unknown";
      }),
    );
    const messages = issues.map((issue) => issue.message).join("\n");
    expect(messages).toMatch(/unknown source "nope"/);
    expect(messages).toMatch(/unknown concept "not-a-concept"/);
    expect(messages).toMatch(/unknown branch "missing-branch"/);
    expect(messages).toMatch(/node "concept:unknown"/);
  });

  it("rejects highlight chunks that don't reproduce the verse exactly", () => {
    const { issues } = buildContentRegistry(
      withInvestigation((investigation) => {
        const easy = investigation.steps[0].activities!.easy as { chunks: { verse: number; text: string }[] };
        easy.chunks[0] = { verse: 12, text: "And he took upon him death," };
      }),
    );
    expect(issues.some((issue) => /don't join to the verse text/.test(issue.message))).toBe(true);
  });

  it("rejects a shared source declared differently in two files", () => {
    const other = clone(SAMPLE_INVESTIGATION);
    other.id = "other";
    other.branches = [];
    other.steps.forEach((step) => (step.branchIds = []));
    (other.sources[0] as { label: string }).label = "Alma 7:11–12 (changed)";
    const { issues } = buildContentRegistry({ ...SAMPLE_CONTENT, investigations: { "sample-investigation": SAMPLE_INVESTIGATION, other } });
    expect(issues.some((issue) => /differs from its declaration/.test(issue.message))).toBe(true);
  });

  it("requires file names to match ids", () => {
    const { issues } = buildContentRegistry({ ...SAMPLE_CONTENT, investigations: { "wrong-name": SAMPLE_INVESTIGATION } });
    expect(issues.some((issue) => /must match the file name/.test(issue.message))).toBe(true);
  });

  it("labels nodes from content", () => {
    const { registry } = buildContentRegistry(SAMPLE_CONTENT);
    expect(nodeLabel(registry, "scripture:alma-7-11-12")).toBe("Alma 7:11–12");
    expect(nodeLabel(registry, "concept:atonement")).toBe("Atonement of Jesus Christ");
    expect(nodeLabel(registry, "question:friends")).toBe("What does it mean that He calls us friends?");
    expect(nodeLabel(registry, "question:primary-christ")).toMatch(/Son of God/);
  });
});

describe("resolveActivity", () => {
  const step = stepSchema.parse(SAMPLE_INVESTIGATION.branches[0].steps[0]);

  it("uses the nearest available difficulty, preferring easier on ties", () => {
    expect(resolveActivity(step, "medium").difficulty).toBe("medium");
    expect(resolveActivity(step, "easy").difficulty).toBe("medium");
    expect(resolveActivity(step, "complex").difficulty).toBe("medium");
  });

  it("uses a step's shared activity at any difficulty", () => {
    const reflect = stepSchema.parse(SAMPLE_INVESTIGATION.steps[2]);
    expect(resolveActivity(reflect, "hard").activity.type).toBe("reflect");
  });
});
