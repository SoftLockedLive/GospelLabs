/**
 * Helpers for the Gospel Labs 2.0 study specs. Answers come from the curated
 * content itself (the same validated registry the build uses), so the tests
 * answer activities the way a learner would — by choosing the right words,
 * pieces, and verdicts on screen — without hardcoding any answer here.
 *
 * Option order on screen is the app's seeded shuffle, which the helpers
 * compute with the app's own functions, so they never depend on the order
 * content is written in.
 */
import { expect, type Locator, type Page } from "@playwright/test";
import { check, revealResponse, type ResponseFor } from "@/domain/study/activities";
import { evidenceOptions } from "@/domain/study/activities/evidence-connect";
import { exampleOptions, meaningOptions } from "@/domain/study/activities/vocab-match";
import { resolveActivity } from "@/domain/study/content-registry";
import type { Activity, ActivityOf, CheckedActivity, Step, StudyInvestigation } from "@/domain/study/content-schema";
import { ATTEMPTS_BEFORE_REVEAL } from "@/domain/study/engine/hints";
import { mainPath } from "@/domain/study/engine/path";
import { DIFFICULTY_LABELS, VERDICT_LABELS, VERDICTS, type Difficulty, type StudyLength } from "@/domain/study/vocabulary";
import { getInvestigation } from "@/lib/study-content";

export type { Difficulty, StudyLength };

/** The validated investigation, failing loudly if the content id is wrong. */
export function investigation(id: string): StudyInvestigation {
  const found = getInvestigation(id);
  if (!found) throw new Error(`No ready investigation "${id}"`);
  return found;
}

export const activityAt = (step: Step, difficulty: Difficulty) => resolveActivity(step, difficulty).activity;

/** Main-path steps for a session length, in order. */
export const pathSteps = (inv: StudyInvestigation, length: StudyLength) => mainPath(inv, length);

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Matches an accessible name that starts with `text` (marks such as "Look again" may follow it). */
export const startsWith = (text: string) => new RegExp(`^\\s*${escapeRegExp(text)}`);

/** Below Tailwind's sm breakpoint, matching boards switch to per-item choice lists. */
const isNarrow = (page: Page) => (page.viewportSize()?.width ?? 1280) < 640;

// --- Locators -------------------------------------------------------------------------

/** One step of an investigation, as an article named by its title. */
export const stepArticle = (page: Page, step: Step) => page.getByRole("article", { name: step.title, exact: true });

/** The activity's section, named by its prompt. */
export const activitySection = (scope: Page | Locator, activity: Activity) =>
  scope.getByRole("region", { name: activity.prompt, exact: true });

export const checkButton = (scope: Page | Locator) => scope.getByRole("button", { name: "Check", exact: true });

/** The success panel shown when an activity is worked out. */
export const fitsTheEvidence = (scope: Page | Locator) => scope.getByRole("status").filter({ hasText: "That fits the evidence" });

/** The main-path step buttons in the progress path ("Investigation steps"). */
export const progressSteps = (page: Page) => page.getByRole("navigation", { name: "Investigation steps" }).getByRole("button");

/**
 * Chooses a radio button the way a learner does: by clicking its label.
 * Many of the app's choice cards keep the native input visually hidden inside
 * the label (it still gives keyboard and screen-reader behavior), so the
 * input itself has no area to click. Always clicks, even if the choice already
 * looks checked, since a page may still be applying saved preferences.
 */
export async function pick(radio: Locator) {
  await radio.locator("xpath=ancestor::label[1]").click();
  await expect(radio).toBeChecked();
}

// --- Starting -------------------------------------------------------------------------

/** On an investigation's start screen: chooses difficulty and length. */
export async function chooseStudySettings(scope: Page | Locator, settings: { difficulty?: Difficulty; length?: StudyLength }) {
  if (settings.difficulty) {
    await pick(scope.getByRole("group", { name: "Difficulty" }).getByRole("radio", { name: startsWith(DIFFICULTY_LABELS[settings.difficulty]) }));
  }
  if (settings.length) {
    await pick(scope.getByRole("group", { name: "Session" }).getByRole("radio", { name: settings.length === "quick" ? /^Quick/ : /^Deep/ }));
  }
}

/** Opens an investigation and begins it with these settings; resolves once the first step is shown. */
export async function startInvestigation(page: Page, id: string, settings: { difficulty: Difficulty; length: StudyLength }) {
  const inv = investigation(id);
  await page.goto(`/investigate/${id}`);
  await expect(page.getByRole("heading", { level: 1, name: inv.title })).toBeVisible();
  await chooseStudySettings(page, settings);
  await page.getByRole("button", { name: "Begin the investigation" }).click();
  await expect(stepArticle(page, pathSteps(inv, settings.length)[0])).toBeVisible();
  return inv;
}

