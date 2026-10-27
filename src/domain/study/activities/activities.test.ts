import { describe, expect, it } from "vitest";
import { activitySchema, type ActivityOf, type ActivityType } from "../content-schema";
import { assembleSentence, fragmentOptions, moveFragment } from "./build-principle";
import { checkChoice, choiceOptions, toggleChoice } from "./choice";
import { canAnswerClue, examineClue } from "./clue";
import { VERDICT_FEEDBACK } from "./compare";
import { connectPair, DEFAULT_PAIR_CLUE, evidenceOptions, isOneToOne } from "./evidence-connect";
import { toggleChunk } from "./highlight";
import { check, emptyResponse, isCheckedActivity, isComplete, parseResponse, revealResponse } from "./index";
import { seededShuffle } from "./shuffle";
import { sortItems } from "./sort";
import { exampleOptions, matchTerm, meaningOptions } from "./vocab-match";

function make<T extends ActivityType>(type: T, raw: Record<string, unknown>): ActivityOf<T> {
  return activitySchema.parse({ type, id: `${type}-1`, prompt: "Prompt", hints: ["First hint", "Second hint"], explanation: "Because.", ...raw }) as ActivityOf<T>;
}

const evidence = make("evidence-connect", {
  left: {
    label: "Statement",
    items: [
      { id: "succor", text: "He suffered to know how to help." },
      { id: "love", text: "Laying down one's life is the greatest love." },
    ],
  },
  right: {
    label: "Evidence",
    items: [
      { id: "alma", text: "Alma 7:12" },
      { id: "john", text: "John 15:13" },
      { id: "decoy", text: "Genesis 1:1" },
    ],
  },
  pairs: [
    { left: "succor", right: "alma", because: "Alma says so.", clue: "Which verse speaks of knowing how to succor?" },
    { left: "love", right: "john", because: "John says so." },
  ],
});

const clueActivity = make("clue", {
  clues: [
    { id: "c1", title: "Verse 14", text: "A condition." },
    { id: "c2", title: "Verse 15", text: "A contrast." },
    { id: "c3", title: "Verse 16", text: "A choice." },
  ],
  minRevealed: 2,
  question: {
    id: "q",
    prompt: "What makes the difference?",
    options: [
      { id: "told", text: "Friends are told." },
      { id: "rank", text: "Friends rank higher.", feedback: "Look for what the servant doesn't know." },
    ],
    correct: ["told"],
  },
});

const principle = make("build-principle", {
  fragments: [
    { id: "a", text: "Jesus Christ took upon Him our pains" },
    { id: "b", text: "so that He would know how to succor us" },
    { id: "c", text: "because He had to learn from books" },
    { id: "d", text: "and our infirmities" },
  ],
  solution: ["a", "d", "b"],
  alternatives: [["a", "b"]],
  statement: "Jesus Christ took upon Him our pains and our infirmities so that He would know how to succor us.",
});

const compareActivity = make("compare", {
  perspectives: [
    { id: "p1", text: "He suffered to know how to help.", verdict: "supported", rationale: "Verse 12." },
    { id: "p2", text: "Alma explains how.", verdict: "beyond", rationale: "Not how." },
    { id: "p3", text: "Only for sins.", verdict: "contradicted", rationale: "Sicknesses too." },
  ],
});

const scripture = make("scripture-connect", {
  passages: ["alma-7-11-12", "john-15-13-15"],
  questions: [
    {
      id: "q1",
      prompt: "What do both passages show?",
      options: [
        { id: "love", text: "His love" },
        { id: "law", text: "The law", feedback: "Neither passage mentions the law." },
      ],
      correct: ["love"],
    },
    {
      id: "q2",
      prompt: "Which are true?",
      multiple: true,
      options: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
        { id: "c", text: "C" },
      ],
      correct: ["a", "b"],
    },
  ],
});

