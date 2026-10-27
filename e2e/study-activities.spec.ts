/**
 * The nine activity types, each worked through the investigation player the
 * way a learner would: answered on screen, checked, and confirmed. Each case
 * uses the first step of an investigation at the difficulty where that step
 * is the activity type, so every one is reachable without seeding progress.
 * Three are also done with the keyboard alone: highlighting, building a
 * principle, and a matching board. (Reflections, the ninth type, end every
 * investigation; see study-investigation.spec.ts and study-settings.spec.ts.)
 */
import { expect, test, type Locator, type Page } from "@playwright/test";
import { revealResponse } from "@/domain/study/activities";
import { fragmentOptions } from "@/domain/study/activities/build-principle";
import { evidenceOptions } from "@/domain/study/activities/evidence-connect";
import type { ActivityOf, ActivityType, CheckedActivity } from "@/domain/study/content-schema";
import {
  activityAt,
  activitySection,
  answer,
  checkButton,
  fitsTheEvidence,
  highlightPhrases,
  pathSteps,
  solveActivity,
  solveStep,
  startInvestigation,
  stepArticle,
  type Difficulty,
} from "./study-helpers";

/** Where each checked type is the first activity a learner meets. */
const CASES: { type: ActivityType; investigation: string; difficulty: Difficulty; step?: number }[] = [
  { type: "highlight", investigation: "one-by-one", difficulty: "easy" },
  { type: "evidence-connect", investigation: "one-by-one", difficulty: "medium" },
  { type: "scripture-connect", investigation: "one-by-one", difficulty: "hard" },
  { type: "build-principle", investigation: "one-by-one", difficulty: "complex" },
  { type: "clue", investigation: "recognizing-the-spirit", difficulty: "medium" },
  { type: "compare", investigation: "recognizing-the-spirit", difficulty: "hard" },
  { type: "sort", investigation: "christ-at-the-center", difficulty: "easy" },
  // Vocabulary Matching is the second quick step of Again and Again at medium.
  { type: "vocab-match", investigation: "again-and-again", difficulty: "medium", step: 1 },
];

for (const { type, investigation: id, difficulty, step: stepIndex = 0 } of CASES) {
  test(`a ${type} activity can be answered and checked in the investigation player`, async ({ page, isMobile }) => {
    const inv = await startInvestigation(page, id, { difficulty, length: "quick" });
    const steps = pathSteps(inv, "quick");
    for (const earlier of steps.slice(0, stepIndex)) await solveStep(page, earlier, difficulty);

    const step = steps[stepIndex];
    const activity = activityAt(step, difficulty);
    expect(activity.type).toBe(type);
    const article = stepArticle(page, step);
    const section = activitySection(article, activity);
    await expect(section).toBeVisible();
    // Check waits until the activity is fully answered.
    await expect(checkButton(section)).toBeDisabled();

    await solveActivity(page, article, activity);
    // Worked out, not revealed: the explanation is one tap away ("Why it fits"), labeled as Gospel Labs'
    // suggestion, and the step's insight follows.
    const explanation = section.getByText((activity as CheckedActivity).explanation);
    await expect(explanation).toBeHidden();
    await section.getByText("Why it fits").click();
    await expect(explanation).toBeVisible();
    await expect(explanation.locator("xpath=..")).toContainText("Suggested by Gospel Labs");
    const insight = article.getByRole("region", { name: "What this step brings out" });
    await expect(insight).toContainText(step.insight);
    // On phones the insight is cut to a few lines, so "Next step" stays close; "Read more" opens the rest.
    const readMore = insight.getByRole("button", { name: "Read more" });
    if (isMobile) {
      await expect(readMore).toHaveAttribute("aria-expanded", "false");
      await readMore.click();
      await expect(insight.getByRole("button", { name: "Show less" })).toHaveAttribute("aria-expanded", "true");
    } else {
      await expect(readMore).toHaveCount(0);
    }
    await expect(article.getByRole("button", { name: "Next step" })).toBeVisible();
    // Stopping here is fine, and the learner is told so.
    await expect(article.getByText("A good place to stop if you need to. Your place is saved for next time.")).toBeVisible();
  });
}

/** Presses Tab (or Shift+Tab) until `target` has focus, as a keyboard user would. */
async function tabTo(page: Page, target: Locator, { backwards = false, limit = 80 } = {}) {
  for (let i = 0; i < limit; i++) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press(backwards ? "Shift+Tab" : "Tab");
  }
  throw new Error(`Never reached ${target} with ${backwards ? "Shift+Tab" : "Tab"}`);
}

test("a highlight activity works with the keyboard alone", async ({ page }) => {
  const inv = await startInvestigation(page, "one-by-one", { difficulty: "easy", length: "quick" });
  const step = pathSteps(inv, "quick")[0];
  const activity = activityAt(step, "easy") as ActivityOf<"highlight">;
  const section = activitySection(stepArticle(page, step), activity);
  const phrases = highlightPhrases(section);

  // Each phrase is its own tab stop, toggled with Enter or Space.
  await tabTo(page, phrases.first());
  const targets = new Set(activity.targets);
  for (let index = 0; index < activity.chunks.length; index++) {
    if (index > 0) await page.keyboard.press("Tab");
    await expect(phrases.nth(index)).toBeFocused();
    if (targets.has(index)) await page.keyboard.press(index % 2 ? "Enter" : "Space");
  }
  for (let index = 0; index < activity.chunks.length; index++) {
    await expect(phrases.nth(index)).toHaveAttribute("aria-pressed", String(targets.has(index)));
  }
  await tabTo(page, checkButton(section));
  await page.keyboard.press("Enter");
  await expect(fitsTheEvidence(section)).toBeVisible();
  // Focus moves to the result, since the buttons the learner used are gone.
  await expect(page.locator(":focus")).toContainText("That fits the evidence");
});