// --- Answering ------------------------------------------------------------------------

/**
 * A complete answer that doesn't fit the evidence (confirmed with the app's own checker). Different
 * variants give different wrong answers, so several tries in a row can each be checked.
 */
export function wrongResponse(activity: CheckedActivity, variant = 0): unknown {
  const response = buildWrongResponse(activity, variant);
  const result = check(activity, response);
  if (result.correct) throw new Error(`Couldn't build a wrong answer for "${activity.id}" (variant ${variant})`);
  return response;
}

function rotate<T>(items: readonly T[], by: number): T[] {
  const n = by % items.length;
  return [...items.slice(n), ...items.slice(0, n)];
}

function buildWrongResponse(activity: CheckedActivity, variant: number): unknown {
  const shift = variant + 1;
  switch (activity.type) {
    case "clue": {
      const wrong = activity.question.options.filter((option) => !activity.question.correct.includes(option.id));
      return { examined: activity.clues.map((clue) => clue.id), answer: [wrong[variant % wrong.length].id] };
    }
    case "scripture-connect":
      return {
        answers: Object.fromEntries(
          activity.questions.map((question) => {
            const wrong = question.options.filter((option) => !question.correct.includes(option.id));
            return [question.id, [wrong[variant % wrong.length].id]];
          }),
        ),
      };
    case "sort": {
      const ids = activity.categories.map((category) => category.id);
      return {
        placements: Object.fromEntries(
          activity.items.map((item) => [item.id, ids[(ids.indexOf(item.category) + 1 + (variant % (ids.length - 1))) % ids.length]]),
        ),
      };
    }
    case "compare":
      return {
        verdicts: Object.fromEntries(
          activity.perspectives.map((p) => [p.id, VERDICTS[(VERDICTS.indexOf(p.verdict) + 1 + (variant % 2)) % VERDICTS.length]]),
        ),
      };
    case "evidence-connect": {
      const rights = activity.left.items.map((item) => activity.pairs.find((pair) => pair.left === item.id)!.right);
      const rotated = rotate(rights, shift);
      return { pairs: Object.fromEntries(activity.left.items.map((item, i) => [item.id, rotated[i]])) };
    }
    case "vocab-match": {
      const ids = activity.pairs.map((pair) => pair.id);
      const rotated = rotate(ids, shift);
      const wrong = Object.fromEntries(ids.map((id, i) => [id, rotated[i]]));
      return {
        meanings: activity.match === "example" ? {} : wrong,
        examples: activity.match === "meaning" ? {} : wrong,
      };
    }
    case "build-principle": {
      const distractors = activity.fragments.filter((fragment) => !activity.solution.includes(fragment.id));
      if (distractors.length && variant % 2 === 0) return { order: [...activity.solution.slice(0, -1), distractors[0].id] };
      return { order: [...activity.solution].reverse() };
    }
    case "highlight": {
      const others = activity.chunks.map((_, index) => index).filter((index) => !activity.targets.includes(index));
      return { selected: [others[variant % others.length]] };
    }
  }
}

/**
 * Sets an activity's answer through the UI, as a learner would. Choice-based
 * activities (radios and checkboxes) can be re-answered; matching, building,
 * and highlighting assume the activity is fresh (nothing chosen yet), except
 * that highlighting toggles only the phrases that need it.
 */
export async function answer(page: Page, scope: Locator, activity: CheckedActivity, response: unknown = revealResponse(activity)) {
  switch (activity.type) {
    case "evidence-connect":
      return answerEvidenceConnect(page, scope, activity, response as ResponseFor<"evidence-connect">);
    case "vocab-match":
      return answerVocabMatch(page, scope, activity, response as ResponseFor<"vocab-match">);
    case "clue":
      return answerClue(scope, activity, response as ResponseFor<"clue">);
    case "build-principle": {
      for (const id of (response as ResponseFor<"build-principle">).order) {
        const text = activity.fragments.find((fragment) => fragment.id === id)!.text;
        await scope.getByRole("button", { name: `Add: ${text}`, exact: true }).click();
      }
      return;
    }
    case "compare": {
      const { verdicts } = response as ResponseFor<"compare">;
      for (const perspective of activity.perspectives) {
        await scope.getByRole("group", { name: perspective.text }).getByRole("radio", { name: VERDICT_LABELS[verdicts[perspective.id]], exact: true }).check();
      }
      return;
    }
    case "scripture-connect": {
      const { answers } = response as ResponseFor<"scripture-connect">;
      for (const question of activity.questions) {
        const group = scope.getByRole("group", { name: question.prompt });
        const chosen = answers[question.id] ?? [];
        for (const option of question.options) {
          const input = group.getByRole(question.multiple ? "checkbox" : "radio", { name: startsWith(option.text) });
          if (chosen.includes(option.id)) await input.check();
          else if (question.multiple) await input.uncheck();
        }
      }
      return;
    }
    case "sort": {
      const { placements } = response as ResponseFor<"sort">;
      for (const item of activity.items) {
        const category = activity.categories.find((c) => c.id === placements[item.id])!;
        await scope.getByRole("group", { name: item.text, exact: true }).getByRole("radio", { name: category.label, exact: true }).check();
      }
      return;
    }
    case "highlight": {
      const wanted = new Set((response as ResponseFor<"highlight">).selected);
      const phrases = highlightPhrases(scope);
      await expect(phrases).toHaveCount(activity.chunks.length);
      for (let index = 0; index < activity.chunks.length; index++) {
        const phrase = phrases.nth(index);
        const pressed = (await phrase.getAttribute("aria-pressed")) === "true";
        if (pressed !== wanted.has(index)) await phrase.click();
      }
      return;
    }
  }
}