const vocab = make("vocab-match", {
  match: "both",
  pairs: [
    { id: "succor", term: "Succor", meaning: "To run to help", example: { text: "Alma 7:12", sourceId: "alma-7-11-12" } },
    { id: "infirmity", term: "Infirmity", meaning: "Weakness", example: { text: "Alma 7:12b", sourceId: "alma-7-11-12" } },
  ],
  extraMeanings: ["To judge"],
});

const sortActivity = make("sort", {
  categories: [
    { id: "v11", label: "Verse 11" },
    { id: "v12", label: "Verse 12" },
  ],
  items: [
    { id: "temptations", text: "Temptations", category: "v11", why: "Verse 11." },
    { id: "death", text: "Death", category: "v12", why: "Verse 12." },
    { id: "infirmities", text: "Infirmities", category: "v12", why: "Verse 12." },
  ],
});

const highlightActivity = make("highlight", {
  passage: "alma-7-11-12",
  chunks: [
    { verse: 12, text: "And he will take upon him death," },
    { verse: 12, text: "that he may loose the bands of death which bind his people;" },
    { verse: 12, text: "and he will take upon him their infirmities," },
    { verse: 12, text: "that his bowels may be filled with mercy, according to the flesh," },
    { verse: 12, text: "that he may know according to the flesh how to succor his people according to their infirmities." },
  ],
  targets: [3, 4],
});

const reflectActivity = activitySchema.parse({ type: "reflect", id: "r", prompt: "Ponder." }) as ActivityOf<"reflect">;

describe("seededShuffle", () => {
  it("is deterministic for a seed and keeps every item", () => {
    const items = ["a", "b", "c", "d", "e"];
    expect(seededShuffle(items, "seed")).toEqual(seededShuffle(items, "seed"));
    expect([...seededShuffle(items, "seed")].sort()).toEqual(items);
  });

  it("never returns the original order when there is more than one item", () => {
    for (let i = 0; i < 50; i++) expect(seededShuffle(["a", "b"], `seed-${i}`)).not.toEqual(["a", "b"]);
    expect(seededShuffle(["only"], "x")).toEqual(["only"]);
  });

  it("orders options so authored answer order isn't shown", () => {
    expect(fragmentOptions(principle).map((f) => f.id)).not.toEqual(["a", "b", "c", "d"]);
    expect(evidenceOptions(evidence).map((item) => item.id)).not.toEqual(["alma", "john", "decoy"]);
    expect(sortItems(sortActivity)).toHaveLength(3);
    expect(meaningOptions(vocab).map((o) => o.key).sort()).toEqual(["extra-0", "infirmity", "succor"]);
    expect(exampleOptions(vocab).map((o) => o.key).sort()).toEqual(["infirmity", "succor"]);
  });
});