test("a build-the-principle activity works with the keyboard alone, with focus following each piece", async ({ page }) => {
  const inv = await startInvestigation(page, "one-by-one", { difficulty: "complex", length: "quick" });
  const step = pathSteps(inv, "quick")[0];
  const activity = activityAt(step, "complex") as ActivityOf<"build-principle">;
  const section = activitySection(stepArticle(page, step), activity);
  const textOf = (id: string) => activity.fragments.find((fragment) => fragment.id === id)!.text;
  const inSolution = new Set(activity.solution);
  const shown = fragmentOptions(activity).map((fragment) => fragment.id);

  // Walk the pieces in the order shown: Enter adds one (and focus moves on to the next piece), Tab skips one.
  const addButton = (id: string) => section.getByRole("button", { name: `Add: ${textOf(id)}`, exact: true });
  await tabTo(page, addButton(shown[0]));
  for (const [index, id] of shown.entries()) {
    // The added piece leaves the list and focus moves to the one that takes its place, so this holds every time.
    await expect(addButton(id)).toBeFocused();
    if (inSolution.has(id)) {
      await page.keyboard.press("Enter");
      await expect(section.getByRole("button", { name: `Take out “${textOf(id)}”` })).toBeVisible();
    } else if (index < shown.length - 1) {
      await page.keyboard.press("Tab");
    }
  }

  // The pieces were added in the order shown; put them in the solution's order with "Move earlier".
  let order = shown.filter((id) => inSolution.has(id));
  for (const [target, id] of activity.solution.entries()) {
    const position = order.indexOf(id);
    if (position === target) continue;
    await tabTo(page, section.getByRole("button", { name: `Move “${textOf(id)}” earlier` }), { backwards: true });
    // Focus follows the piece, so pressing Enter again keeps moving it.
    for (let moves = 0; moves < position - target; moves++) await page.keyboard.press("Enter");
    order = [...order.slice(0, target), id, ...order.slice(target).filter((other) => other !== id)];
  }
  await expect(section.getByRole("button", { name: /^Take out/ })).toHaveCount(activity.solution.length);
  await tabTo(page, checkButton(section));
  await page.keyboard.press("Enter");
  await expect(fitsTheEvidence(section)).toBeVisible();
  // The finished principle is shown as one statement (the sentence built above reads the same).
  await expect(section.getByText(activity.statement).last()).toBeVisible();
});

test("a matching board works with the keyboard alone, including Escape to cancel a selection", async ({ page, isMobile }) => {
  test.skip(isMobile, "Phones use per-item choice lists of native buttons; the pointer cases cover them");
  const inv = await startInvestigation(page, "one-by-one", { difficulty: "medium", length: "quick" });
  const step = pathSteps(inv, "quick")[0];
  const activity = activityAt(step, "medium") as ActivityOf<"evidence-connect">;
  const section = activitySection(stepArticle(page, step), activity);
  const left = section.getByRole("group", { name: activity.left.label, exact: true }).getByRole("button");
  const right = section.getByRole("group", { name: activity.right.label, exact: true }).getByRole("button");

  // Select, then cancel with Escape: nothing is connected.
  await tabTo(page, left.first());
  await page.keyboard.press("Enter");
  await expect(left.first()).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(left.first()).toHaveAttribute("aria-pressed", "false");

  const response = revealResponse(activity);
  const options = evidenceOptions(activity);
  for (const [index, item] of activity.left.items.entries()) {
    await tabTo(page, left.nth(index), { backwards: true });
    await page.keyboard.press("Space");
    await tabTo(page, right.nth(options.findIndex((option) => option.id === response.pairs[item.id])));
    await page.keyboard.press("Enter");
  }
  await tabTo(page, checkButton(section));
  await page.keyboard.press("Enter");
  await expect(fitsTheEvidence(section)).toBeVisible();
});

test("an answer can be changed before checking, and Check waits until every item is placed", async ({ page }) => {
  const inv = await startInvestigation(page, "christ-at-the-center", { difficulty: "easy", length: "quick" });
  const step = pathSteps(inv, "quick")[0];
  const activity = activityAt(step, "easy") as ActivityOf<"sort">;
  const section = activitySection(stepArticle(page, step), activity);
  const [first] = activity.items;
  const group = section.getByRole("group", { name: first.text, exact: true });
  const [right, other] = [
    activity.categories.find((c) => c.id === first.category)!,
    activity.categories.find((c) => c.id !== first.category)!,
  ];
  await expect(section.getByText(`0 of ${activity.items.length} placed`)).toBeVisible();
  await group.getByRole("radio", { name: other.label, exact: true }).check();
  await expect(section.getByText(`1 of ${activity.items.length} placed`)).toBeVisible();
  await expect(checkButton(section)).toBeDisabled();
  await expect(section.getByText("Check becomes available once every item is placed.")).toBeVisible();
  // Changing the choice moves it, without counting twice.
  await group.getByRole("radio", { name: right.label, exact: true }).check();
  await expect(group.getByRole("radio", { name: other.label, exact: true })).not.toBeChecked();
  await expect(section.getByText(`1 of ${activity.items.length} placed`)).toBeVisible();
  await answer(page, section, activity);
  await expect(section.getByText(`${activity.items.length} of ${activity.items.length} placed`)).toBeVisible();
  await expect(checkButton(section)).toBeEnabled();
});
