#!/usr/bin/env node
/**
 * Estimates how long each guided investigation really takes, to keep its
 * `estimatedMinutes` honest. Counts what a learner reads at Medium (the
 * question, hook and intro on the start screen; each step's intro, activity
 * and insight; the scripture and excerpts in its evidence the first time each
 * appears; and the big idea on the end screen), reads it at 180 words a minute
 * (a phone, with scripture), and adds a minute per step for working the
 * activity. Extra reading a learner opens or scrolls to only if they want it
 * isn't counted: the start screen's common questions and "question beneath
 * this one" below Begin, and the full write-up behind "See everything you
 * found". Quick is the core steps; Deep is every step and side question.
 *
 * Usage: node scripts/estimate-study-time.mjs           (prints declared vs estimated)
 *        node scripts/estimate-study-time.mjs --write   (sets each estimatedMinutes, rounded to 5)
 */
import { readdir, readFile, writeFile } from "node:fs/promises";

const write = process.argv.includes("--write");
const WORDS_PER_MINUTE = 180;
const MINUTES_PER_STEP = 1;
const dir = new URL("../src/content/investigations/", import.meta.url);
/**
 * Keys that hold ids, settings (a step's phase, method, and depth), answers, text shown only on request
 * (hints, wrong-answer feedback, and the explanation, behind "Why it fits" once an answer is worked out),
 * or Map connections (on the card).
 */
const SKIP = new Set(["id", "ids", "sourceIds", "concepts", "connections", "correct", "url", "hints", "feedback", "explanation", "review", "answer", "target", "targets", "verdict", "phase", "method", "depth"]);

const words = (text) => (text.match(/[\p{L}\p{N}’']+/gu) ?? []).length;

/** Words in every learner-facing string under `value`. */
function count(value) {
  if (typeof value === "string") return words(value);
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + count(item), 0);
  if (value && typeof value === "object") {
    return Object.entries(value).reduce((sum, [key, item]) => (SKIP.has(key) ? sum : sum + count(item)), 0);
  }
  return 0;
}

/** The activity a step shows at Medium. */
const mediumActivity = (step) => step.activities?.medium ?? step.activity;

/** Words in a step, plus its evidence the first time a source appears on the path (`seen`): a passage read once is skimmed after. */
function stepWords(step, sources, seen) {
  const activity = mediumActivity(step);
  // The step without its activity variants: the Medium one is counted on its own.
  const rest = Object.fromEntries(Object.entries(step).filter(([key]) => key !== "activities" && key !== "activity"));
  const ids = new Set([...(step.sourceIds ?? []), ...(activity?.sourceIds ?? []), ...(activity?.passages ?? [])]);
  const evidence = [...ids].reduce((sum, id) => {
    const source = sources.get(id);
    if (!source || seen.has(id)) return sum;
    seen.add(id);
    return sum + count(source.verses ?? []) + (source.excerpt ? words(source.excerpt) : 0);
  }, 0);
  return count(rest) + count(activity ?? {}) + evidence;
}

const minutes = (wordCount, steps) => Math.round(wordCount / WORDS_PER_MINUTE + steps * MINUTES_PER_STEP);

const names = (await readdir(dir)).filter((name) => name.endsWith(".json")).sort();
console.log("investigation".padEnd(30), "quick (declared → estimate)", "  deep (declared → estimate)");
for (const name of names) {
  const data = JSON.parse(await readFile(new URL(name, dir), "utf8"));
  const sources = new Map((data.sources ?? []).map((source) => [source.id, source]));
  const opening = count([data.question, data.hook, data.intro, data.discovery?.keyIdeas?.[0] ?? ""]);
  const core = data.steps.filter((step) => (step.depth ?? "core") === "core");
  const branchSteps = (data.branches ?? []).flatMap((branch) => [branch, ...branch.steps]);
  const quickSeen = new Set();
  const deepSeen = new Set();
  const quickWords = opening + core.reduce((sum, step) => sum + stepWords(step, sources, quickSeen), 0);
  const deepWords =
    opening +
    data.steps.reduce((sum, step) => sum + stepWords(step, sources, deepSeen), 0) +
    branchSteps.reduce(
      (sum, item) => sum + (item.steps ? count({ question: item.question, intro: item.intro, returnNote: item.returnNote }) : stepWords(item, sources, deepSeen)),
      0,
    );
  const quick = minutes(quickWords, core.length);
  const deep = minutes(deepWords, data.steps.length + (data.branches ?? []).reduce((sum, branch) => sum + branch.steps.length, 0));
  if (write) {
    const round = (value) => Math.max(5, Math.round(value / 5) * 5);
    data.estimatedMinutes = { quick: round(quick), deep: Math.max(round(deep), round(quick) + 5) };
    await writeFile(new URL(name, dir), `${JSON.stringify(data, null, 2)}\n`);
  }
  console.log(
    data.id.padEnd(30),
    `${String(data.estimatedMinutes.quick).padStart(3)} → ${String(quick).padStart(3)} (${quickWords} words)`.padEnd(29),
    `${String(data.estimatedMinutes.deep).padStart(3)} → ${String(deep).padStart(3)} (${deepWords} words)`,
  );
}