describe("evidence-connect", () => {
  it("is complete only when every left item is connected", () => {
    expect(isComplete(evidence, { pairs: { succor: "alma" } })).toBe(false);
    expect(isComplete(evidence, { pairs: { succor: "alma", love: "decoy" } })).toBe(true);
  });

  it("marks each pair and gives the pair's clue (or a default) for wrong ones", () => {
    const result = check(evidence, { pairs: { succor: "john", love: "decoy" } });
    expect(result.correct).toBe(false);
    expect(result.marks).toEqual({ succor: "incorrect", love: "incorrect" });
    expect(result.feedback).toEqual([
      { itemId: "succor", message: "Which verse speaks of knowing how to succor?" },
      { itemId: "love", message: DEFAULT_PAIR_CLUE },
    ]);
    expect(result.summary).toBe("Two connections still need another look; they’re marked.");
  });

  it("never names the right evidence in feedback", () => {
    const result = check(evidence, { pairs: { succor: "decoy", love: "john" } });
    for (const item of result.feedback) {
      expect(item.message).not.toMatch(/Alma 7:12$/);
      expect(item.message).not.toContain("alma");
    }
    expect(result.marks).toEqual({ succor: "incorrect", love: "correct" });
  });

  it("accepts the revealed response", () => {
    expect(revealResponse(evidence)).toEqual({ pairs: { succor: "alma", love: "john" } });
    expect(check(evidence, revealResponse(evidence))).toMatchObject({ correct: true, feedback: [] });
  });

  it("connects, changes, and disconnects pairs; one-to-one evidence moves", () => {
    expect(isOneToOne(evidence)).toBe(true);
    let response = connectPair(evidence, { pairs: {} }, "succor", "alma");
    expect(response.pairs).toEqual({ succor: "alma" });
    response = connectPair(evidence, response, "love", "alma");
    expect(response.pairs).toEqual({ love: "alma" });
    response = connectPair(evidence, response, "love", "alma");
    expect(response.pairs).toEqual({});
  });

  it("lets claims share evidence when the content does", () => {
    const shared = make("evidence-connect", {
      left: { label: "Claim", items: [{ id: "x", text: "X" }, { id: "y", text: "Y" }] },
      right: { label: "Evidence", items: [{ id: "e", text: "E" }, { id: "f", text: "F" }] },
      pairs: [
        { left: "x", right: "e", because: "." },
        { left: "y", right: "e", because: "." },
      ],
    });
    expect(isOneToOne(shared)).toBe(false);
    const response = connectPair(shared, connectPair(shared, { pairs: {} }, "x", "e"), "y", "e");
    expect(response.pairs).toEqual({ x: "e", y: "e" });
    expect(check(shared, response).correct).toBe(true);
  });

  it("drops stored pairs that refer to items no longer in the activity", () => {
    expect(parseResponse(evidence, { pairs: { succor: "alma", gone: "john", love: "removed" } })).toEqual({ pairs: { succor: "alma" } });
    expect(parseResponse(evidence, "garbage")).toEqual({ pairs: {} });
  });
});