/** The tappable phrases of a highlight activity, in passage order. */
export const highlightPhrases = (scope: Locator) => scope.locator("figure").getByRole("button");

async function answerClue(scope: Locator, activity: ActivityOf<"clue">, response: ResponseFor<"clue">) {
  for (const id of response.examined) {
    const index = activity.clues.findIndex((clue) => clue.id === id);
    const button = scope.getByRole("button", { name: new RegExp(`^Clue ${index + 1}\\b`) });
    // Opening a clue examines it; an examined clue's button only folds it away.
    if ((await button.getAttribute("aria-expanded")) !== "true") await button.click();
  }
  const { question } = activity;
  const group = scope.getByRole("group", { name: question.prompt });
  for (const option of question.options) {
    const input = group.getByRole(question.multiple ? "checkbox" : "radio", { name: startsWith(option.text) });
    if (response.answer.includes(option.id)) await input.check();
    else if (question.multiple) await input.uncheck();
  }
}

/**
 * One matching board: on wide screens, select the left item, then its
 * partner; on phones, open the item's choice list and pick from it.
 */
async function connectOnBoard(page: Page, board: Locator, labels: { left: string; right: string }, leftIndex: number, rightIndex: number) {
  if (isNarrow(page)) {
    await board.getByRole("button", { name: /^(Choose a match|Change)\b/ }).nth(leftIndex).click();
    await board.getByRole("list", { name: `${labels.right} for item ${leftIndex + 1}` }).getByRole("button").nth(rightIndex).click();
    return;
  }
  await board.getByRole("group", { name: labels.left, exact: true }).getByRole("button").nth(leftIndex).click();
  await board.getByRole("group", { name: labels.right, exact: true }).getByRole("button").nth(rightIndex).click();
}

async function answerEvidenceConnect(page: Page, scope: Locator, activity: ActivityOf<"evidence-connect">, response: ResponseFor<"evidence-connect">) {
  const right = evidenceOptions(activity);
  const labels = { left: activity.left.label, right: activity.right.label };
  for (const [leftIndex, item] of activity.left.items.entries()) {
    const rightId = response.pairs[item.id];
    if (rightId) await connectOnBoard(page, scope, labels, leftIndex, right.findIndex((option) => option.id === rightId));
  }
}

async function answerVocabMatch(page: Page, scope: Locator, activity: ActivityOf<"vocab-match">, response: ResponseFor<"vocab-match">) {
  const parts: { field: "meanings" | "examples"; label: string; options: { key: string }[]; terms: string[]; region: RegExp }[] = [];
  if (activity.match !== "example") {
    parts.push({ field: "meanings", label: "Meaning", options: meaningOptions(activity), terms: activity.pairs.map((p) => p.id), region: /with its meaning$/ });
  }
  if (activity.match !== "meaning") {
    const terms = activity.pairs.filter((pair) => pair.example).map((pair) => pair.id);
    parts.push({ field: "examples", label: "Example", options: exampleOptions(activity), terms, region: /with a scriptural example$/ });
  }
  for (const part of parts) {
    const board = activity.match === "both" ? scope.getByRole("region", { name: part.region }) : scope;
    for (const [leftIndex, termId] of part.terms.entries()) {
      const key = response[part.field][termId];
      if (key) await connectOnBoard(page, board, { left: "Term", right: part.label }, leftIndex, part.options.findIndex((o) => o.key === key));
    }
  }
}

/** Answers correctly, checks, and waits for "That fits the evidence". Reflections are continued (with optional text). */
export async function solveActivity(page: Page, scope: Locator, activity: Activity, options: { reflection?: string } = {}) {
  if (activity.type === "reflect") {
    if (options.reflection !== undefined) await scope.getByRole("textbox", { name: /Your thoughts/ }).fill(options.reflection);
    await scope.getByRole("button", { name: "Continue", exact: true }).click();
    return;
  }
  const section = activitySection(scope, activity);
  await answer(page, section, activity);
  await checkButton(section).click();
  await expect(fitsTheEvidence(section)).toBeVisible();
}

/**
 * Different wrong answers in a row, each checked. The default count is just enough to offer "Show me"
 * ("Continue anyway" is there from the start).
 */
export async function wrongTries(page: Page, section: Locator, activity: CheckedActivity, count = ATTEMPTS_BEFORE_REVEAL) {
  for (let variant = 0; variant < count; variant++) {
    await answer(page, section, activity, wrongResponse(activity, variant));
    await checkButton(section).click();
    await expect(section.getByText("Change your answer, then check again.")).toBeVisible();
  }
}

/** Three wrong tries: more than enough to offer "Show me". Kept for specs written when it took three. */
export const threeWrongTries = (page: Page, section: Locator, activity: CheckedActivity) => wrongTries(page, section, activity, 3);

/**
 * Works through the current main-path step at `difficulty`, then moves on
 * ("Next step"), unless it is the last step.
 */
export async function solveStep(page: Page, step: Step, difficulty: Difficulty, options: { reflection?: string; next?: boolean } = {}) {
  const article = stepArticle(page, step);
  await expect(article).toBeVisible();
  await solveActivity(page, article, activityAt(step, difficulty), options);
  if (options.next !== false) {
    await article.getByRole("button", { name: "Next step" }).click();
  }
}

/**
 * Completes a whole investigation through the UI at one difficulty and length,
 * ignoring side questions, and opens the discovery. Resolves on the completion view.
 */
export async function completeInvestigation(page: Page, id: string, settings: { difficulty: Difficulty; length: StudyLength }) {
  const inv = await startInvestigation(page, id, settings);
  const steps = pathSteps(inv, settings.length);
  for (const [index, step] of steps.entries()) {
    const last = index === steps.length - 1;
    await solveStep(page, step, settings.difficulty, { next: !last });
    if (last) await stepArticle(page, step).getByRole("button", { name: "See your discovery" }).click();
  }
  await expect(page.getByText("Saved to your Notebook.")).toBeVisible();
  return inv;
}

// --- Storage ---------------------------------------------------------------------------

/** Reads every record of one of the app's IndexedDB stores directly, without the app's validation. */
export function readStore<T = Record<string, unknown>>(page: Page, store: string): Promise<T[]> {
  return page.evaluate(
    (name) =>
      new Promise<T[]>((resolve, reject) => {
        const request = indexedDB.open("gospel-labs");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(name)) {
            db.close();
            resolve([]);
            return;
          }
          const getAll = db.transaction(name).objectStore(name).getAll();
          getAll.onsuccess = () => {
            db.close();
            resolve(getAll.result as T[]);
          };
          getAll.onerror = () => reject(getAll.error);
        };
      }),
    store,
  );
}

/** Waits until a study record's autosave has reached IndexedDB. */
export async function expectStored<T>(page: Page, store: string, predicate: (records: T[]) => boolean, message?: string) {
  await expect.poll(async () => predicate(await readStore<T>(page, store)), { message }).toBe(true);
}

/** Words of scoring and competition: scores, streaks, points, XP, ranks, leaderboards, percentages. */
const SCORING = /\b(scores?|scored|scoring|streaks?|points|pts|XP|ranks?|ranked|ranking|rankings|leaderboards?|level up|badges? earned)\b|\d\s*%/i;
/** The app may promise there is no score ("Nothing is scored"); only sentences without a negation count. */
const NEGATED = /\b(no|never|nothing|not|without|isn[’']t|aren[’']t|doesn[’']t|won[’']t)\b/i;

/** Sentences in the main content that present a score, streak, points, ranking, or percentage. */
export async function scoringLanguage(page: Page): Promise<string[]> {
  const text = await page.getByRole("main").innerText();
  return text
    .split(/\n+|(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence && SCORING.test(sentence) && !NEGATED.test(sentence));
}

/** Gospel Labs never scores, counts streaks, ranks, or shows percentages. */
export async function expectNoScoring(page: Page) {
  expect(await scoringLanguage(page), "Scoring or competitive language on the page").toEqual([]);
}

/** The visible text of the main content, for wording checks. */
export const mainText = (page: Page) => page.getByRole("main").innerText();