describe("choice questions", () => {
  it("shows options in a stable order that isn't the order they were written in", () => {
    const question = scripture.questions[1];
    const order = choiceOptions(question, "activity:q2").map((option) => option.id);
    expect(order).toEqual(choiceOptions(question, "activity:q2").map((option) => option.id));
    expect([...order].sort()).toEqual(question.options.map((option) => option.id).sort());
    expect(order).not.toEqual(question.options.map((option) => option.id));
  });

  it("toggles multiple-answer options and replaces single answers", () => {
    const multiple = scripture.questions[1];
    expect(toggleChoice(multiple, ["a"], "b")).toEqual(["a", "b"]);
    expect(toggleChoice(multiple, ["a", "b"], "a")).toEqual(["b"]);
    expect(toggleChoice(scripture.questions[0], ["love"], "law")).toEqual(["law"]);
  });

  it("counts remaining answers without naming them", () => {
    const result = checkChoice(scripture.questions[1], ["a"]);
    expect(result.correct).toBe(false);
    expect(result.remaining).toBe(1);
    expect(result.marks).toEqual({ a: "correct" });
    expect(result.summary).toMatch(/one more answer to find/i);
    expect(result.summary).not.toMatch(/\bB\b/);
  });

  it("reports wrong choices and missing ones together", () => {
    const result = checkChoice(scripture.questions[1], ["a", "c"]);
    expect(result.marks).toEqual({ a: "correct", c: "incorrect" });
    expect(result.summary).toMatch(/One choice doesn't fit.*one more answer/);
  });
});

describe("clue", () => {
  it("requires the minimum number of clues to be examined before answering", () => {
    let response = emptyResponse(clueActivity);
    response = examineClue(response, "c1");
    expect(canAnswerClue(clueActivity, response)).toBe(false);
    expect(isComplete(clueActivity, { ...response, answer: ["told"] })).toBe(false);
    response = examineClue(examineClue(response, "c2"), "c2");
    expect(response.examined).toEqual(["c1", "c2"]);
    expect(isComplete(clueActivity, { ...response, answer: ["told"] })).toBe(true);
  });

  it("defaults to requiring every clue", () => {
    const all = make("clue", { ...clueActivity, minRevealed: undefined });
    expect(isComplete(all, { examined: ["c1", "c2"], answer: ["told"] })).toBe(false);
    expect(isComplete(all, { examined: ["c1", "c2", "c3"], answer: ["told"] })).toBe(true);
  });

  it("uses the option's feedback for a wrong answer", () => {
    const result = check(clueActivity, { examined: ["c1", "c2"], answer: ["rank"] });
    expect(result).toMatchObject({ correct: false, marks: { rank: "incorrect" } });
    expect(result.feedback).toEqual([{ itemId: "rank", message: "Look for what the servant doesn't know." }]);
  });

  it("reveals every clue and the answer", () => {
    expect(revealResponse(clueActivity)).toEqual({ examined: ["c1", "c2", "c3"], answer: ["told"] });
    expect(check(clueActivity, revealResponse(clueActivity)).correct).toBe(true);
  });

  it("keeps only one answer for single-answer questions", () => {
    expect(parseResponse(clueActivity, { examined: ["c1", "nope"], answer: ["rank", "told"] })).toEqual({ examined: ["c1"], answer: ["rank"] });
  });
});

describe("build-principle", () => {
  it("accepts the solution and the alternatives, in order", () => {
    expect(check(principle, { order: ["a", "d", "b"] }).correct).toBe(true);
    expect(check(principle, { order: ["a", "b"] }).correct).toBe(true);
    expect(check(principle, revealResponse(principle)).correct).toBe(true);
  });

  it("rejects distractors and marks only them", () => {
    const result = check(principle, { order: ["a", "c", "b"] });
    expect(result.correct).toBe(false);
    expect(result.marks).toEqual({ c: "incorrect" });
    expect(result.feedback.map((f) => f.itemId)).toEqual(["c"]);
  });

  it("explains an order problem without saying the order", () => {
    const result = check(principle, { order: ["b", "a"] });
    expect(result.correct).toBe(false);
    expect(result.marks).toEqual({});
    expect(result.summary).toMatch(/right pieces.*another order/);
  });

  it("says when the principle is incomplete or has too much", () => {
    expect(check(principle, { order: ["d", "b"] }).summary).toMatch(/isn't complete/);
    // b and d each belong to an accepted principle, but not to the same one.
    const extra = make("build-principle", {
      fragments: principle.fragments,
      solution: ["a", "b"],
      alternatives: [["a", "d"]],
      statement: "S",
    });
    const result = check(extra, { order: ["a", "b", "d"] });
    expect(result.marks).toEqual({});
    expect(result.summary).toMatch(/more here than one principle needs/);
  });

  it("needs at least two fragments to check", () => {
    expect(isComplete(principle, { order: ["a"] })).toBe(false);
    expect(isComplete(principle, { order: ["a", "c"] })).toBe(true);
  });

  it("moves fragments within bounds", () => {
    expect(moveFragment({ order: ["a", "b", "c"] }, 2, -1)).toEqual({ order: ["a", "c", "b"] });
    const same = { order: ["a", "b"] };
    expect(moveFragment(same, 0, -1)).toBe(same);
    expect(moveFragment(same, 1, 1)).toBe(same);
  });

  it("assembles fragments into a natural sentence", () => {
    expect(assembleSentence(["jesus Christ took upon Him our pains", "so that He would know"])).toBe(
      "Jesus Christ took upon Him our pains so that He would know.",
    );
    expect(assembleSentence(["He knows", ", and He helps."])).toBe("He knows, and He helps.");
    expect(assembleSentence(["He knows,"])).toBe("He knows.");
    expect(assembleSentence([])).toBe("");
  });
});

describe("compare", () => {
  it("requires a verdict for every perspective", () => {
    expect(isComplete(compareActivity, { verdicts: { p1: "supported", p2: "beyond" } })).toBe(false);
    expect(isComplete(compareActivity, { verdicts: { p1: "supported", p2: "beyond", p3: "beyond" } })).toBe(true);
  });

  it("gives feedback based on the verdict chosen", () => {
    const result = check(compareActivity, { verdicts: { p1: "beyond", p2: "beyond", p3: "supported" } });
    expect(result.marks).toEqual({ p1: "incorrect", p2: "correct", p3: "incorrect" });
    expect(result.feedback).toEqual([
      { itemId: "p1", message: VERDICT_FEEDBACK.beyond },
      { itemId: "p3", message: VERDICT_FEEDBACK.supported },
    ]);
    expect(result.summary).toBe("Two judgments still need another look; they’re marked.");
  });

  it("ignores unknown verdicts in stored responses", () => {
    expect(parseResponse(compareActivity, { verdicts: { p1: "maybe", p2: "beyond" } })).toEqual({ verdicts: { p2: "beyond" } });
  });

  it("reveals each perspective's verdict", () => {
    expect(revealResponse(compareActivity)).toEqual({ verdicts: { p1: "supported", p2: "beyond", p3: "contradicted" } });
  });
});

describe("scripture-connect", () => {
  it("requires an answer to every question", () => {
    expect(isComplete(scripture, { answers: { q1: ["love"] } })).toBe(false);
    expect(isComplete(scripture, { answers: { q1: ["love"], q2: ["a"] } })).toBe(true);
  });

  it("marks questions and namespaced options", () => {
    const result = check(scripture, { answers: { q1: ["law"], q2: ["a", "b"] } });
    expect(result.correct).toBe(false);
    expect(result.marks).toEqual({ "q1/law": "incorrect", q1: "incorrect", "q2/a": "correct", "q2/b": "correct", q2: "correct" });
    expect(result.feedback).toEqual([{ itemId: "q1/law", message: "Neither passage mentions the law." }]);
    expect(result.summary).toBe("One answer still needs another look; it’s marked.");
  });

  it("accepts the revealed answers", () => {
    expect(check(scripture, revealResponse(scripture)).correct).toBe(true);
  });

  it("uses the question's own wording when there is only one question", () => {
    const single = make("scripture-connect", { ...scripture, questions: [scripture.questions[0]] });
    const result = check(single, { answers: { q1: ["law"] } });
    expect(result.summary).toBe("Not yet. Look again at the evidence.");
    expect(result.marks.q1).toBe("incorrect");
  });
});

describe("vocab-match", () => {
  it("requires meanings and examples when match is both", () => {
    expect(isComplete(vocab, { meanings: { succor: "succor", infirmity: "infirmity" }, examples: {} })).toBe(false);
    expect(
      isComplete(vocab, { meanings: { succor: "succor", infirmity: "extra-0" }, examples: { succor: "infirmity", infirmity: "succor" } }),
    ).toBe(true);
  });

  it("needs both the meaning and the example right for a term", () => {
    const result = check(vocab, { meanings: { succor: "succor", infirmity: "infirmity" }, examples: { succor: "infirmity", infirmity: "succor" } });
    expect(result.correct).toBe(false);
    expect(result.marks).toMatchObject({ "succor:meaning": "correct", "succor:example": "incorrect", succor: "incorrect" });
    expect(result.feedback.map((f) => f.itemId)).toEqual(["succor:example", "infirmity:example"]);
    expect(check(vocab, revealResponse(vocab)).correct).toBe(true);
  });

  it("treats extra meanings as wrong for every term", () => {
    const result = check(vocab, { meanings: { succor: "extra-0", infirmity: "infirmity" }, examples: { succor: "succor", infirmity: "infirmity" } });
    expect(result.marks["succor:meaning"]).toBe("incorrect");
    expect(result.feedback[0].message).toContain("‘Succor’");
  });

  it("asks only for meanings by default", () => {
    const meaningsOnly = make("vocab-match", { pairs: vocab.pairs.map((pair) => ({ id: pair.id, term: pair.term, meaning: pair.meaning })) });
    expect(meaningsOnly.match).toBe("meaning");
    expect(isComplete(meaningsOnly, { meanings: { succor: "succor", infirmity: "infirmity" }, examples: {} })).toBe(true);
    expect(revealResponse(meaningsOnly)).toEqual({ meanings: { succor: "succor", infirmity: "infirmity" }, examples: {} });
  });

  it("moves a meaning that is already matched to another term", () => {
    const first = matchTerm({ meanings: {}, examples: {} }, "meaning", "succor", "succor");
    const moved = matchTerm(first, "meaning", "infirmity", "succor");
    expect(moved.meanings).toEqual({ infirmity: "succor" });
    expect(matchTerm(moved, "meaning", "infirmity", "succor").meanings).toEqual({});
  });

  it("drops stored matches to options that don't exist", () => {
    expect(parseResponse(vocab, { meanings: { succor: "extra-9", infirmity: "succor" }, examples: { succor: "nope" } })).toEqual({
      meanings: { infirmity: "succor" },
      examples: {},
    });
  });
});

describe("sort", () => {
  it("requires every item to be placed", () => {
    expect(isComplete(sortActivity, { placements: { temptations: "v11" } })).toBe(false);
    expect(isComplete(sortActivity, revealResponse(sortActivity))).toBe(true);
  });

  it("asks about the chosen category without naming the right one", () => {
    const result = check(sortActivity, { placements: { temptations: "v12", death: "v12", infirmities: "v12" } });
    expect(result.marks).toEqual({ temptations: "incorrect", death: "correct", infirmities: "correct" });
    expect(result.feedback).toEqual([{ itemId: "temptations", message: "Look again at this one. Does the evidence put it under ‘Verse 12’?" }]);
    expect(result.summary).toBe("One of these still needs another look; it’s marked.");
  });
});

describe("highlight", () => {
  it("is correct when every target and nothing else is selected", () => {
    expect(check(highlightActivity, { selected: [3, 4] }).correct).toBe(true);
    expect(check(highlightActivity, { selected: [2, 3, 4] }).correct).toBe(false);
  });

  it("says how many targets remain without saying which", () => {
    const result = check(highlightActivity, { selected: [4] });
    expect(result).toMatchObject({ correct: false, remaining: 1, marks: { "4": "correct" } });
    expect(result.summary).toBe("Good. One more phrase to find.");
    expect(result.feedback).toEqual([]);
  });

  it("marks phrases that don't answer the question", () => {
    const result = check(highlightActivity, { selected: [0, 4] });
    expect(result.marks).toEqual({ "0": "incorrect", "4": "correct" });
    expect(result.summary).toMatch(/One phrase you chose doesn't answer the question\. One more phrase to find\./);
  });

  it("accepts minTargets", () => {
    const some = make("highlight", { ...highlightActivity, minTargets: 1 });
    expect(check(some, { selected: [3] }).correct).toBe(true);
    expect(check(some, { selected: [3, 1] }).correct).toBe(false);
  });

  it("toggles chunks and reads stored selections defensively", () => {
    expect(toggleChunk(toggleChunk({ selected: [] }, 4), 1)).toEqual({ selected: [1, 4] });
    expect(toggleChunk({ selected: [1, 4] }, 1)).toEqual({ selected: [4] });
    expect(parseResponse(highlightActivity, { selected: [4, 4, 99, -1, "2", 1.5, 0] })).toEqual({ selected: [0, 4] });
    expect(revealResponse(highlightActivity)).toEqual({ selected: [3, 4] });
    expect(isComplete(highlightActivity, { selected: [] })).toBe(false);
  });
});

describe("reflect", () => {
  it("is never checked and always complete", () => {
    expect(isCheckedActivity(reflectActivity)).toBe(false);
    expect(isComplete(reflectActivity, undefined)).toBe(true);
    expect(check(reflectActivity, undefined).correct).toBe(true);
  });
});

describe("responses", () => {
  it("are JSON round-trippable", () => {
    for (const activity of [evidence, clueActivity, principle, compareActivity, scripture, vocab, sortActivity, highlightActivity]) {
      const revealed = revealResponse(activity);
      expect(parseResponse(activity, JSON.parse(JSON.stringify(revealed)))).toEqual(revealed);
      expect(check(activity, JSON.parse(JSON.stringify(revealed))).correct).toBe(true);
      expect(isComplete(activity, emptyResponse(activity))).toBe(false);
    }
  });
});
